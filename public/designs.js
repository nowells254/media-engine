(function (root) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lum(hex) {
    var n = parseInt(String(hex).slice(1), 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function on(hex) { return lum(hex) > 0.6 ? '#2b2d42' : '#ffffff'; }

  var CJK = "'ME CJK'";
  var FONTS = {
    modern: CJK + ",'Helvetica Neue',Helvetica,Arial,'Liberation Sans','DejaVu Sans',sans-serif",
    classic: CJK + ",Georgia,'Times New Roman','Liberation Serif','DejaVu Serif',serif"
  };

  function F(key, label, type, ph, hint) { return { key: key, label: label, type: type || 'text', ph: ph || '', hint: hint || '' }; }
  var LOGO_HINT = 'PNG or JPG. A transparent PNG looks best.';
  var PHOTO_HINT = 'Passport-style photo. A plain background works best.';
  var SIG_HINT = 'Sign on white paper, take a photo or scan it, then upload.';

  var PRODUCTS = {
    business_card: {
      label: 'Business Card', size: '90 x 54 mm', w: 340, h: 204, scale: 4, styles: ['modern', 'classic'],
      fields: [F('company', 'Company name'), F('name', 'Your name'), F('title', 'Job title'), F('phone', 'Phone'),
        F('email', 'Email'), F('website', 'Website'), F('address', 'Location / address'), F('tagline', 'Tagline (optional)'),
        F('logo', 'Logo', 'image', '', LOGO_HINT)]
    },
    id_card: {
      label: 'Staff ID Card', size: '54 x 86 mm (portrait)', w: 204, h: 325, scale: 4, styles: ['modern', 'classic'],
      fields: [F('company', 'Company name'), F('name', 'Full name'), F('title', 'Role / department'), F('idno', 'ID number'),
        F('valid', 'Valid until'), F('phone', 'Phone'), F('email', 'Email'), F('address', 'Location / address'),
        F('photo', 'Passport photo', 'image', '', PHOTO_HINT), F('logo', 'Logo', 'image', '', LOGO_HINT)]
    },
    certificate: {
      label: 'Certificate', size: 'A4 landscape, 297 x 210 mm', w: 1123, h: 794, scale: 3, styles: ['modern', 'classic'],
      fields: [F('company', 'Organisation name'), F('heading', 'Certificate title'), F('recipient', 'Recipient name'),
        F('body', 'What is it for?', 'textarea'), F('date', 'Date'), F('location', 'Location'),
        F('signer', 'First signer name'), F('signerrole', 'First signer title'), F('signature', 'First signature', 'image', '', SIG_HINT),
        F('signer2', 'Second signer name (optional)'), F('signerrole2', 'Second signer title'), F('signature2', 'Second signature', 'image', '', SIG_HINT),
        F('logo', 'Logo', 'image', '', LOGO_HINT)]
    },
    poster: {
      label: 'Poster', size: 'A3 portrait, 297 x 420 mm', w: 1123, h: 1587, scale: 2, styles: ['modern', 'classic'],
      fields: [F('headline', 'Headline'), F('subtitle', 'Subtitle'), F('details', 'Details', 'textarea'), F('date', 'Date'),
        F('location', 'Location'), F('company', 'Company / organiser'), F('phone', 'Phone'), F('email', 'Email'), F('website', 'Website'),
        F('photo', 'Main picture', 'image', '', 'A wide, bright picture works best.'), F('logo', 'Logo', 'image', '', LOGO_HINT)]
    },
    banner: {
      label: 'Web Banner', size: '1200 x 628 px', w: 1200, h: 628, scale: 2, styles: ['modern', 'classic'],
      fields: [F('headline', 'Headline'), F('subtitle', 'Subtitle'), F('offer', 'Button / offer text'), F('company', 'Company name'),
        F('website', 'Website'), F('phone', 'Phone'),
        F('photo', 'Product picture', 'image', '', 'A clear picture of your product or team.'), F('logo', 'Logo', 'image', '', LOGO_HINT)]
    }
  };

  var SAMPLES = {
    business_card: { company: 'Pinnacle Edge Ltd', name: 'Jane Wanjiru', title: 'Marketing Director', phone: '+254 700 000 000', email: 'jane@example.com', website: 'www.example.com', address: 'Nairobi, Kenya', tagline: 'Creative solutions that grow your brand' },
    id_card: { company: 'Pinnacle Edge Ltd', name: 'Jane Wanjiru', title: 'Marketing Department', idno: 'ID: PE-0042', valid: 'Valid until: 31 Dec 2027', phone: '+254 700 000 000', email: 'jane@example.com', address: 'Nairobi, Kenya' },
    certificate: { company: 'Pinnacle Edge Academy', heading: 'Certificate of Achievement', recipient: 'Jane Wanjiru', body: 'For outstanding performance and dedication during the 2026 training programme.', date: '12 October 2026', location: 'Nairobi, Kenya', signer: 'John Otieno', signerrole: 'Director' },
    poster: { headline: 'Annual Business Summit 2026', subtitle: 'Innovate. Connect. Grow.', details: 'Join industry leaders for a full day of talks, workshops and networking.', date: '15 November 2026', location: 'KICC, Nairobi', company: 'Pinnacle Edge Ltd', phone: '+254 700 000 000', email: 'hello@example.com', website: 'www.example.com' },
    banner: { headline: 'Big Season Sale', subtitle: 'Up to 50% off selected products this week only', offer: 'Shop now', company: 'Pinnacle Edge Ltd', website: 'www.example.com', phone: '+254 700 000 000' }
  };

    var SAMPLES_ZH = {
    business_card: { company: '示例科技有限公司', name: '王小明', title: '市场总监', phone: '+86 138 0000 0000', email: 'wang@example.com', website: 'www.example.com', address: '深圳市南山区科技园', tagline: '创意方案,助力品牌成长' },
    id_card: { company: '示例科技有限公司', name: '王小明', title: '市场部', idno: '工号:PR-0042', valid: '有效期至:2027年12月31日', phone: '+86 138 0000 0000', email: 'wang@example.com', address: '深圳市南山区科技园' },
    certificate: { company: '示例培训学院', heading: '荣誉证书', recipient: '王小明', body: '表彰其在2026年度培训项目中表现突出、勤奋努力。', date: '2026年10月12日', location: '深圳', signer: '李明', signerrole: '院长' },
    poster: { headline: '2026 年度商业峰会', subtitle: '创新 · 连接 · 成长', details: '与行业领袖相聚,共享一整天的演讲、工作坊与交流。', date: '2026年11月15日', location: '深圳会展中心', company: '示例科技有限公司', phone: '+86 138 0000 0000', email: 'hello@example.com', website: 'www.example.com' },
    banner: { headline: '年度大促', subtitle: '精选商品低至五折,仅限本周', offer: '立即选购', company: '示例科技有限公司', website: 'www.example.com', phone: '+86 138 0000 0000' }
  };
  var TEXT = {
    en: { presented: 'This certificate is proudly presented to', cert: 'Certificate of Achievement' },
    zh: { presented: '兹授予', cert: '荣誉证书' }
  };

  var PALETTES = [
    { name: 'Royal', colors: { primary: '#4361ee', accent: '#f72585', background: '#ffffff', text: '#2b2d42' } },
    { name: 'Ocean', colors: { primary: '#0077b6', accent: '#00b4d8', background: '#f8fdff', text: '#03045e' } },
    { name: 'Forest', colors: { primary: '#2d6a4f', accent: '#74c69d', background: '#fbfffc', text: '#1b4332' } },
    { name: 'Sunset', colors: { primary: '#e76f51', accent: '#f4a261', background: '#fffaf5', text: '#264653' } },
    { name: 'Gold', colors: { primary: '#8a6d1d', accent: '#d4af37', background: '#fffdf5', text: '#2b2d42' } },
    { name: 'Night', colors: { primary: '#7209b7', accent: '#f72585', background: '#1d1d2c', text: '#ffffff' } }
  ];

  function img(url, style, o) {
    if (!url) return '';
    var u = String(url);
    if (u.charAt(0) === '/') u = ((o && o.origin) || '') + u;
    return '<img src="' + esc(u) + '" style="' + style + '">';
  }
  function list(items, tag) {
    return items.filter(Boolean).map(function (x) { return '<' + tag + '>' + esc(x) + '</' + tag + '>'; }).join('');
  }

  function businessCard(d, o) {
    var c = d.colors, f = d.fields, ff = FONTS[d.style] || FONTS.modern, onP = on(c.primary);
    var logo = img(f.logo, 'max-width:64px;max-height:46px;object-fit:contain;', o);
    var contacts = list([f.phone, f.email, f.website, f.address], 'div');
    if (d.style === 'classic') {
      return '<div style="width:340px;height:204px;background:' + c.background + ';color:' + c.text + ';font-family:' + ff + ';border:6px solid ' + c.primary + ';padding:12px 18px;display:flex;flex-direction:column;justify-content:space-between;text-align:center;">' +
        '<div>' + logo + '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' + c.primary + ';font-weight:700;margin-top:2px;">' + esc(f.company) + '</div></div>' +
        '<div><div style="font-size:17px;font-weight:700;">' + esc(f.name) + '</div><div style="font-size:10px;color:' + c.accent + ';letter-spacing:1px;">' + esc(f.title) + '</div></div>' +
        '<div style="font-size:8.5px;line-height:1.5;">' + contacts + '</div></div>';
    }
    return '<div style="width:340px;height:204px;display:flex;background:' + c.background + ';color:' + c.text + ';font-family:' + ff + ';">' +
      '<div style="width:104px;background:' + c.primary + ';color:' + onP + ';display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px;gap:8px;">' + logo +
        '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;line-height:1.25;">' + esc(f.company) + '</div></div>' +
      '<div style="flex:1;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">' +
        '<div><div style="font-size:18px;font-weight:700;">' + esc(f.name) + '</div><div style="font-size:10px;color:' + c.accent + ';font-weight:600;margin-top:2px;">' + esc(f.title) + '</div>' +
        (f.tagline ? '<div style="font-size:8.5px;margin-top:6px;opacity:.75;">' + esc(f.tagline) + '</div>' : '') + '</div>' +
        '<div style="font-size:8.5px;line-height:1.6;">' + contacts + '</div></div></div>';
  }

  function idCard(d, o) {
    var c = d.colors, f = d.fields, ff = FONTS[d.style] || FONTS.modern, classic = d.style === 'classic';
    var logo = img(f.logo, 'max-width:70px;max-height:32px;object-fit:contain;', o);
    var photo = f.photo ? img(f.photo, 'width:100%;height:100%;object-fit:cover;display:block;', o) : '<div style="width:100%;height:100%;background:' + c.primary + '22;"></div>';
    var lines = list([f.phone, f.email, f.address], 'div');
    return '<div style="width:204px;height:325px;background:' + c.background + ';color:' + c.text + ';font-family:' + ff + ';display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="background:' + c.primary + ';color:' + on(c.primary) + ';padding:12px 10px 40px;text-align:center;' + (classic ? 'border-bottom:4px solid ' + c.accent + ';' : '') + '">' + logo +
        '<div style="font-size:11px;font-weight:700;letter-spacing:.6px;margin-top:3px;">' + esc(f.company) + '</div></div>' +
      '<div style="width:92px;height:112px;margin:-30px auto 0;border:3px solid ' + c.background + ';border-radius:' + (classic ? '4px' : '12px') + ';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.25);background:' + c.background + ';">' + photo + '</div>' +
      '<div style="text-align:center;padding:8px 10px 0;"><div style="font-size:15px;font-weight:700;">' + esc(f.name) + '</div>' +
        '<div style="font-size:9.5px;color:' + c.accent + ';font-weight:600;margin-top:2px;">' + esc(f.title) + '</div>' +
        '<div style="font-size:8px;line-height:1.55;margin-top:8px;">' + lines + '</div></div>' +
      '<div style="margin-top:auto;background:' + c.accent + ';color:' + on(c.accent) + ';padding:7px 10px;font-size:8.5px;font-weight:700;display:flex;justify-content:space-between;"><span>' + esc(f.idno) + '</span><span>' + esc(f.valid) + '</span></div></div>';
  }

  function certificate(d, o) {
    var c = d.colors, f = d.fields, ff = FONTS[d.style] || FONTS.modern, classic = d.style === 'classic';
    var logo = img(f.logo, 'max-height:80px;max-width:240px;object-fit:contain;', o);
    function sig(image, name, role) {
      if (!name && !image) return '<div style="min-width:220px;"></div>';
      return '<div style="text-align:center;min-width:220px;">' +
        (image ? img(image, 'height:58px;max-width:190px;object-fit:contain;mix-blend-mode:multiply;display:block;margin:0 auto -6px;', o) : '<div style="height:52px;"></div>') +
        '<div style="border-top:2px solid ' + c.text + ';padding-top:6px;font-size:15px;font-weight:700;">' + esc(name) + '</div>' +
        '<div style="font-size:12px;opacity:.75;">' + esc(role) + '</div></div>';
    }
    return '<div style="width:1123px;height:794px;padding:34px;background:' + c.background + ';font-family:' + ff + ';color:' + c.text + ';">' +
      '<div style="height:100%;border:' + (classic ? '5px double ' : '12px solid ') + c.primary + ';padding:10px;">' +
      '<div style="height:100%;border:2px solid ' + c.accent + ';display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 70px 28px;">' + logo +
        '<div style="font-size:15px;letter-spacing:5px;text-transform:uppercase;color:' + c.primary + ';font-weight:700;margin-top:8px;">' + esc(f.company) + '</div>' +
        '<div style="font-size:54px;font-weight:700;margin-top:20px;letter-spacing:2px;color:' + c.primary + ';' + (classic ? 'font-style:italic;' : '') + '">' + esc(f.heading || TEXT[d.lang].cert) + '</div>' +
        '<div style="font-size:16px;margin-top:18px;opacity:.7;">' + esc(TEXT[d.lang].presented) + '</div>' +
        '<div style="font-size:56px;font-weight:700;margin:12px 0 4px;border-bottom:3px solid ' + c.accent + ';padding:0 40px 8px;">' + esc(f.recipient) + '</div>' +
        '<div style="font-size:19px;line-height:1.5;max-width:780px;margin-top:16px;white-space:pre-line;">' + esc(f.body) + '</div>' +
        '<div style="margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end;">' +
          sig(f.signature, f.signer, f.signerrole) +
          '<div style="font-size:14px;line-height:1.7;opacity:.85;">' + list([f.date, f.location], 'div') + '</div>' +
          sig(f.signature2, f.signer2, f.signerrole2) +
        '</div></div></div></div>';
  }

  function poster(d, o) {
    var c = d.colors, f = d.fields, ff = FONTS[d.style] || FONTS.modern, classic = d.style === 'classic', onP = on(c.primary);
    var hero = f.photo ? img(f.photo, 'width:100%;height:100%;object-fit:cover;display:block;', o) : '';
    var logo = img(f.logo, 'max-height:90px;max-width:260px;object-fit:contain;display:block;', o);
    function pill(t) { return t ? '<div style="background:' + c.primary + ';color:' + onP + ';padding:12px 26px;border-radius:40px;font-size:30px;font-weight:700;">' + esc(t) + '</div>' : ''; }
    var contacts = [f.phone, f.email, f.website].filter(Boolean).map(function (x) { return esc(x); }).join('  |  ');
    return '<div style="width:1123px;height:1587px;background:' + c.background + ';color:' + c.text + ';font-family:' + ff + ';display:flex;flex-direction:column;overflow:hidden;' + (classic ? 'border:16px solid ' + c.primary + ';' : '') + '">' +
      '<div style="position:relative;height:620px;background:' + c.primary + ';flex-shrink:0;overflow:hidden;">' + hero +
        (logo ? '<div style="position:absolute;left:60px;top:50px;background:rgba(255,255,255,.93);padding:14px 22px;border-radius:12px;">' + logo + '</div>' : '') +
        '<div style="position:absolute;left:0;right:0;bottom:0;height:12px;background:' + c.accent + ';"></div></div>' +
      '<div style="flex:1;padding:64px 80px 40px;display:flex;flex-direction:column;">' +
        '<div style="font-size:96px;font-weight:800;line-height:1.05;color:' + c.primary + ';">' + esc(f.headline) + '</div>' +
        '<div style="font-size:40px;margin-top:22px;color:' + c.accent + ';font-weight:600;">' + esc(f.subtitle) + '</div>' +
        '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:44px;">' + pill(f.date) + pill(f.location) + '</div>' +
        '<div style="font-size:30px;line-height:1.5;margin-top:40px;white-space:pre-line;opacity:.9;">' + esc(f.details) + '</div>' +
        '<div style="margin-top:auto;border-top:5px solid ' + c.accent + ';padding-top:26px;display:flex;justify-content:space-between;align-items:center;font-size:26px;">' +
          '<div style="font-weight:700;">' + esc(f.company) + '</div><div>' + contacts + '</div></div></div></div>';
  }

  function banner(d, o) {
    var c = d.colors, f = d.fields, ff = FONTS[d.style] || FONTS.modern, classic = d.style === 'classic';
    var logo = img(f.logo, 'max-height:54px;max-width:160px;object-fit:contain;', o);
    var btn = f.offer ? '<div style="display:inline-block;margin-top:28px;background:' + c.accent + ';color:' + on(c.accent) + ';padding:16px 36px;border-radius:' + (classic ? '4px' : '40px') + ';font-size:26px;font-weight:700;">' + esc(f.offer) + '</div>' : '';
    var art = f.photo ? img(f.photo, 'width:100%;height:100%;object-fit:cover;display:block;', o) : '<div style="width:340px;height:340px;border-radius:50%;background:' + c.accent + ';opacity:.85;"></div>';
    var contact = [f.website, f.phone].filter(Boolean).map(function (x) { return esc(x); }).join('   |   ');
    return '<div style="width:1200px;height:628px;display:flex;background:' + c.background + ';color:' + c.text + ';font-family:' + ff + ';overflow:hidden;">' +
      '<div style="flex:1.25;padding:50px 56px;display:flex;flex-direction:column;justify-content:space-between;">' +
        '<div style="display:flex;align-items:center;gap:16px;">' + logo + '<div style="font-size:24px;font-weight:700;color:' + c.primary + ';">' + esc(f.company) + '</div></div>' +
        '<div><div style="font-size:70px;font-weight:800;line-height:1.05;color:' + c.primary + ';">' + esc(f.headline) + '</div>' +
          '<div style="font-size:30px;margin-top:18px;opacity:.85;">' + esc(f.subtitle) + '</div>' + btn + '</div>' +
        '<div style="font-size:22px;opacity:.8;">' + contact + '</div></div>' +
      '<div style="flex:1;background:' + c.primary + ';display:flex;align-items:center;justify-content:center;overflow:hidden;' + (classic ? 'border-left:12px solid ' + c.accent + ';' : '') + '">' + art + '</div></div>';
  }

  var BUILDERS = { business_card: businessCard, id_card: idCard, certificate: certificate, poster: poster, banner: banner };

  function build(design, opts) {
    opts = opts || {};
    var prod = PRODUCTS[design.product];
    var d = {
      product: design.product,
      style: design.style || 'modern',
      lang: design.lang === 'zh' ? 'zh' : 'en',
      colors: design.colors || PALETTES[0].colors,
      fields: design.fields || {}
    };
    var font = opts.origin
      ? "@font-face{font-family:'ME CJK';font-weight:100 900;src:url('" + opts.origin + "/assets/fonts/NotoSansSC.ttf');unicode-range:U+2E80-9FFF,U+F900-FAFF,U+3000-303F,U+FF00-FFEF;}"
      : '';
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + font +
      '*{box-sizing:border-box}html,body{margin:0;padding:0;width:' + prod.w + 'px;height:' + prod.h + 'px;overflow:hidden}</style></head><body>' +
      BUILDERS[d.product](d, opts) + '</body></html>';
  }

  var api = { PRODUCTS: PRODUCTS, SAMPLES: SAMPLES, SAMPLES_ZH: SAMPLES_ZH, PALETTES: PALETTES, build: build, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Designs = api;
})(typeof window !== 'undefined' ? window : this);