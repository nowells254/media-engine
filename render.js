const puppeteer = require('puppeteer');

let browserPromise = null;
let queue = Promise.resolve();

// One Chrome instance is reused for every image, which is much faster than starting a new one each time
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function renderOnce(htmlContent, data) {
  let finalHtml = htmlContent;
  for (const key in data) {
    finalHtml = finalHtml.split('{{' + key + '}}').join(escapeHtml(data[key]));
  }

  const widthMatch = htmlContent.match(/width:\s*(\d+)px/);
  const heightMatch = htmlContent.match(/height:\s*(\d+)px/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 800;
  const height = heightMatch ? parseInt(heightMatch[1]) : 600;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width, height });
    await page.setContent(finalHtml, { waitUntil: 'load', timeout: 25000 });
    await new Promise(resolve => setTimeout(resolve, 400));
    return await page.screenshot({ fullPage: false });
  } finally {
    await page.close().catch(() => {});
  }
}

// Images are made one at a time so the small free server never runs out of memory
function generateImage(htmlContent, data) {
  const job = queue.then(() => renderOnce(htmlContent, data));
  queue = job.catch(() => {});
  return job;
}

module.exports = { generateImage };