const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { generateImage } = require('./render');
const supabase = require('./supabaseClient');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Prices live on the server. The browser can never set them.
const PLAN_PRICES = { starter: { KES: 10350, USD: 80 } };
const CREDIT_PACKS = { 100: { KES: 2000, USD: 15 } };
const PLAN_DAYS = 30;

async function getActiveSubscription(userId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('id', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return null;
  const sub = data[0];
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) return null;
  return sub;
}

async function countUsage(userId, sub) {
  const { count } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sub.created_at);
  return count || 0;
}

// Webhook route MUST come before express.json() so it gets the raw body
app.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'charge.success') {
    const { user_id, plan, type, credits } = event.data.metadata || {};
    const reference = event.data.reference;

    if (user_id) {
      if (type === 'credits') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user_id)
          .eq('status', 'active')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        if (sub) {
          await supabase
            .from('subscriptions')
            .update({ extra_credits: sub.extra_credits + parseInt(credits) })
            .eq('id', sub.id);
        }
        console.log('Added', credits, 'extra credits for user:', user_id);
      } else {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('paystack_reference', reference)
          .limit(1);

        if (!existing || existing.length === 0) {
          // Renewing early adds 30 days on top of the time already left
          const current = await getActiveSubscription(user_id);
          const base = current && current.expires_at && new Date(current.expires_at) > new Date()
            ? new Date(current.expires_at).getTime()
            : Date.now();
          const expiresAt = new Date(base + PLAN_DAYS * 86400000).toISOString();

          await supabase.from('subscriptions').insert([{
            user_id: user_id,
            plan: plan,
            status: 'active',
            paystack_reference: reference,
            generation_limit: 1000,
            extra_credits: 0,
            expires_at: expiresAt
          }]);
          console.log('Subscription activated for user:', user_id);
        }
      }
    }
  }

  res.sendStatus(200);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(path.join(__dirname, 'generated')));

app.post('/signup', async (req, res) => {
  const { email, password, fullName, phone, country, acceptedTerms } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
  }
  if (!acceptedTerms) {
    return res.status(400).json({ success: false, error: 'You must accept the Terms of Service.' });
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || '',
        country: country || '',
        accepted_terms_at: new Date().toISOString()
      }
    }
  });
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, session: data.session });
});

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.user = data.user;
  next();
}

// Must have an active (not expired) subscription
async function requireActive(req, res, next) {
  const sub = await getActiveSubscription(req.user.id);
  if (!sub) {
    return res.status(403).json({ success: false, needsSubscription: true, error: 'An active subscription is required.' });
  }
  req.subscription = sub;
  next();
}

// Active subscription AND still within the generation allowance
async function requireSubscription(req, res, next) {
  const sub = await getActiveSubscription(req.user.id);
  if (!sub) {
    return res.status(403).json({ success: false, needsSubscription: true, error: 'An active subscription is required to generate images.' });
  }
  const used = await countUsage(req.user.id, sub);
  if (used >= sub.generation_limit + sub.extra_credits) {
    return res.status(402).json({
      success: false,
      error: 'You have reached your plan limit. Purchase extra generations to continue.',
      needsCredits: true
    });
  }
  req.subscription = sub;
  next();
}

// Everything the dashboard overview needs, in one call
app.get('/overview', requireAuth, async (req, res) => {
  const sub = await getActiveSubscription(req.user.id);
  const meta = req.user.user_metadata || {};

  let subscription = null;
  if (sub) {
    const used = await countUsage(req.user.id, sub);
    subscription = {
      plan: sub.plan,
      used,
      limit: sub.generation_limit,
      extraCredits: sub.extra_credits,
      totalAllowed: sub.generation_limit + sub.extra_credits,
      startedAt: sub.created_at,
      expiresAt: sub.expires_at
    };
  }

  const { count: templatesCount } = await supabase
    .from('templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  const since = new Date(Date.now() - 6 * 86400000);
  since.setUTCHours(0, 0, 0, 0);
  const { data: recent } = await supabase
    .from('generations')
    .select('created_at')
    .eq('user_id', req.user.id)
    .gte('created_at', since.toISOString());

  const daily = [];
  for (let i = 0; i < 7; i++) {
    const key = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
    daily.push({ date: key, count: (recent || []).filter(g => g.created_at.slice(0, 10) === key).length });
  }

  res.json({
    success: true,
    email: req.user.email,
    name: meta.full_name || '',
    subscription,
    templatesCount: templatesCount || 0,
    daily
  });
});

app.post('/templates', requireAuth, requireActive, async (req, res) => {
  const { template_name, html_content } = req.body;
  const { data, error } = await supabase
    .from('templates')
    .insert([{ template_name, html_content, user_id: req.user.id }])
    .select();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, template: data[0] });
});

app.get('/templates', requireAuth, requireActive, async (req, res) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, templates: data });
});

app.post('/generate', requireAuth, requireSubscription, async (req, res) => {
  const { template_id, data } = req.body;

  if (!template_id || !data) {
    return res.status(400).json({ success: false, error: 'template_id and data are required' });
  }

  const { data: templateRows, error: templateError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', template_id)
    .eq('user_id', req.user.id)
    .single();

  if (templateError || !templateRows) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }

  const filename = await generateImage(templateRows.html_content, data);
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const fileUrl = `${baseUrl}/generated/${filename}`;

  await supabase.from('generations').insert([{
    template_id: template_id,
    image_url: fileUrl,
    user_id: req.user.id
  }]);

  res.json({ url: fileUrl, generatedBy: req.user.email });
});

async function initPayment(req, res, amount, currency, metadata) {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amount * 100,
        currency: currency,
        metadata: metadata,
        callback_url: `${baseUrl}/dashboard.html?paid=1`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ success: true, authorization_url: response.data.data.authorization_url });
  } catch (error) {
    const msg = (error.response && error.response.data && error.response.data.message) || error.message;
    res.status(500).json({ success: false, error: msg });
  }
}

app.post('/subscribe', requireAuth, async (req, res) => {
  const { plan, currency = 'KES' } = req.body;
  const price = PLAN_PRICES[plan] && PLAN_PRICES[plan][currency];
  if (!price) return res.status(400).json({ success: false, error: 'Unknown plan or currency' });
  await initPayment(req, res, price, currency, { user_id: req.user.id, plan: plan });
});

app.post('/buy-credits', requireAuth, requireActive, async (req, res) => {
  const { credits, currency = 'KES' } = req.body;
  const price = CREDIT_PACKS[credits] && CREDIT_PACKS[credits][currency];
  if (!price) return res.status(400).json({ success: false, error: 'Unknown credit pack or currency' });
  await initPayment(req, res, price, currency, { user_id: req.user.id, type: 'credits', credits: credits });
});

app.get('/profile', requireAuth, requireActive, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .limit(1);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, profile: data && data.length ? data[0] : null, email: req.user.email });
});

app.post('/profile', requireAuth, requireActive, async (req, res) => {
  const { logo_url, business_name, brand_color } = req.body;

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', req.user.id)
    .limit(1);

  let result;
  if (existing && existing.length > 0) {
    result = await supabase
      .from('profiles')
      .update({ logo_url, business_name, brand_color })
      .eq('user_id', req.user.id)
      .select();
  } else {
    result = await supabase
      .from('profiles')
      .insert([{ user_id: req.user.id, logo_url, business_name, brand_color }])
      .select();
  }

  if (result.error) return res.status(500).json({ success: false, error: result.error.message });
  res.json({ success: true, profile: result.data[0] });
});

app.post('/account', requireAuth, async (req, res) => {
  const { newEmail, newPassword } = req.body;

  const updates = {};
  if (newEmail) updates.email = newEmail;
  if (newPassword) updates.password = newPassword;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'Nothing to update' });
  }

  const { error } = await supabase.auth.admin.updateUserById(req.user.id, updates);
  if (error) return res.status(500).json({ success: false, error: error.message });

  res.json({ success: true, message: 'Account updated successfully' });
});

app.get('/history', requireAuth, requireActive, async (req, res) => {
  const { data: generations, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', req.user.id)
    .order('id', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ success: false, error: error.message });

  const templateIds = [...new Set(generations.map(g => g.template_id))];
  const { data: templates } = await supabase
    .from('templates')
    .select('id, template_name')
    .in('id', templateIds);

  const templateMap = {};
  (templates || []).forEach(t => { templateMap[t.id] = t.template_name; });

  const enriched = generations.map(g => ({
    ...g,
    template_name: templateMap[g.template_id] || 'Template'
  }));

  res.json({ success: true, generations: enriched });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});