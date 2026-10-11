const puppeteer = require('puppeteer');

let browserPromise = null;
let queue = Promise.resolve();

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

// One image at a time so the small free server never runs out of memory
function generateImage(html, opts) {
  const job = queue.then(() => renderOnce(html, opts));
  queue = job.catch(() => {});
  return job;
}

module.exports = { generateImage };