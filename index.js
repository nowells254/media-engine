const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { generateImage } = require('./render');
const { supabase, authClient } = require('./supabaseClient');
const Designs = require('./public/designs.js');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

const BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const SUPABASE_URL = process.env.SUPABASE_URL || '';

// USD only works after Paystack enables it. Then add ENABLE_USD = true in Render's Environment.
const ENABLE_USD = process.env.ENABLE_USD === 'true';
const CURRENCIES = ENABLE_USD ? ['KES', 'USD'] : ['KES'];

// All prices live here and nowhere else. CNY prices are paid by Alipay QR and approved by hand.
const PLANS = {
  daily:   { label: 'Daily Pass',   days: 1,  generations: 40,   prices: { KES: 700,   USD: 6,  CNY: 42 } },
  weekly:  { label: 'Weekly Pass',  days: 7,  generations: 200,  prices: { KES: 3000,  USD: 24, CNY: 168 } },
  monthly: { label: 'Monthly Pass', days: 30, generations: 1000, prices: { KES: 10350, USD: 80, CNY: 548 } }
};
const CREDIT_PACKS = { 100: { KES: 2000, USD: 15, CNY: 105 } };
const PER_IMAGE = { KES: 20, USD: 0.15, CNY: 1.1 };
const MAX_TEMPLATES = 30;
const MAX_ORDER = 200;

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
function alipayReady() {
  return fs.existsSync(path.join(__dirname, 'public', 'assets', 'alipay-qr.png'));
}

class UserError extends Error {}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' }
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many uploads. Please wait a few minutes.' }
});

/* ---------------- helpers ---------------- */
async function getActiveSubscription(userId) {
  const { data } = await supabase
    .from('subscriptions').select('*')
    .eq('user_id', userId).eq('status', 'active')
    .order('id', { ascending: false }).limit(1);
  if (!data || data.length === 0) return null;
  const sub = data[0];
  if (sub.expires_at && new Date(sub.expires_at) < new Date()) return null;
  return sub;
}

async function countUsage(userId, sub) {
  const { count } = await supabase
    .from('generations').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).eq('counts_toward_pass', true)
    .gte('created_at', sub.created_at);
  return count || 0;
}

async function remainingAllowance(userId, sub) {
  const used = await countUsage(userId, sub);
  const { data } = await supabase
    .from('orders').select('quantity, completed')
    .eq('user_id', userId).eq('payment', 'pass')
    .in('status', ['paid', 'processing'])
    .gte('created_at', sub.created_at);
  const reserved = (data || []).reduce((s, o) => s + (o.quantity - o.completed), 0);
  return Math.max(0, sub.generation_limit + sub.extra_credits - used - reserved);
}

function isAllowedImage(u) {
  return typeof u === 'string' && (
    u.startsWith(SUPABASE_URL + '/storage/v1/object/public/') ||
    u.startsWith(BASE_URL + '/assets/') ||
    u.startsWith('/assets/')
  );
}

function cleanFields(prod, f) {
  const out = {};
  for (const def of prod.fields) {
    let v = f[def.key];
    if (v === undefined || v === null) continue;
    v = String(v).trim();
    if (def.type === 'image') {
      if (v && !isAllowedImage(v)) throw new UserError('One of your images is not allowed. Please upload it again.');
      out[def.key] = v;
    } else {
      out[def.key] = v.slice(0, def.type === 'textarea' ? 500 : 120);
    }
  }
  return out;
}

function cleanDesign(input) {
  const prod = Designs.PRODUCTS[input && input.product];
  if (!prod) throw new UserError('Unknown product.');
  const hex = v => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : null);
  const c = input.colors || {};
  return {
    product: input.product,
    style: prod.styles.includes(input.style) ? input.style : prod.styles[0],
    lang: input.lang === 'zh' ? 'zh' : 'en',
    colors: {
      primary: hex(c.primary) || '#4361ee',
      accent: hex(c.accent) || '#f72585',
      background: hex(c.background) || '#ffffff',
      text: hex(c.text) || '#2b2d42'
    },
    fields: cleanFields(prod, input.fields || {})
  };
}

async function startPaystack({ email, amountSubunits, currency, metadata, reference }) {
  const body = { email, amount: amountSubunits, currency, metadata, callback_url: `${BASE_URL}/dashboard.html?paid=1` };
  if (reference) body.reference = reference;
  try {
    const response = await axios.post('https://api.paystack.co/transaction/initialize', body, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }
    });
    return response.data.data.authorization_url;
  } catch (error) {
    const msg = (error.response && error.response.data && error.response.data.message) || error.message;
    throw new UserError(msg);
  }
}

function sendError(res, e) {
  if (e instanceof UserError) return res.status(400).json({ success: false, error: e.message });
  console.error(e);
  res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
}

/* ---------------- image orders ---------------- */
const activeOrders = new Set();

async function renderAndStore(userId, design) {
  const prod = Designs.PRODUCTS[design.product];
  const html = Designs.build(design, { origin: `http://127.0.0.1:${PORT}` });
  const shot = await generateImage(html, {
    w: prod.w, h: prod.h, scale: prod.scale,
    allowed: [
      `${SUPABASE_URL}/storage/v1/object/public/`,
      `${BASE_URL}/assets/`,
      `http://127.0.0.1:${PORT}/assets/`
    ]
  });
  const filename = `${userId}/${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage.from('generated').upload(filename, Buffer.from(shot), { contentType: 'image/png' });
  if (error) throw error;
  const { data } = supabase.storage.from('generated').getPublicUrl(filename, { download: 'media-engine-image.png' });
  return data.publicUrl;
}

async function processOrder(orderId) {
  if (activeOrders.has(orderId)) return;
  activeOrders.add(orderId);
  try {
    const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!o || !['paid', 'processing'].includes(o.status)) return;
    await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId);

    const results = Array.isArray(o.results) ? [...o.results] : [];
    for (let i = results.length; i < o.quantity; i++) {
      const row = (o.rows && o.rows[i]) || {};
      const design = { ...o.design, fields: { ...o.design.fields, ...row } };
      let url = null, lastErr = null;
      for (let attempt = 0; attempt < 2 && !url; attempt++) {
        try { url = await renderAndStore(o.user_id, design); } catch (e) { lastErr = e; }
      }
      if (!url) {
        await supabase.from('orders').update({ status: 'failed', note: String((lastErr && lastErr.message) || 'error').slice(0, 200) }).eq('id', orderId);
        return;
      }
      results.push(url);
      await supabase.from('generations').insert([{
        user_id: o.user_id, image_url: url, template_id: null, label: o.label,
        counts_toward_pass: o.payment === 'pass'
      }]);
      await supabase.from('orders').update({ results, completed: results.length }).eq('id', orderId);
    }
    await supabase.from('orders').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', orderId);
  } catch (e) {
    console.error('Order failed', orderId, e.message);
  } finally {
    activeOrders.delete(orderId);
  }
}

async function resumeOrders() {
  const { data } = await supabase.from('orders').select('id').in('status', ['paid', 'processing']);
  (data || []).forEach(o => processOrder(o.id));
}

/* ---------------- Paystack payments ---------------- */
async function handleCharge(d) {
  const meta = d.metadata || {};
  const reference = d.reference;
  const userId = meta.user_id;
  if (!userId) return { kind: 'ignored' };
  const kind = meta.type === 'order' ? 'order' : meta.type === 'credits' ? 'credits' : 'pass';

  const { error: logErr } = await supabase.from('payments_log').insert([{ reference, kind, user_id: userId }]);
  if (logErr) {
    if (logErr.code === '23505') return { kind, orderId: meta.order_id, duplicate: true };
    throw logErr;
  }

  try {
    if (kind === 'credits') {
      const { data: sub } = await supabase.from('subscriptions').select('*')
        .eq('user_id', userId).eq('status', 'active')
        .order('id', { ascending: false }).limit(1).single();
      if (sub) {
        const { error } = await supabase.from('subscriptions')
          .update({ extra_credits: sub.extra_credits + parseInt(meta.credits) }).eq('id', sub.id);
        if (error) throw error;
      }
      return { kind };
    }

    if (kind === 'order') {
      const { data: rows } = await supabase.from('orders').select('*').eq('id', meta.order_id).eq('user_id', userId).limit(1);
      const o = rows && rows[0];
      if (!o) throw new Error('Order not found');
      if (String(d.currency) !== String(o.currency) || Number(d.amount) !== Number(o.amount_subunits)) {
        console.error('Order amount mismatch', o.id, d.amount, d.currency);
        return { kind, orderId: o.id, mismatch: true };
      }
      const { data: upd } = await supabase.from('orders').update({ status: 'paid' }).eq('id', o.id).eq('status', 'pending').select();
      if (upd && upd.length) processOrder(o.id);
      return { kind, orderId: o.id };
    }

    const p = PLANS[meta.plan] || PLANS.monthly;
    const { error } = await supabase.from('subscriptions').insert([{
      user_id: userId, plan: meta.plan, status: 'active', paystack_reference: reference,
      generation_limit: p.generations, extra_credits: 0,
      expires_at: new Date(Date.now() + p.days * 86400000).toISOString()
    }]);
    if (error) throw error;
    return { kind };
  } catch (e) {
    await supabase.from('payments_log').delete().eq('reference', reference);
    throw e;
  }
}

// Webhook route MUST come before express.json() so it gets the raw body
app.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');

  const event = JSON.parse(req.body);
  if (event.event === 'charge.success') {
    try { await handleCharge(event.data); }
    catch (e) { console.error('Webhook error:', e.message); return res.sendStatus(500); }
  }
  res.sendStatus(200);
});

app.use(express.json({ limit: '5mb' }));
// Fonts must be readable from inside the image renderer and the sandboxed previews
app.use('/assets/fonts', (req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); });
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- public ---------------- */
app.get('/plans', (req, res) => {
  res.json({
    success: true,
    currencies: alipayReady() ? [...CURRENCIES, 'CNY'] : CURRENCIES,
    plans: Object.entries(PLANS).map(([id, p]) => ({ id, label: p.label, days: p.days, generations: p.generations, prices: p.prices })),
    creditPack: { credits: 100, prices: CREDIT_PACKS[100] },
    perImage: PER_IMAGE,
    maxOrder: MAX_ORDER
  });
});

/* ---------------- auth ---------------- */
app.post('/signup', authLimiter, async (req, res) => {
  const { email, password, fullName, phone, country, acceptedTerms } = req.body;
  if (!email || !password || !fullName) return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
  if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
  if (!acceptedTerms) return res.status(400).json({ success: false, error: 'You must accept the Terms of Service.' });
  const { error } = await authClient().auth.signUp({
    email, password,
    options: {
      emailRedirectTo: `${BASE_URL}/login.html?confirmed=1`,
      data: { full_name: fullName, phone: phone || '', country: country || '', accepted_terms_at: new Date().toISOString() }
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

app.post('/forgot', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Please enter your email.' });
  const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${BASE_URL}/reset.html` });
  if (error) console.log('Reset email problem:', error.message);
  res.json({ success: true });
});

app.post('/reset-password', authLimiter, async (req, res) => {
  const { accessToken, newPassword } = req.body;
  if (!accessToken || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'Please enter a new password of at least 8 characters.' });
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired. Please request a new one.' });
  const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password: newPassword });
  if (updateError) return res.status(500).json({ success: false, error: updateError.message });
  res.json({ success: true });
});

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Missing or invalid authorization header' });
  const { data, error } = await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (error || !data.user) return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  req.user = data.user;
  next();
}

async function requireActive(req, res, next) {
  const sub = await getActiveSubscription(req.user.id);
  if (!sub) return res.status(403).json({ success: false, needsSubscription: true, error: 'You need an active pass first.' });
  req.subscription = sub;
  next();
}

function requireAdmin(req, res, next) {
  if (!ADMIN_IDS.includes(req.user.id)) return res.status(403).json({ success: false, error: 'Not allowed.' });
  next();
}

/* ---------------- account ---------------- */
app.get('/overview', requireAuth, async (req, res) => {
  const sub = await getActiveSubscription(req.user.id);
  const meta = req.user.user_metadata || {};

  let subscription = null;
  let expiredAt = null;
  if (sub) {
    const used = await countUsage(req.user.id, sub);
    subscription = {
      plan: sub.plan,
      planLabel: (PLANS[sub.plan] && PLANS[sub.plan].label) || 'Starter Plan',
      used,
      limit: sub.generation_limit,
      extraCredits: sub.extra_credits,
      totalAllowed: sub.generation_limit + sub.extra_credits,
      remaining: await remainingAllowance(req.user.id, sub),
      startedAt: sub.created_at,
      expiresAt: sub.expires_at
    };
  } else {
    const { data: last } = await supabase.from('subscriptions').select('expires_at')
      .eq('user_id', req.user.id).eq('status', 'active').order('id', { ascending: false }).limit(1);
    if (last && last.length && last[0].expires_at) expiredAt = last[0].expires_at;
  }

  const { count: templatesCount } = await supabase.from('templates').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);

  const since = new Date(Date.now() - 6 * 86400000);
  since.setUTCHours(0, 0, 0, 0);
  const { data: recent } = await supabase.from('generations').select('created_at').eq('user_id', req.user.id).gte('created_at', since.toISOString());
  const daily = [];
  for (let i = 0; i < 7; i++) {
    const key = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
    daily.push({ date: key, count: (recent || []).filter(g => g.created_at.slice(0, 10) === key).length });
  }

  res.json({
    success: true,
    email: req.user.email, name: meta.full_name || '', phone: meta.phone || '', country: meta.country || '',
    memberSince: req.user.created_at, subscription, expiredAt, templatesCount: templatesCount || 0, daily,
    isAdmin: ADMIN_IDS.includes(req.user.id)
  });
});

app.post('/profile-info', requireAuth, async (req, res) => {
  const clean = v => String(v || '').trim().slice(0, 80);
  const fullName = clean(req.body.fullName);
  if (!fullName) return res.status(400).json({ success: false, error: 'Please enter your name.' });
  const meta = { ...(req.user.user_metadata || {}), full_name: fullName, phone: clean(req.body.phone), country: clean(req.body.country) };
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, { user_metadata: meta });
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
});

app.post('/account', requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ success: false, error: 'Please enter your current password.' });
  const check = await authClient().auth.signInWithPassword({ email: req.user.email, password: currentPassword });
  if (check.error) return res.status(400).json({ success: false, error: 'Your current password is incorrect.' });
  const updates = {};
  if (newEmail) updates.email = newEmail;
  if (newPassword) updates.password = newPassword;
  if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, error: 'Nothing to update' });
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, updates);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, message: 'Account updated successfully' });
});

app.get('/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', req.user.id).limit(1);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, profile: data && data.length ? data[0] : null, email: req.user.email });
});

app.post('/profile', requireAuth, async (req, res) => {
  const { logo_url, business_name, brand_color } = req.body;
  const { data: existing } = await supabase.from('profiles').select('*').eq('user_id', req.user.id).limit(1);
  let result;
  if (existing && existing.length > 0) {
    result = await supabase.from('profiles').update({ logo_url, business_name, brand_color }).eq('user_id', req.user.id).select();
  } else {
    result = await supabase.from('profiles').insert([{ user_id: req.user.id, logo_url, business_name, brand_color }]).select();
  }
  if (result.error) return res.status(500).json({ success: false, error: result.error.message });
  res.json({ success: true, profile: result.data[0] });
});

/* ---------------- uploads ---------------- */
app.post('/upload', requireAuth, uploadLimiter, async (req, res) => {
  const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(req.body.dataUrl || '');
  if (!m) return res.status(400).json({ success: false, error: 'Please upload a PNG or JPG image.' });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 3 * 1024 * 1024) return res.status(400).json({ success: false, error: 'That image is too large (max 3 MB).' });
  const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpg = buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (!isPng && !isJpg) return res.status(400).json({ success: false, error: 'That file is not a valid PNG or JPG image.' });
  const name = `${req.user.id}/${crypto.randomUUID()}.${isPng ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage.from('assets').upload(name, buf, { contentType: isPng ? 'image/png' : 'image/jpeg' });
  if (error) return res.status(500).json({ success: false, error: 'Upload failed. Please try again.' });
  const { data } = supabase.storage.from('assets').getPublicUrl(name);
  res.json({ success: true, url: data.publicUrl });
});

/* ---------------- saved designs ---------------- */
app.post('/templates', requireAuth, async (req, res) => {
  const { template_name, html_content } = req.body;
  if (!template_name || !html_content || html_content.length > 30000) return res.status(400).json({ success: false, error: 'Invalid design.' });
  const { count } = await supabase.from('templates').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);
  if ((count || 0) >= MAX_TEMPLATES) return res.status(400).json({ success: false, error: `You can keep up to ${MAX_TEMPLATES} saved designs. Delete one to add another.` });
  const { data, error } = await supabase.from('templates')
    .insert([{ template_name: String(template_name).slice(0, 80), html_content, user_id: req.user.id }]).select();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, template: data[0] });
});

app.get('/templates', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('templates').select('*').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, templates: data });
});

app.delete('/templates/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('templates').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true });
});

/* ---------------- Alipay QR payments (approved by hand) ---------------- */
function newCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let s = 'ME';
  for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return s;
}

async function createManual(userId, fields) {
  const { count } = await supabase.from('manual_payments').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).in('status', ['awaiting', 'submitted']);
  if ((count || 0) >= 5) throw new UserError('You have too many unfinished payments. Please finish or wait for them to be checked.');
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase.from('manual_payments').insert([{ user_id: userId, code: newCode(), ...fields }]).select();
    if (!error) return data[0];
    if (error.code !== '23505') throw error;
  }
  throw new Error('Could not create a payment code');
}

function manualView(p) {
  return { id: p.id, code: p.code, amount: Number(p.amount_cny), status: p.status, kind: p.kind, orderId: p.order_id, qr: '/assets/alipay-qr.png' };
}

async function fulfilManual(p) {
  if (p.kind === 'pass') {
    const plan = PLANS[p.plan] || PLANS.monthly;
    const { error } = await supabase.from('subscriptions').insert([{
      user_id: p.user_id, plan: p.plan, status: 'active', paystack_reference: 'ALIPAY-' + p.code,
      generation_limit: plan.generations, extra_credits: 0,
      expires_at: new Date(Date.now() + plan.days * 86400000).toISOString()
    }]);
    if (error) throw error;
  } else if (p.kind === 'credits') {
    const { data: sub } = await supabase.from('subscriptions').select('*')
      .eq('user_id', p.user_id).eq('status', 'active').order('id', { ascending: false }).limit(1).single();
    if (!sub) throw new Error('This customer has no active pass to add credits to.');
    const { error } = await supabase.from('subscriptions').update({ extra_credits: sub.extra_credits + p.credits }).eq('id', sub.id);
    if (error) throw error;
  } else if (p.kind === 'order') {
    const { data: upd } = await supabase.from('orders').update({ status: 'paid' }).eq('id', p.order_id).eq('status', 'pending').select();
    if (upd && upd.length) processOrder(p.order_id);
  }
}

app.post('/manual/pass', requireAuth, uploadLimiter, async (req, res) => {
  try {
    if (!alipayReady()) throw new UserError('Alipay payments are not available yet.');
    const chosen = PLANS[req.body.plan];
    if (!chosen) throw new UserError('Unknown pass.');
    const current = await getActiveSubscription(req.user.id);
    if (current && current.expires_at) {
      throw new UserError('You already have an active pass until ' + new Date(current.expires_at).toISOString().slice(0, 10) + '. You can buy a new pass when it ends.');
    }
    const m = await createManual(req.user.id, { kind: 'pass', plan: req.body.plan, amount_cny: chosen.prices.CNY });
    res.json({ success: true, manual: manualView(m) });
  } catch (e) { sendError(res, e); }
});

app.post('/manual/credits', requireAuth, requireActive, uploadLimiter, async (req, res) => {
  try {
    if (!alipayReady()) throw new UserError('Alipay payments are not available yet.');
    const m = await createManual(req.user.id, { kind: 'credits', credits: 100, amount_cny: CREDIT_PACKS[100].CNY });
    res.json({ success: true, manual: manualView(m) });
  } catch (e) { sendError(res, e); }
});

app.get('/manual/open', requireAuth, async (req, res) => {
  const { data } = await supabase.from('manual_payments').select('*')
    .eq('user_id', req.user.id).in('status', ['awaiting', 'submitted']).order('id', { ascending: false }).limit(1);
  res.json({ success: true, manual: data && data.length ? manualView(data[0]) : null });
});

app.get('/manual/:id', requireAuth, async (req, res) => {
  const { data } = await supabase.from('manual_payments').select('*').eq('id', req.params.id).eq('user_id', req.user.id).limit(1);
  if (!data || !data.length) return res.status(404).json({ success: false, error: 'Payment not found.' });
  res.json({ success: true, manual: manualView(data[0]) });
});

app.post('/manual/:id/submit', requireAuth, uploadLimiter, async (req, res) => {
  const { data } = await supabase.from('manual_payments').select('*').eq('id', req.params.id).eq('user_id', req.user.id).limit(1);
  if (!data || !data.length) return res.status(404).json({ success: false, error: 'Payment not found.' });
  let p = data[0];
  if (p.status === 'awaiting') {
    const note = String(req.body.payerNote || '').trim().slice(0, 60);
    const { data: upd } = await supabase.from('manual_payments').update({ status: 'submitted', payer_note: note })
      .eq('id', p.id).eq('status', 'awaiting').select();
    if (upd && upd.length) p = upd[0];
  }
  res.json({ success: true, manual: manualView(p) });
});

/* ---------------- admin ---------------- */
app.get('/admin/payments', requireAuth, requireAdmin, async (req, res) => {
  const { data: list } = await supabase.from('manual_payments').select('*').order('id', { ascending: false }).limit(100);
  const rows = list || [];

  const users = {};
  for (const id of [...new Set(rows.map(r => r.user_id))]) {
    const { data } = await supabase.auth.admin.getUserById(id);
    if (data && data.user) {
      const m = data.user.user_metadata || {};
      users[id] = { email: data.user.email, name: m.full_name || '', phone: m.phone || '' };
    }
  }
  const orderIds = rows.filter(r => r.order_id).map(r => r.order_id);
  const orders = {};
  if (orderIds.length) {
    const { data } = await supabase.from('orders').select('id,label,quantity').in('id', orderIds);
    (data || []).forEach(o => { orders[o.id] = o; });
  }

  res.json({
    success: true,
    payments: rows.map(r => ({
      id: r.id, created_at: r.created_at, status: r.status, code: r.code,
      amount: Number(r.amount_cny), payer_note: r.payer_note || '',
      user: users[r.user_id] || { email: '(unknown)', name: '', phone: '' },
      what: r.kind === 'pass' ? ((PLANS[r.plan] && PLANS[r.plan].label) || r.plan)
        : r.kind === 'credits' ? r.credits + ' extra generations'
        : (orders[r.order_id] ? 'Order: ' + orders[r.order_id].quantity + ' x ' + orders[r.order_id].label : 'Image order')
    }))
  });
});

async function decideManual(req, res, newStatus) {
  const { data: upd } = await supabase.from('manual_payments')
    .update({ status: newStatus, decided_at: new Date().toISOString(), decided_by: req.user.id })
    .eq('id', req.params.id).in('status', ['awaiting', 'submitted']).select();
  if (!upd || !upd.length) return res.status(409).json({ success: false, error: 'This payment was already decided.' });
  if (newStatus === 'approved') {
    try { await fulfilManual(upd[0]); }
    catch (e) {
      await supabase.from('manual_payments').update({ status: 'submitted', decided_at: null, decided_by: null }).eq('id', upd[0].id);
      return res.status(500).json({ success: false, error: e.message || 'Could not apply this payment.' });
    }
  }
  res.json({ success: true });
}
app.post('/admin/payments/:id/approve', requireAuth, requireAdmin, (req, res) => decideManual(req, res, 'approved'));
app.post('/admin/payments/:id/reject', requireAuth, requireAdmin, (req, res) => decideManual(req, res, 'rejected'));

/* ---------------- orders ---------------- */
app.post('/orders', requireAuth, async (req, res) => {
  try {
    const design = cleanDesign(req.body.design);
    const prod = Designs.PRODUCTS[design.product];

    let rows = null;
    let quantity = 1;
    if (Array.isArray(req.body.rows) && req.body.rows.length) {
      if (req.body.rows.length > MAX_ORDER) throw new UserError(`You can make up to ${MAX_ORDER} images in one order.`);
      rows = req.body.rows.map(r => cleanFields(prod, r || {}));
      quantity = rows.length;
    }

    const mode = req.body.mode === 'pass' ? 'pass' : 'payg';

    if (mode === 'pass') {
      const sub = await getActiveSubscription(req.user.id);
      if (!sub) return res.status(403).json({ success: false, needsSubscription: true, error: 'You need an active pass.' });
      const left = await remainingAllowance(req.user.id, sub);
      if (quantity > left) {
        return res.status(402).json({ success: false, needsCredits: true, error: `Your pass has ${left} generation(s) left but this order needs ${quantity}.` });
      }
      const { data, error } = await supabase.from('orders')
        .insert([{ user_id: req.user.id, label: prod.label, design, rows, quantity, payment: 'pass', status: 'paid' }]).select();
      if (error) throw error;
      processOrder(data[0].id);
      return res.json({ success: true, orderId: data[0].id, status: 'paid' });
    }

    const currency = req.body.currency || 'KES';

    if (currency === 'CNY') {
      if (!alipayReady()) throw new UserError('Alipay payments are not available yet.');
      const amount = Math.round(quantity * PER_IMAGE.CNY * 100);
      const { data, error } = await supabase.from('orders')
        .insert([{ user_id: req.user.id, label: prod.label, design, rows, quantity, payment: 'manual', currency: 'CNY', amount_subunits: amount, status: 'pending' }]).select();
      if (error) throw error;
      const m = await createManual(req.user.id, { kind: 'order', order_id: data[0].id, amount_cny: amount / 100 });
      return res.json({ success: true, orderId: data[0].id, status: 'pending', manual: manualView(m) });
    }

    if (!CURRENCIES.includes(currency)) throw new UserError('That currency is not available yet.');
    const amount = Math.round(quantity * PER_IMAGE[currency] * 100);

    const { data, error } = await supabase.from('orders')
      .insert([{ user_id: req.user.id, label: prod.label, design, rows, quantity, payment: 'paystack', currency, amount_subunits: amount, status: 'pending' }]).select();
    if (error) throw error;
    const order = data[0];
    const reference = `ME-${order.id}-${crypto.randomBytes(4).toString('hex')}`;
    await supabase.from('orders').update({ paystack_reference: reference }).eq('id', order.id);

    const url = await startPaystack({
      email: req.user.email, amountSubunits: amount, currency, reference,
      metadata: { user_id: req.user.id, type: 'order', order_id: order.id, quantity }
    });
    res.json({ success: true, orderId: order.id, status: 'pending', authorization_url: url });
  } catch (e) { sendError(res, e); }
});

app.get('/orders/open', requireAuth, async (req, res) => {
  const { data } = await supabase.from('orders').select('id,status')
    .eq('user_id', req.user.id).in('status', ['paid', 'processing', 'failed'])
    .order('id', { ascending: false }).limit(1);
  res.json({ success: true, order: data && data.length ? data[0] : null });
});

app.get('/orders/:id', requireAuth, async (req, res) => {
  const { data } = await supabase.from('orders')
    .select('id,status,quantity,completed,results,label,note,payment')
    .eq('id', req.params.id).eq('user_id', req.user.id).limit(1);
  if (!data || !data.length) return res.status(404).json({ success: false, error: 'Order not found.' });
  res.json({ success: true, order: data[0] });
});

app.post('/orders/:id/retry', requireAuth, async (req, res) => {
  const { data } = await supabase.from('orders').update({ status: 'paid', note: null })
    .eq('id', req.params.id).eq('user_id', req.user.id).eq('status', 'failed').select();
  if (data && data.length) processOrder(data[0].id);
  res.json({ success: true });
});

/* ---------------- passes and Paystack payments ---------------- */
app.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { plan, currency = 'KES' } = req.body;
    const chosen = PLANS[plan];
    if (!chosen) throw new UserError('Unknown pass.');
    if (!CURRENCIES.includes(currency)) throw new UserError('That currency is not available yet.');
    const current = await getActiveSubscription(req.user.id);
    if (current && current.expires_at) {
      throw new UserError('You already have an active pass until ' + new Date(current.expires_at).toISOString().slice(0, 10) + '. You can buy a new pass when it ends.');
    }
    const url = await startPaystack({
      email: req.user.email, amountSubunits: chosen.prices[currency] * 100, currency,
      metadata: { user_id: req.user.id, plan }
    });
    res.json({ success: true, authorization_url: url });
  } catch (e) { sendError(res, e); }
});

app.post('/buy-credits', requireAuth, requireActive, async (req, res) => {
  try {
    const { credits, currency = 'KES' } = req.body;
    const price = CREDIT_PACKS[credits] && CREDIT_PACKS[credits][currency];
    if (!price || !CURRENCIES.includes(currency)) throw new UserError('Unknown pack or currency.');
    const url = await startPaystack({
      email: req.user.email, amountSubunits: price * 100, currency,
      metadata: { user_id: req.user.id, type: 'credits', credits }
    });
    res.json({ success: true, authorization_url: url });
  } catch (e) { sendError(res, e); }
});

app.post('/verify-payment', requireAuth, async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) throw new UserError('Missing payment reference.');
    let d;
    try {
      const r = await axios.get('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      });
      d = r.data.data;
    } catch (e) { throw new UserError('We could not check that payment yet.'); }
    if (d.status !== 'success') return res.json({ success: true, paid: false });
    if (!d.metadata || d.metadata.user_id !== req.user.id) return res.status(403).json({ success: false, error: 'This payment belongs to another account.' });
    const out = await handleCharge(d);
    res.json({ success: true, paid: true, kind: out.kind, orderId: out.orderId });
  } catch (e) { sendError(res, e); }
});

app.get('/history', requireAuth, async (req, res) => {
  const { data: generations, error } = await supabase.from('generations').select('*')
    .eq('user_id', req.user.id).order('id', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ success: false, error: error.message });
  const ids = [...new Set(generations.map(g => g.template_id).filter(Boolean))];
  const map = {};
  if (ids.length) {
    const { data: templates } = await supabase.from('templates').select('id, template_name').in('id', ids);
    (templates || []).forEach(t => { map[t.id] = t.template_name; });
  }
  res.json({ success: true, generations: generations.map(g => ({ ...g, template_name: g.label || map[g.template_id] || 'Design' })) });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  resumeOrders();
  setInterval(resumeOrders, 5 * 60 * 1000);
});