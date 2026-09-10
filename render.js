const puppeteer = require('puppeteer');
const path = require('path');
const crypto = require('crypto');

async function generateImage(htmlContent, data) {
  let finalHtml = htmlContent;
  for (const key in data) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    finalHtml = finalHtml.replace(placeholder, data[key]);
  }

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 800, height: 1200 });
  await page.setContent(finalHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Give any images inside the page a moment to actually finish loading
  await new Promise(resolve => setTimeout(resolve, 1500));

  const filename = `${crypto.randomUUID()}.png`;
  const outputPath = path.join(__dirname, 'generated', filename);

  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();

  console.log('Image generated:', filename);
  return filename;
}

module.exports = { generateImage };