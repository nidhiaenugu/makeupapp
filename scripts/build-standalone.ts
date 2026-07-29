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
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'dist/glowmatch.html');

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

async function main() {
const js = await bundle();

const html = `<title>GlowMatch — find products that suit you</title>

<div class="topbar">
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

<style>${css}</style>
<script>
// Restore the saved theme before first paint so there is no flash.
try { var t = localStorage.getItem('gm-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
</script>
<nav class="tabbar" id="tabs" aria-label="Sections"></nav>
<script>${js}</script>
`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html, 'utf8');

const kb = (n: number) => `${Math.round(n / 1024)} KB`;
console.log(`Wrote ${outFile}`);
console.log(`  bundle ${kb(js.length)} · page ${kb(html.length)} · self-contained, no network calls`);
}

void main();
