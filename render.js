const puppeteer = require('puppeteer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

async function generateImage(htmlContent, data) {
  let finalHtml = htmlContent;
  for (const key in data) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    finalHtml = finalHtml.replace(placeholder, data[key]);
  }

  // Read the exact width/height declared in the template itself
  const widthMatch = htmlContent.match(/width:\s*(\d+)px/);
  const heightMatch = htmlContent.match(/height:\s*(\d+)px/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 800;
  const height = heightMatch ? parseInt(heightMatch[1]) : 600;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport({ width, height });
  await page.setContent(finalHtml, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await new Promise(resolve => setTimeout(resolve, 1500));

  const generatedDir = path.join(__dirname, 'generated');
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const filename = `${crypto.randomUUID()}.png`;
  const outputPath = path.join(generatedDir, filename);

  await page.screenshot({ path: outputPath, fullPage: false });
  await browser.close();

  console.log('Image generated:', filename, `(${width}x${height})`);
  return filename;
}

module.exports = { generateImage };