const express = require('express');
const path = require('path');
const { generateImage } = require('./render');
const supabase = require('./supabaseClient');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(express.json());
const crypto = require('crypto');
app.use('/generated', express.static(path.join(__dirname, 'generated')));

app.get('/', (req, res) => {
  res.send('Media engine server is running!');
});

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

app.post('/generate', requireAuth, async (req, res) => {
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
  const fileUrl = `http://localhost:${PORT}/generated/${filename}`;

  await supabase.from('generations').insert([{
    template_id: template_id,
    image_url: fileUrl,
    user_id: req.user.id
  }]);

  res.json({ url: fileUrl, generatedBy: req.user.email });
});

// New: start a subscription payment
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
// New: Paystack webhook - automatically updates subscriptions when a payment succeeds
app.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'charge.success') {
    const { user_id, plan } = event.data.metadata;
    const reference = event.data.reference;

    await supabase.from('subscriptions').insert([{
      user_id: user_id,
      plan: plan,
      status: 'active',
      paystack_reference: reference
    }]);

    console.log('Subscription activated for user:', user_id);
  }

  res.sendStatus(200);
});
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);-
});