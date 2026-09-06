const express = require('express');
const path = require('path');
const { generateImage } = require('./render');
const supabase = require('./supabaseClient');

const app = express();
const PORT = 3000;

app.use(express.json());
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

// New: save a template to the database
app.post('/templates', requireAuth, async (req, res) => {
  const { template_name, html_content } = req.body;

  const { data, error } = await supabase
    .from('templates')
    .insert([{ template_name, html_content, user_id: req.user.id }])
    .select();

  if (error) return res.status(500).json({ success: false, error: error.message });

  res.json({ success: true, template: data[0] });
});

// New: list this user's templates
app.get('/templates', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ success: false, error: error.message });

  res.json({ success: true, templates: data });
});

// Updated: generate now requires a template_id and looks up that template's HTML
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

  // Log this generation
  await supabase.from('generations').insert([{
    template_id: template_id,
    image_url: fileUrl,
    user_id: req.user.id
  }]);

  res.json({ url: fileUrl, generatedBy: req.user.email });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});