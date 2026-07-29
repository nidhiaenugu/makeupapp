import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
p.on('console', m => m.type()==='error' && errs.push(m.text()));
p.on('pageerror', e => errs.push('PAGEERROR: '+e.message));
p.on('request', r => { const u=r.url(); if(!u.startsWith('file:')&&!u.startsWith('data:')) errs.push('NETWORK: '+u); });

await p.goto('file://' + process.cwd() + '/dist/glowmatch.html');
await p.waitForTimeout(400);
console.log('H1:', await p.locator('h1').first().innerText());
console.log('tabs:', await p.locator('.tab').count());

// Run the quiz: skincare + makeup
await p.click('a[href="#/quiz"]'); await p.waitForTimeout(200);
await p.click('[data-set="categories"][data-v="skincare"]');
await p.click('[data-set="categories"][data-v="makeup"]');
console.log('step1:', await p.locator('.eyebrow').first().innerText());
await p.click('[data-step="1"]'); await p.waitForTimeout(150);
await p.click('[data-set="skinType"][data-v="oily"]');
await p.click('[data-set="undertone"][data-v="warm"]');
await p.click('[data-set="depth"][data-v="8"]');
console.log('depth chips:', await p.locator('.ladder__chip').count());
await p.screenshot({ path: '/tmp/gm-shot-skin.png', fullPage: true });
await p.click('[data-step="1"]'); await p.waitForTimeout(150);
await p.click('[data-set="concerns"][data-v="acne"]');
await p.click('[data-set="concerns"][data-v="hyperpigmentation"]');
await p.click('[data-set="concerns"][data-v="shade-match"]');
await p.click('[data-step="1"]'); await p.waitForTimeout(150);
await p.click('[data-must="fragrance-free"]');
await p.click('[data-step="1"]'); await p.waitForTimeout(150);
await p.click('[data-finish]'); await p.waitForTimeout(500);

console.log('RESULTS:', await p.locator('h1').first().innerText());
console.log('cards:', await p.locator('.card--rec').count());
console.log('top:', (await p.locator('.card--rec').first().innerText()).split('\n').slice(0,4).join(' | '));
await p.screenshot({ path: '/tmp/gm-shot-results.png', fullPage: false });

await p.click('a[href="#/routine"]'); await p.waitForTimeout(400);
console.log('routine steps:', await p.locator('.card--step').count());
await p.screenshot({ path: '/tmp/gm-shot-routine.png', fullPage: false });

// save + product detail
await p.click('a[href="#/browse"]'); await p.waitForTimeout(300);
await p.locator('.heart').first().click(); await p.waitForTimeout(200);
await p.click('a[href="#/saved"]'); await p.waitForTimeout(300);
console.log('saved:', await p.locator('.card--tight').count());
await p.locator('.card--tight h3 a').first().click(); await p.waitForTimeout(400);
console.log('product page fit ring:', await p.locator('.card--fit .ring b').first().innerText());

// dark theme
await p.click('[data-theme-toggle]'); await p.waitForTimeout(300);
console.log('theme:', await p.evaluate(()=>document.documentElement.dataset.theme));
await p.screenshot({ path: '/tmp/gm-shot-dark.png', fullPage: false });

// reload persistence
await p.reload(); await p.waitForTimeout(400);
console.log('after reload theme:', await p.evaluate(()=>document.documentElement.dataset.theme));

console.log('ERRORS:', errs.length ? errs : 'none');
await b.close();
