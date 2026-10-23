// Makes Media Engine installable like an app, and shows an "Install app" button where the phone allows it.
(function () {
  if (window.__mePwa) return;
  window.__mePwa = true;
  var d = document, h = d.head;
  function add(tag, attrs) { var el = d.createElement(tag); for (var k in attrs) el.setAttribute(k, attrs[k]); h.appendChild(el); }
  if (!d.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest.webmanifest' });
  add('meta', { name: 'theme-color', content: '#4361ee' });
  add('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Media Engine' });

  if (window.ME_DICT) {
    Object.assign(window.ME_DICT, {
      'Install app': '安装应用',
      'To install: tap the Share button, then "Add to Home Screen".': '安装方法:点击“分享”按钮,然后选择“添加到主屏幕”。',
      'Tap the menu at the top right and choose "Open in browser", then install the app from there.': '点击右上角菜单,选择“在浏览器中打开”,然后在浏览器中安装应用。'
    });
    if (window.ME_REAPPLY) window.ME_REAPPLY();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }

  var ua = navigator.userAgent || '';
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) return;                      // already installed and running as an app
  var wechat = /MicroMessenger/i.test(ua);
  var ios = /iPhone|iPad|iPod/i.test(ua) && !wechat;
  var deferred = null, btn = null;

  function showModal(text) {
    var o = d.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:rgba(20,20,40,.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    var box = d.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:22px;max-width:360px;font-family:inherit;color:#2b2d42;text-align:center;line-height:1.6;';
    var p = d.createElement('p'); p.textContent = text;
    var b = d.createElement('button'); b.type = 'button'; b.textContent = 'Close';
    b.style.cssText = 'margin-top:10px;padding:10px 24px;border:none;border-radius:10px;background:#4361ee;color:#fff;font-weight:700;font-size:15px;cursor:pointer;width:auto;display:inline-block;';
    b.onclick = function () { o.remove(); };
    box.appendChild(p); box.appendChild(b); o.appendChild(box); d.body.appendChild(o);
  }
  function onClick() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; if (btn) btn.style.display = 'none'; });
      return;
    }
    if (wechat) showModal('Tap the menu at the top right and choose "Open in browser", then install the app from there.');
    else if (ios) showModal('To install: tap the Share button, then "Add to Home Screen".');
  }
  function ensureButton() {
    if (btn) return;
    btn = d.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Install app';
    btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9998;width:auto;display:block;margin:0;padding:10px 18px;border:none;border-radius:24px;background:linear-gradient(90deg,#4361ee,#7209b7);color:#fff;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(67,97,238,.4);';
    btn.onclick = onClick;
    d.body.appendChild(btn);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ensureButton(); });
  window.addEventListener('appinstalled', function () { if (btn) btn.style.display = 'none'; });
  if (wechat || ios) ensureButton();
})();