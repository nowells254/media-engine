const puppeteer = require('puppeteer');

let browserPromise = null;

// How many images may be drawn at the same time. 1 is safest on the free server.
const LIMIT = Math.max(1, Math.min(4, parseInt(process.env.RENDER_CONCURRENCY || '1', 10) || 1));
let running = 0;
const waiting = [];
function acquire() {
  return new Promise(resolve => {
    if (running < LIMIT) { running++; resolve(); } else waiting.push(resolve);
  });
}
function release() {
  running--;
  const next = waiting.shift();
  if (next) { running++; next(); }
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
      .then(browser => {
        browser.on('disconnected', () => { browserPromise = null; });
        return browser;
      })
      .catch(err => { browserPromise = null; throw err; });
  }
  return browserPromise;
}

async function renderOnce(html, opts) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: opts.w, height: opts.h, deviceScaleFactor: opts.scale || 2 });

    // The page may only load images and fonts from our own approved addresses
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      const ok = url.startsWith('data:') || url.startsWith('about:') ||
        (opts.allowed || []).some(prefix => url.startsWith(prefix));
      if (ok) req.continue(); else req.abort();
    });

    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 500));
    return await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: opts.w, height: opts.h } });
  } finally {
    await page.close().catch(() => {});
  }
}

function generateImage(html, opts) {
  return acquire().then(() => renderOnce(html, opts)).finally(release);
}

module.exports = { generateImage };