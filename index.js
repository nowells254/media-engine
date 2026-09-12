const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { generateImage } = require('./render');
const supabase = require('./supabaseClient');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Webhook route MUST come before express.json() so it gets the raw body
app.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'charge.success') {
    const { user_id, plan, type, credits } = event.data.metadata;
    const reference = event.data.reference;

    if (type === 'credits') {
      // This payment was for extra generations, not a new subscription
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
      // A normal new subscription payment
      await supabase.from('subscriptions').insert([{
        user_id: user_id,
        plan: plan,
        status: 'active',
        paystack_reference: reference,
        generation_limit: 1000,
        extra_credits: 0
      }]);
      console.log('Subscription activated for user:', user_id);
    }
  }

  res.sendStatus(200);
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/generated', express.static(path.join(__dirname, 'generated')));

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, user: data.user });
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

// Checks the user has an active subscription AND is within their usage allowance
async function requireSubscription(req, res, next) {
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('status', 'active')
    .order('id', { ascending: false })
    .limit(1);

  if (error || !subs || subs.length === 0) {
    return res.status(403).json({ success: false, error: 'An active subscription is required to generate images' });
  }

  const subscription = subs[0];

  const { count, error: countError } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (countError) {
    return res.status(500).json({ success: false, error: 'Could not check usage' });
  }

  const totalAllowed = subscription.generation_limit + subscription.extra_credits;

  if (count >= totalAllowed) {
    return res.status(402).json({
      success: false,
      error: 'You have reached your plan limit. Purchase extra generations to continue.',
      needsCredits: true
    });
  }

  next();
}

app.post('/templates', requireAuth, async (req, res) => {
  const { template_name, html_content } = req.body;

  const { data, error } = await supabase
    .from('templates')
    .insert([{ template_name, html_content, user_id: req.user.id }])
    .select();

  if (error) return res.status(500).json({ success: false, error: error.message });

  res.json({ success: true, template: data[0] });
});

app.get('/templates', requireAuth, async (req, res) => {
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

app.post('/subscribe', requireAuth, async (req, res) => {
  const { plan, amount } = req.body;

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amount * 100,
        currency: 'KES',
        metadata: { user_id: req.user.id, plan: plan }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, authorization_url: response.data.data.authorization_url, reference: response.data.data.reference });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
  }
});

// New: buy extra generations once over the plan limit
app.post('/buy-credits', requireAuth, async (req, res) => {
  const { credits, amount } = req.body;

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user.email,
        amount: amount * 100,
        currency: 'KES',
        metadata: { user_id: req.user.id, type: 'credits', credits: credits }
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
    res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
  }
});

// New: check current usage
app.get('/usage', requireAuth, async (req, res) => {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('status', 'active')
    .order('id', { ascending: false })
    .limit(1);

  const { count } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (!subs || subs.length === 0) {
    return res.json({ success: true, hasSubscription: false, used: count || 0 });
  }

  const sub = subs[0];
  res.json({
    success: true,
    hasSubscription: true,
    used: count || 0,
    limit: sub.generation_limit,
    extraCredits: sub.extra_credits,
    totalAllowed: sub.generation_limit + sub.extra_credits
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});