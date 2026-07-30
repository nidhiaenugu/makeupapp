/**
 * One-off icon generator, run manually (not part of the build).
 *
 * Renders the app icon — a ring in the same style as the in-app match-score
 * badge, on the accent gradient — via headless Chromium and rasterises it at
 * every size the manifest and Apple touch-icon need. Output is committed as
 * static PNGs in assets/icons/ so the build script only ever copies files;
 * generating them at CI time would need a Chromium binary the Pages runner
 * doesn't have.
 *
 * Run with: node scripts/generate-icons.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/icons');

/**
 * Ring-and-dot mark: the same "match score" ring used throughout the app,
 * large and simplified, so the icon reads as *this app* rather than a
 * generic monogram. Kept inside a safe inner circle so Android's adaptive
 * masking (circle, squircle, rounded square) never clips it.
 */
function iconHtml(size) {
  const stroke = size * 0.09;
  const r = (size - stroke) / 2 - size * 0.06;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * 0.76;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
  </style></head><body>
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c1487a"/>
          <stop offset="100%" stop-color="#6e1f42"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(250,241,236,0.28)" stroke-width="${stroke}"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#faf1ec" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${filled} ${circumference}"
        transform="rotate(-90 ${c} ${c})"/>
      <circle cx="${c}" cy="${c}" r="${size * 0.1}" fill="#faf1ec"/>
    </svg>
  </body></html>`;
}

const sizes = [512, 192, 180, 32];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(iconHtml(size));
  const buffer = await page.screenshot({ omitBackground: false });
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeFileSync(resolve(outDir, name), buffer);
  console.log(`wrote ${name} (${size}x${size})`);
  await page.close();
}
await browser.close();
