/**
 * Builds a self-contained single-file version of GlowMatch.
 *
 * Bundles `src/standalone/app.ts` — which imports the real engine and catalog —
 * with esbuild, then inlines the JS and CSS into one HTML file that runs with
 * no network access at all. Output: `dist/glowmatch.html`.
 *
 * Run with `npm run build:standalone`.
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(root, 'dist');
const outFile = resolve(distDir, 'glowmatch.html');
const iconsDir = resolve(root, 'assets/icons');

const APP_NAME = 'GlowMatch';
const APP_DESCRIPTION = 'Find makeup, skincare and haircare products that suit you.';

async function bundle(): Promise<string> {
  const result = await build({
    entryPoints: [resolve(root, 'src/standalone/app.ts')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    platform: 'browser',
    write: false,
    legalComments: 'none',
    alias: { '@': resolve(root, 'src') },
  });
  return result.outputFiles[0]!.text;
}

/**
 * Design tokens.
 *
 * Ground is a near-black with a violet bias (lacquer, not neutral black) and a
 * warm off-white with a faint rose bias — neutrals chosen to sit under a
 * carmine accent rather than inherited greys. Semantic sage and amber are kept
 * deliberately separate from the accent so "good" never reads as "brand".
 */
const css = String.raw`
:root {
  --ground: #faf7f5;
  --surface: #ffffff;
  --sunk: #f2ecea;
  --rule: #e7dbd7;
  --ink: #241d21;
  --ink-soft: #7a6a70;
  --accent: #a8365a;
  --accent-wash: #fbeaf0;
  --on-accent: #ffffff;
  --good: #3d7d5f;
  --caution: #9a5a1c;
  --lift: 0 1px 2px rgba(36, 29, 33, .05), 0 10px 28px -18px rgba(36, 29, 33, .35);

  --display: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif;
  --body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --ground: #16121a;
    --surface: #211b26;
    --sunk: #2b2331;
    --rule: #392f40;
    --ink: #f2eaef;
    --ink-soft: #a396ad;
    --accent: #f0899f;
    --accent-wash: #35202a;
    --on-accent: #1b1116;
    --good: #7cc9a1;
    --caution: #e2a463;
    --lift: 0 1px 2px rgba(0,0,0,.45), 0 10px 28px -18px rgba(0,0,0,.8);
  }
}

:root[data-theme='dark'] {
  --ground: #16121a;
  --surface: #211b26;
  --sunk: #2b2331;
  --rule: #392f40;
  --ink: #f2eaef;
  --ink-soft: #a396ad;
  --accent: #f0899f;
  --accent-wash: #35202a;
  --on-accent: #1b1116;
  --good: #7cc9a1;
  --caution: #e2a463;
  --lift: 0 1px 2px rgba(0,0,0,.45), 0 10px 28px -18px rgba(0,0,0,.8);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--body);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
}

h1, h2, h3 { font-family: var(--display); font-weight: 600; line-height: 1.15; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(1.75rem, 6vw, 2.4rem); letter-spacing: -.015em; }
h2 { font-size: 1.2rem; }
h3 { font-size: 1.05rem; }
p { margin: 0; }
a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
h3 a, h1 a { color: inherit; text-decoration: none; }

.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: .85em; }
.muted { color: var(--ink-soft); }
.small { font-size: .85rem; }

.eyebrow {
  font-size: .7rem; text-transform: uppercase; letter-spacing: .14em;
  color: var(--accent); font-weight: 700;
}

/* --- shell --------------------------------------------------------------- */

.topbar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: .75rem;
  padding: .7rem 1.1rem;
  background: color-mix(in srgb, var(--ground) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--rule);
}
.wordmark { font-family: var(--display); font-size: 1.15rem; font-weight: 600; letter-spacing: -.02em; color: inherit; text-decoration: none; }
.wordmark i { color: var(--accent); font-style: normal; }

.themebtn {
  margin-left: auto; display: grid; place-items: center;
  width: 34px; height: 34px; border-radius: 50%; padding: 0;
  border: 1px solid var(--rule); background: var(--surface); color: var(--ink-soft);
  cursor: pointer;
}

#view {
  max-width: 680px; margin: 0 auto;
  padding: 1.35rem 1.1rem calc(5.5rem + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 1.35rem;
}

/* Bottom tab bar: thumb-reachable, which is where a phone app's nav belongs. */
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  display: flex; justify-content: center; gap: .1rem;
  padding: .4rem .5rem calc(.4rem + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--ground) 92%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--rule);
  overflow-x: auto; scrollbar-width: none;
}
.tabbar::-webkit-scrollbar { display: none; }
.tab {
  flex: 1 1 auto; text-align: center; max-width: 7rem; padding: .5rem .5rem; border-radius: 9px;
  font-size: .76rem; font-weight: 600; text-decoration: none;
  color: var(--ink-soft); white-space: nowrap;
}
.tab.is-on { color: var(--accent); background: var(--accent-wash); }

/* --- primitives ---------------------------------------------------------- */

.card {
  background: var(--surface); border: 1px solid var(--rule);
  border-radius: 14px; padding: 1.15rem; box-shadow: var(--lift);
  display: flex; flex-direction: column; gap: .8rem;
}
.card--tight { gap: .5rem; padding: 1rem; }
.card--empty { align-items: center; text-align: center; gap: .9rem; padding: 2rem 1.2rem; }
.card--filters { gap: .6rem; }

.stack { display: flex; flex-direction: column; gap: .85rem; }
.head { display: flex; flex-direction: column; gap: .45rem; }
.hero { display: flex; flex-direction: column; gap: .8rem; }
.lede { font-size: 1.02rem; color: var(--ink-soft); max-width: 60ch; }
.micro { font-size: .8rem; color: var(--ink-soft); }
.row { display: flex; gap: .6rem; align-items: center; }
.row--wrap { flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: .72rem 1.25rem; border-radius: 999px; border: 1px solid transparent;
  background: var(--accent); color: var(--on-accent);
  font: inherit; font-weight: 650; font-size: .95rem;
  text-decoration: none; cursor: pointer;
}
.btn--ghost { background: var(--surface); color: var(--ink); border-color: var(--rule); }
.btn:disabled { opacity: .4; cursor: not-allowed; }
.linkish {
  background: none; border: 0; padding: 0; font: inherit; font-size: .87rem;
  color: var(--ink-soft); text-decoration: underline; cursor: pointer;
}

.chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.chip {
  padding: .22rem .6rem; border-radius: 999px; background: var(--sunk);
  border: 1px solid var(--rule); font-size: .74rem; color: var(--ink-soft);
}

.input {
  width: 100%; padding: .7rem .85rem; border-radius: 10px;
  border: 1px solid var(--rule); background: var(--surface); color: var(--ink);
  font: inherit; font-size: 16px; /* 16px stops iOS zooming on focus */
}
.input--sm { flex: 1 1 140px; width: auto; font-size: .9rem; padding: .5rem .6rem; }
.range { width: 100%; accent-color: var(--accent); }

.brand { font-size: .7rem; text-transform: uppercase; letter-spacing: .1em; color: var(--ink-soft); font-weight: 700; }
.price { font-size: 1.05rem; }
.crumb { font-size: .8rem; color: var(--ink-soft); }
.subhead { font-size: .9rem; margin: .3rem 0 0; font-family: var(--body); font-weight: 700; }
.subhead--warn { color: var(--caution); }
.bullets { margin: 0; padding-left: 1.1rem; font-size: .92rem; display: flex; flex-direction: column; gap: .2rem; }

.rows { margin: 0; display: flex; flex-direction: column; gap: .4rem; font-size: .9rem; }
.rows div { display: flex; gap: .6rem; }
.rows dt { color: var(--ink-soft); min-width: 88px; }
.rows dd { margin: 0; }

/* --- the swatch motif ---------------------------------------------------- */

.chip-swatch {
  display: inline-block; border-radius: 50%; flex: 0 0 auto;
  border: 1px solid var(--rule);
}
.chip-swatch.is-on { border: 2px solid var(--accent); box-shadow: 0 0 0 3px var(--accent-wash); }

.ladder { display: flex; flex-wrap: wrap; gap: .4rem; }
.ladder__chip {
  width: 44px; height: 44px; border-radius: 11px; border: 1px solid var(--rule);
  cursor: pointer; padding: 0; transition: transform .12s ease;
}
.ladder__chip.is-on { border: 2px solid var(--accent); box-shadow: 0 0 0 3px var(--accent-wash); transform: scale(1.06); }

.shades { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .7rem; }
.shade { display: flex; align-items: center; gap: .55rem; }
.shade b { display: block; font-size: .85rem; font-weight: 600; }
.shade i { display: block; font-size: .74rem; color: var(--ink-soft); font-style: normal; }

.shadeline { display: flex; align-items: center; gap: .5rem; }
.shadeline--big { gap: .7rem; font-size: .92rem; padding-top: .8rem; border-top: 1px solid var(--rule); }

/* --- score ring ---------------------------------------------------------- */

.ring { position: relative; display: inline-grid; place-items: center; flex: 0 0 auto; }
.ring svg { position: absolute; inset: 0; }
.ring b { font-family: var(--mono); font-variant-numeric: tabular-nums; font-weight: 700; color: currentColor; }
.ring--strong { color: var(--good); }
.ring--good { color: var(--accent); }
.ring--partial { color: var(--ink-soft); }

/* --- quiz ---------------------------------------------------------------- */

.progress { height: 5px; border-radius: 999px; background: var(--sunk); overflow: hidden; }
.progress span { display: block; height: 100%; background: var(--accent); transition: width .25s ease; }

.field { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .5rem; }
.field + .field { padding-top: 1.15rem; border-top: 1px solid var(--rule); }
.field legend { font-weight: 700; font-size: .95rem; padding: 0; }

.pills { display: grid; grid-template-columns: 1fr; gap: .45rem; }
@media (min-width: 460px) { .pills { grid-template-columns: 1fr 1fr; } }
.pills--inline { display: flex; flex-wrap: wrap; }

.pill {
  display: flex; align-items: flex-start; gap: .55rem; text-align: left;
  padding: .7rem .8rem; border-radius: 12px;
  border: 1px solid var(--rule); background: var(--surface); color: inherit;
  font: inherit; cursor: pointer;
}
.pill.is-on { border-color: var(--accent); background: var(--accent-wash); }
.pill b { font-weight: 600; font-size: .93rem; }
.pill i { display: block; font-style: normal; font-size: .79rem; color: var(--ink-soft); margin-top: .1rem; }
.pill--slim { display: inline-flex; padding: .45rem .9rem; border-radius: 999px; font-size: .88rem; font-weight: 600; }
.pill--slim .pill__mark { display: none; }

.pill__mark {
  width: 17px; height: 17px; border-radius: 50%; border: 1px solid var(--rule);
  flex: 0 0 auto; margin-top: .15rem; position: relative;
}
.pill__mark--box { border-radius: 5px; }
.pill.is-on .pill__mark { background: var(--accent); border-color: var(--accent); }
.pill.is-on .pill__mark::after {
  content: '✓'; position: absolute; inset: 0; display: grid; place-items: center;
  color: var(--on-accent); font-size: 11px; font-weight: 700;
}

.priority {
  display: flex; flex-wrap: wrap; gap: .4rem; align-items: center;
  padding: .7rem .9rem; border-radius: 12px; background: var(--accent-wash);
  font-size: .83rem;
}
.priority b { font-family: var(--body); }
.priority span { color: var(--ink-soft); }

.prefs { display: flex; flex-direction: column; gap: .45rem; }
.pref {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .6rem .8rem; border-radius: 12px;
  border: 1px solid var(--rule); background: var(--surface);
}
.pref.is-on { border-color: var(--accent); background: var(--accent-wash); }
.pref__main { flex: 1 1 170px; text-align: left; background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; }
.pref__main b { font-weight: 600; font-size: .92rem; }
.pref__main i { display: block; font-style: normal; font-size: .78rem; color: var(--ink-soft); }
.pref__must {
  padding: .3rem .7rem; border-radius: 999px; font: inherit; font-size: .74rem; font-weight: 600;
  border: 1px solid var(--rule); background: transparent; color: var(--ink-soft); cursor: pointer; white-space: nowrap;
}
.pref__must.is-on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

.quiznav { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
.quiznav .linkish { margin-left: auto; }

/* --- results ------------------------------------------------------------- */

.card--rec { gap: .65rem; }
.rec__top { display: flex; gap: .8rem; align-items: flex-start; }
.rec__id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .15rem; }

.heart {
  flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid var(--rule); background: var(--surface); color: var(--ink-soft);
  cursor: pointer; font-size: 1rem; line-height: 1; padding: 0;
}
.heart.is-on { color: var(--accent); background: var(--accent-wash); border-color: var(--accent); }

.reasons { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .32rem; }
.reasons li { display: flex; gap: .45rem; font-size: .88rem; align-items: baseline; }
.reasons li span { flex: 0 0 auto; }
.reasons .good span { color: var(--good); }
.reasons .bad { color: var(--caution); }
.reasons em { margin-left: auto; font-style: normal; color: var(--ink-soft); font-size: .78rem; }
.warn { display: flex; gap: .45rem; font-size: .85rem; color: var(--caution); }

.note {
  border: 1px solid var(--rule); border-left: 3px solid var(--accent);
  border-radius: 12px; padding: .85rem 1rem; background: var(--surface);
  font-size: .87rem; display: flex; flex-direction: column; gap: .3rem;
}
.note--warn { border-left-color: var(--caution); }
.note ul { margin: 0; padding-left: 1.05rem; color: var(--ink-soft); display: flex; flex-direction: column; gap: .2rem; }
.note p { color: var(--ink-soft); }

.card--fit { gap: .7rem; }
.fit__top { display: flex; gap: .9rem; align-items: center; }

/* --- routine ------------------------------------------------------------- */

.slot { font-size: 1.25rem; }
.routine { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .8rem; }
.card--step { flex-direction: row; gap: .8rem; align-items: flex-start; }
.stepno {
  width: 28px; height: 28px; border-radius: 50%; flex: 0 0 auto;
  background: var(--accent-wash); color: var(--accent);
  display: grid; place-items: center; font-weight: 700; font-size: .82rem;
  font-family: var(--mono);
}
.step__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .15rem; }
.step__aside { display: flex; flex-direction: column; align-items: center; gap: .45rem; }
.guidance { font-size: .87rem; margin-top: .25rem; }

/* --- footer -------------------------------------------------------------- */

.legal {
  border-top: 1px solid var(--rule); padding-top: 1rem; margin-top: .5rem;
  font-size: .76rem; color: var(--ink-soft); display: flex; flex-direction: column; gap: .4rem;
}

/* --- a11y ---------------------------------------------------------------- */

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
`;

/**
 * Manifest for "Add to Home Screen" on Android/Chrome. Referenced as a
 * relative link, so it resolves against wherever index.html is actually
 * served from — this is what's missing for local file:// use is fine to
 * lose, since a manifest and an installable app only mean anything once
 * the page has a real origin.
 */
function manifestJson() {
  return JSON.stringify(
    {
      name: `${APP_NAME} — find products that suit you`,
      short_name: APP_NAME,
      description: APP_DESCRIPTION,
      id: '.',
      start_url: '.',
      scope: '.',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#faf7f5',
      theme_color: '#faf7f5',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  );
}

/**
 * A minimal offline cache. Once someone opens the installed app once, this
 * lets it keep launching without a network — the same "no network calls"
 * property the single-file build already has, extended to the hosted PWA.
 */
function serviceWorkerJs() {
  return `const CACHE = 'glowmatch-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
`;
}

async function main() {
  const js = await bundle();

  const body = `<div class="topbar">
  <a class="wordmark" href="#/home">Glow<i>Match</i></a>
  <button class="themebtn" data-theme-toggle aria-label="Switch between light and dark">
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/>
    </svg>
  </button>
</div>

<main id="view"></main>

<footer class="legal" style="max-width:680px;margin:0 auto;padding:0 1.1rem calc(5.5rem + env(safe-area-inset-bottom))">
  <p>Cosmetic guidance only, not medical advice. See a dermatologist or GP for persistent skin
  and scalp conditions, and patch-test new actives.</p>
  <p>Prices and formulations are approximate and change often — check the retailer before buying.
  Not affiliated with any brand listed. Your answers stay on this device.</p>
</footer>

<nav class="tabbar" id="tabs" aria-label="Sections"></nav>
<script>${js}</script>`;

  // A real document, not a bare fragment: without an explicit <head>, there
  // is nowhere reliable to put the viewport meta tag, which is what was
  // causing the "zoomed out" layout on iPhone — no viewport tag means Safari
  // assumes a 980px desktop page and shrinks it to fit the screen.
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${APP_NAME} — find products that suit you</title>
<meta name="description" content="${APP_DESCRIPTION}">

<meta name="theme-color" content="#faf7f5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#16121a" media="(prefers-color-scheme: dark)">

<!-- Add to Home Screen: iOS reads its own meta tags rather than the manifest -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${APP_NAME}">
<meta name="mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="icon-32.png">
<link rel="manifest" href="manifest.json">

<style>${css}</style>
<script>
// Restore the saved theme before first paint so there is no flash.
try { var t = localStorage.getItem('gm-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
</script>
</head>
<body>
${body}
<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
</script>
</body>
</html>
`;

  mkdirSync(distDir, { recursive: true });
  writeFileSync(outFile, html, 'utf8');
  writeFileSync(resolve(distDir, 'manifest.json'), manifestJson(), 'utf8');
  writeFileSync(resolve(distDir, 'sw.js'), serviceWorkerJs(), 'utf8');
  for (const name of ['icon-192.png', 'icon-512.png', 'icon-32.png', 'apple-touch-icon.png']) {
    copyFileSync(resolve(iconsDir, name), resolve(distDir, name));
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;
  console.log(`Wrote ${outFile}`);
  console.log(`  bundle ${kb(js.length)} · page ${kb(html.length)} · self-contained, no network calls`);
  console.log('  + manifest.json, sw.js, icon-192.png, icon-512.png, icon-32.png, apple-touch-icon.png');
}

void main();
