const express = require('express');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { generateImage } = require('./render');
const { supabase, authClient } = require('./supabaseClient');
const axios = require('axios');

const app = express();
const PORT = 3000;
app.set('trust proxy', 1);

const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// Prices live on the server. The browser can never set them.
const PLAN_PRICES = { starter: { KES: 10350, USD: 80 } };
const CREDIT_PACKS = { 100: { KES: 2000, USD: 15 } };
const PLAN_DAYS = 30;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' }
});

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

app.post('/signup', authLimiter, async (req, res) => {
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
  const { error } = await authClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${BASE_URL}/login.html?confirmed=1`,
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

app.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, session: data.session });
});

// Password reset step 1: email a reset link (always answers the same, so nobody can discover which emails have accounts)
app.post('/forgot', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Please enter your email.' });
  const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${BASE_URL}/reset.html` });
  if (error) console.log('Reset email problem:', error.message);
  res.json({ success: true });
});

// Password reset step 2: set the new password using the token from the emailed link
app.post('/reset-password', authLimiter, async (req, res) => {
  const { accessToken, newPassword } = req.body;
  if (!accessToken || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'Please enter a new password of at least 8 characters.' });
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.' });
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password: newPassword });
  if (updateError) return res.status(500).json({ success: false, error: updateError.message });
  res.json({ success: true });
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
  let expiredAt = null;
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
  } else {
    const { data: last } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .order('id', { ascending: false })
      .limit(1);
    if (last && last.length && last[0].expires_at) expiredAt = last[0].expires_at;
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
    expiredAt,
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

  const safeData = { ...data };
  if (!/^#[0-9a-fA-F]{6}$/.test(safeData.brandColor || '')) safeData.brandColor = '#ef233c';

  try {
    const shot = await generateImage(templateRows.html_content, safeData);
    const filename = `${req.user.id}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('generated')
      .upload(filename, Buffer.from(shot), { contentType: 'image/png' });
    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage
      .from('generated')
      .getPublicUrl(filename, { download: 'media-engine-image.png' });
    const fileUrl = pub.publicUrl;

    await supabase.from('generations').insert([{
      template_id: template_id,
      image_url: fileUrl,
      user_id: req.user.id
    }]);

    res.json({ url: fileUrl, generatedBy: req.user.email });
  } catch (err) {
    console.error('Generate failed:', err.message);
    res.status(500).json({ success: false, error: 'Image generation failed. Please try again.' });
  }
});

async function initPayment(req, res, amount, currency, metadata) {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amount * 100,
        currency: currency,
        metadata: metadata,
        callback_url: `${BASE_URL}/dashboard.html?paid=1`
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

// Changing email or password now requires the current password
app.post('/account', requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ success: false, error: 'Please enter your current password.' });
  }
  const check = await authClient().auth.signInWithPassword({ email: req.user.email, password: currentPassword });
  if (check.error) {
    return res.status(400).json({ success: false, error: 'Your current password is incorrect.' });
  }

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