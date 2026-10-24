// collect.js: one link for many clients, plus faster bulk generation.
// Loaded from index.js:
//   const collectApi = require('./collect')(app, { ...helpers... });
//   processOrder = collectApi.processOrder;
module.exports = function (app, d) {
  const { supabase, rateLimit, requireAuth, crypto, Designs, cleanFields, cleanDesign, UserError,
          MAX_ORDER, BASE_URL, activeOrders, renderAndStore, issueSerial } = d;

  // How many images are made at the same time. Keep at 1 on the free server; raise on a paid plan.
  const CONCURRENCY = Math.max(1, Math.min(4, parseInt(process.env.RENDER_CONCURRENCY || '1', 10) || 1));

  // Details a client may be asked for (never logos, signatures or company details)
  const ASKABLE = {
    certificate: ['recipient', 'course', 'duration', 'body', 'date', 'location'],
    business_card: ['name', 'title', 'phone', 'email', 'address', 'tagline'],
    id_card: ['name', 'title', 'idno', 'valid', 'phone', 'email', 'address', 'photo'],
    poster: ['headline', 'subtitle', 'details', 'date', 'location'],
    banner: ['headline', 'subtitle', 'offer']
  };
  const MUST = { certificate: 'recipient', business_card: 'name', id_card: 'name', poster: 'headline', banner: 'headline' };

  // Generous on purpose: a whole class may share one Wi-Fi address
  const publicLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' }
  });
  const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' }
  });

  function fail(res, e) {
    if (e instanceof UserError) return res.status(400).json({ success: false, error: e.message });
    console.error(e);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }

  async function findByToken(t) {
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(t)) return null;
    const { data } = await supabase.from('collect_requests').select('*').eq('token', t).limit(1);
    return data && data.length ? data[0] : null;
  }
  async function countOf(id, onlyNew) {
    let q = supabase.from('collect_submissions').select('*', { count: 'exact', head: true }).eq('request_id', id);
    if (onlyNew) q = q.eq('done', false);
    const { count } = await q;
    return count || 0;
  }
  function stateOf(r, n) {
    if (r.status !== 'open') return 'closed';
    if (r.closes_at && new Date(r.closes_at) < new Date()) return 'closed';
    if (n >= r.max_entries) return 'full';
    return 'open';
  }
  function view(r) {
    return {
      id: r.id, token: r.token, title: r.title, note: r.note || '', product: r.design.product, ask: r.ask,
      maxEntries: r.max_entries, closesAt: r.closes_at, status: r.status, createdAt: r.created_at
    };
  }

  /* ---------------- public: what the client sees ---------------- */
  app.get('/api/collect/:token', publicLimiter, async (req, res) => {
    try {
      const r = await findByToken(String(req.params.token || ''));
      if (!r) return res.json({ success: true, found: false });
      const n = await countOf(r.id, false);
      res.json({ success: true, found: true, state: stateOf(r, n), title: r.title, note: r.note || '', design: r.design, ask: r.ask });
    } catch (e) { fail(res, e); }
  });

  app.post('/api/collect/:token/submit', submitLimiter, async (req, res) => {
    try {
      if (req.body && req.body.website) return res.json({ success: true });   // hidden trap field: bots fill it in
      const r = await findByToken(String(req.params.token || ''));
      if (!r) throw new UserError('This form was not found.');
      const st = stateOf(r, await countOf(r.id, false));
      if (st === 'closed') throw new UserError('This form is closed.');
      if (st === 'full') throw new UserError('This form is full.');

      const prod = Designs.PRODUCTS[r.design.product];
      const incoming = (req.body && req.body.fields) || {};
      const picked = {};
      (r.ask || []).forEach(k => { if (incoming[k] !== undefined) picked[k] = incoming[k]; });
      const clean = cleanFields({ fields: prod.fields.filter(f => (r.ask || []).includes(f.key)) }, picked);

      const must = MUST[r.design.product];
      if ((r.ask || []).includes(must) && !String(clean[must] || '').trim()) {
        throw new UserError(must === 'recipient' || must === 'name' ? 'Please enter your name.' : 'Please fill in the required details.');
      }
      const contact = String((req.body && req.body.contact) || '').trim().slice(0, 120);
      const { error } = await supabase.from('collect_submissions').insert([{ request_id: r.id, fields: clean, contact }]);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) { fail(res, e); }
  });

  app.post('/api/collect/:token/upload', submitLimiter, async (req, res) => {
    try {
      const r = await findByToken(String(req.params.token || ''));
      if (!r) throw new UserError('This form was not found.');
      if (stateOf(r, 0) === 'closed') throw new UserError('This form is closed.');
      if (!(r.ask || []).includes('photo')) throw new UserError('Photos are not requested on this form.');
      const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec((req.body && req.body.dataUrl) || '');
      if (!m) throw new UserError('Please upload a PNG or JPG image.');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 1.2 * 1024 * 1024) throw new UserError('That image is too large.');
      const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      const isJpg = buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
      if (!isPng && !isJpg) throw new UserError('That file is not a valid PNG or JPG image.');
      const { data: existing } = await supabase.storage.from('assets').list('collect/' + r.id, { limit: r.max_entries * 2 });
      if ((existing || []).length >= r.max_entries * 2) throw new UserError('This form cannot accept more photos.');
      const name = `collect/${r.id}/${crypto.randomUUID()}.${isPng ? 'png' : 'jpg'}`;
      const { error } = await supabase.storage.from('assets').upload(name, buf, { contentType: isPng ? 'image/png' : 'image/jpeg' });
      if (error) throw error;
      const { data } = supabase.storage.from('assets').getPublicUrl(name);
      res.json({ success: true, url: data.publicUrl });
    } catch (e) { fail(res, e); }
  });

  /* ---------------- owner: manage requests ---------------- */
  app.post('/collect', requireAuth, async (req, res) => {
    try {
      const b = req.body || {};
      const product = b.design && b.design.product;
      if (!Designs.PRODUCTS[product]) throw new UserError('Unknown product.');
      const title = String(b.title || '').trim().slice(0, 100);
      if (!title) throw new UserError('Please give your request a title.');
      const ask = (Array.isArray(b.ask) ? b.ask : []).filter(k => ASKABLE[product].includes(k));
      if (!ask.length) throw new UserError('Choose at least one detail to ask for.');
      const { count } = await supabase.from('collect_requests').select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id).eq('status', 'open');
      if ((count || 0) >= 20) throw new UserError('You can have up to 20 open requests. Close one first.');

      const cd = cleanDesign({ ...b.design, fields: b.shared || {} });
      ask.forEach(k => { delete cd.fields[k]; });
      const design = { product: cd.product, style: cd.style, lang: cd.lang, colors: cd.colors, shared: cd.fields };

      const maxEntries = Math.max(1, Math.min(MAX_ORDER * 5, parseInt(b.maxEntries, 10) || 200));
      let closes = null;
      if (b.closesAt) {
        closes = new Date(String(b.closesAt) + 'T23:59:59Z');
        if (isNaN(closes.getTime())) closes = null;
      }
      const row = {
        token: crypto.randomBytes(18).toString('base64url'), user_id: req.user.id, title,
        note: String(b.note || '').trim().slice(0, 300), design, ask, max_entries: maxEntries,
        closes_at: closes ? closes.toISOString() : null
      };
      const { data, error } = await supabase.from('collect_requests').insert([row]).select();
      if (error) throw error;
      res.json({ success: true, request: view(data[0]) });
    } catch (e) { fail(res, e); }
  });

  app.get('/collect', requireAuth, async (req, res) => {
    try {
      const { data: rows } = await supabase.from('collect_requests').select('*')
        .eq('user_id', req.user.id).order('id', { ascending: false }).limit(30);
      const list = await Promise.all((rows || []).map(async r => ({
        ...view(r), count: await countOf(r.id, false), fresh: await countOf(r.id, true)
      })));
      res.json({ success: true, requests: list });
    } catch (e) { fail(res, e); }
  });

  app.get('/collect/:id', requireAuth, async (req, res) => {
    try {
      const { data } = await supabase.from('collect_requests').select('*').eq('id', req.params.id).eq('user_id', req.user.id).limit(1);
      if (!data || !data.length) throw new UserError('Request not found.');
      const { data: subs } = await supabase.from('collect_submissions').select('id,fields,contact,done,created_at')
        .eq('request_id', data[0].id).order('id', { ascending: true }).limit(1000);
      res.json({ success: true, request: { ...view(data[0]), design: data[0].design }, submissions: subs || [] });
    } catch (e) { fail(res, e); }
  });

  app.post('/collect/:id/status', requireAuth, async (req, res) => {
    try {
      const status = req.body && req.body.status === 'closed' ? 'closed' : 'open';
      const { error } = await supabase.from('collect_requests').update({ status }).eq('id', req.params.id).eq('user_id', req.user.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) { fail(res, e); }
  });

  app.delete('/collect/:id', requireAuth, async (req, res) => {
    try {
      const { error } = await supabase.from('collect_requests').delete().eq('id', req.params.id).eq('user_id', req.user.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) { fail(res, e); }
  });

  app.delete('/collect/:id/submissions/:sid', requireAuth, async (req, res) => {
    try {
      const { data } = await supabase.from('collect_requests').select('id').eq('id', req.params.id).eq('user_id', req.user.id).limit(1);
      if (!data || !data.length) throw new UserError('Request not found.');
      const { error } = await supabase.from('collect_submissions').delete().eq('id', req.params.sid).eq('request_id', data[0].id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e) { fail(res, e); }
  });

  /* ---------------- link finished orders back to the replies they came from ---------------- */
  async function linkSubmissions(req, res, next) {
    try {
      const ids = (Array.isArray(req.body && req.body.submissionIds) ? req.body.submissionIds : [])
        .map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, MAX_ORDER);
      if (!ids.length) return next();
      const { data: mine } = await supabase.from('collect_requests').select('id').eq('user_id', req.user.id);
      const myIds = (mine || []).map(r => r.id);
      if (!myIds.length) return next();
      const { data: subs } = await supabase.from('collect_submissions').select('id').in('id', ids).in('request_id', myIds);
      const valid = (subs || []).map(s => s.id);
      const orig = res.json.bind(res);
      res.json = function (body) {
        if (body && body.success && body.orderId && valid.length) {
          Promise.resolve(supabase.from('orders').update({ submission_ids: valid }).eq('id', body.orderId)).catch(() => {});
        }
        return orig(body);
      };
      next();
    } catch (e) { next(); }
  }
  app.post('/orders', requireAuth, linkSubmissions);

  /* ---------------- order processing: several images at once, certificate IDs, mark replies as done ---------------- */
  async function processOrder(orderId) {
    if (activeOrders.has(orderId)) return;
    activeOrders.add(orderId);
    try {
      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (!o || !['paid', 'processing'].includes(o.status)) return;
      await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId);

      const results = Array.isArray(o.results) ? [...o.results] : [];
      while (results.length < o.quantity) {
        const start = results.length;
        const idxs = [];
        for (let i = start; i < Math.min(o.quantity, start + CONCURRENCY); i++) idxs.push(i);

        const made = await Promise.all(idxs.map(async i => {
          try {
            const row = (o.rows && o.rows[i]) || {};
            const design = { ...o.design, fields: { ...o.design.fields, ...row } };
            if (design.product === 'certificate') {
              const serial = await issueSerial(o, design.fields);
              design.fields.certid = serial;
              design.fields.verifyUrl = `${BASE_URL}/verify.html?c=${serial}`;
            }
            for (let attempt = 0; attempt < 2; attempt++) {
              try { return await renderAndStore(o.user_id, design); }
              catch (e) { console.error('Render failed', orderId, i, e.message); }
            }
          } catch (e) { console.error('Image failed', orderId, i, e.message); }
          return null;
        }));

        // keep the images that finished in order, up to the first one that failed
        let ok = 0;
        for (const url of made) {
          if (!url) break;
          results.push(url);
          await supabase.from('generations').insert([{
            user_id: o.user_id, image_url: url, template_id: null, label: o.label, counts_toward_pass: o.payment === 'pass'
          }]);
          ok++;
        }
        await supabase.from('orders').update({ results, completed: results.length }).eq('id', orderId);
        if (ok < made.length) {
          await supabase.from('orders').update({ status: 'failed', note: 'Some images could not be created' }).eq('id', orderId);
          return;
        }
      }
      await supabase.from('orders').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', orderId);

      // read again: the link to the replies is saved just after the order is created
      const { data: fin } = await supabase.from('orders').select('submission_ids').eq('id', orderId).single();
      if (fin && Array.isArray(fin.submission_ids) && fin.submission_ids.length) {
        await supabase.from('collect_submissions').update({ done: true, order_id: orderId }).in('id', fin.submission_ids);
      }
    } catch (e) {
      console.error('Order failed', orderId, e.message);
    } finally {
      activeOrders.delete(orderId);
    }
  }


  /* ---------------- app icons: drawn by the server, so there are no image files to copy ---------------- */
  const zlib = require('zlib');
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function pngChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }
  function encodePng(w, h, rgba) {
    const stride = w * 4 + 1;
    const raw = Buffer.alloc(stride * h);
    for (let y = 0; y < h; y++) { raw[y * stride] = 0; rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4); }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))
    ]);
  }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  // The letters M and E, drawn as thick lines inside a square from 0 to 1
  function letterLines(k) {
    const m = v => 0.5 + (v - 0.5) * k;
    return [
      [0.20, 0.64, 0.20, 0.36], [0.20, 0.36, 0.36, 0.58], [0.36, 0.58, 0.52, 0.36], [0.52, 0.36, 0.52, 0.64],
      [0.64, 0.36, 0.64, 0.64], [0.64, 0.36, 0.82, 0.36], [0.64, 0.50, 0.79, 0.50], [0.64, 0.64, 0.82, 0.64]
    ].map(l => l.map(m));
  }
  function drawIcon(size, rounded, k) {
    const out = Buffer.alloc(size * size * 4);
    const lines = letterLines(k), half = 0.0375 * k, R = 0.22, N = 3;
    const stops = [[0, 67, 97, 238], [0.55, 114, 9, 183], [1, 247, 37, 133]];
    function grad(t) {
      for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          const a = stops[i - 1], b = stops[i], f = (t - a[0]) / (b[0] - a[0]);
          return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
        }
      }
      return [stops[2][1], stops[2][2], stops[2][3]];
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sr = 0, sg = 0, sb = 0, sa = 0;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const u = (x + (i + 0.5) / N) / size, v = (y + (j + 0.5) / N) / size;
          if (rounded) {
            const dx = Math.max(Math.abs(u - 0.5) - (0.5 - R), 0), dy = Math.max(Math.abs(v - 0.5) - (0.5 - R), 0);
            if (dx * dx + dy * dy > R * R) continue;
          }
          let c = grad((u + v) / 2);
          for (let n = 0; n < lines.length; n++) {
            const l = lines[n];
            if (segDist(u, v, l[0], l[1], l[2], l[3]) <= half) { c = [255, 255, 255]; break; }
          }
          sr += c[0]; sg += c[1]; sb += c[2]; sa += 1;
        }
        const o = (y * size + x) * 4;
        if (sa) { out[o] = sr / sa; out[o + 1] = sg / sa; out[o + 2] = sb / sa; out[o + 3] = Math.round(255 * sa / (N * N)); }
      }
    }
    return out;
  }
  const ICONS = {
    '/icon-192.png': [192, true, 1], '/icon-512.png': [512, true, 1],
    '/icon-maskable-512.png': [512, false, 0.72], '/apple-touch-icon.png': [180, false, 0.9]
  };
  const iconCache = {};
  Object.keys(ICONS).forEach(p => {
    app.get(p, (req, res) => {
      if (!iconCache[p]) { const c = ICONS[p]; iconCache[p] = encodePng(c[0], c[0], drawIcon(c[0], c[1], c[2])); }
      res.set('Cache-Control', 'public, max-age=86400').type('image/png').send(iconCache[p]);
    });
  });

  return { processOrder };
};
