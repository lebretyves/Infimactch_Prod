import fs from 'node:fs';
import { chromium } from 'playwright';
// Render the existing vector logo at manifest sizes, without external image assets.
fs.mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>body{margin:0;background:white;display:grid;place-items:center;height:100vh}svg{width:80%;height:80%}</style>${fs.readFileSync('public/favicon.svg','utf8')}`);
  await page.screenshot({ path: `public/icons/icon-${size}.png` });
  await page.close();
}
await browser.close();
