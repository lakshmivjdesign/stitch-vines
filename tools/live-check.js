// Loads a PUBLIC page once per width, adds dist/stitch-vines.js the way PROMPT.md tells a person to, waits for the status and takes a viewport screenshot.
// For checking sites that were not in the test set. Read-only: nothing is submitted, nothing is stored. (bypassCSP only lets this test script inject the file.)
//   node tools/live-check.js <url> <name> [--look pencil] [--widths 910,1440]
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const a = process.argv.slice(2); const url = a[0], name = a[1]; let look = 'cross', widths = [910, 1440];
for (let i = 2; i < a.length; i++) { if (a[i] === '--look') look = a[++i]; else if (a[i] === '--widths') widths = a[++i].split(',').map(Number); }
const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'stitch-vines.js'), 'utf8');
(async () => {
  const b = await chromium.launch();
  for (const W of widths) {
    const ctx = await b.newContext({ bypassCSP: true, viewport: { width: W, height: 900 } }), p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    try { await p.goto(url, { waitUntil: 'load', timeout: 45000 }); } catch (e) { console.log(`${name} ${W}: could not load`); await ctx.close(); continue; }
    await p.evaluate(l => { window.StitchVinesConfig = { look: l, cache: false, auto: true }; }, look);
    const t0 = Date.now(); await p.addScriptTag({ content: src });
    try { await p.waitForFunction(() => window.stitchVines && ['ready', 'none', 'error'].includes(window.stitchVines.status.state), null, { timeout: 90000 }); } catch (e) { console.log(`${name} ${W}: no answer in 90 s`); }
    const st = await p.evaluate(() => window.stitchVines && ({ s: window.stitchVines.status, t: window.stitchVines.stats }));
    await p.waitForTimeout(800);
    await p.screenshot({ path: `/tmp/shots/live-${name}-${W}.png` });
    console.log(`${name} ${W}: ${st ? st.s.state : '?'} | ${st ? st.s.message.slice(0, 150) : ''} | total ${((Date.now() - t0) / 1000).toFixed(1)} s, grow ${st && st.t.growMs} ms | errors ${errs.length}`);
    await ctx.close();
  }
  await b.close();
})();
