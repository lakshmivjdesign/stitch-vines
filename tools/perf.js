// Measures the one-file build in a real browser at five widths: time to measure, grow and draw (normal and 4x slower CPU, a mid phone proxy),
// layout shift, whether anything on the page moved, JS errors, data size, and scroll smoothness with and without the vines.
//   node tools/perf.js [blog|portfolio ...]      needs: python3 -m http.server 8790 --bind 127.0.0.1   (from the repo folder)
const { chromium } = require('playwright');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['blog', 'portfolio'], WIDTHS = [700, 910, 1024, 1440, 1920];
async function one(b, page, W, slow, off) {
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(o => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); if (o) window.StitchVinesConfig = { auto: false }; else window.StitchVinesConfig = { cache: false }; }, off);
  const cdp = await ctx.newCDPSession(p); if (slow) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(`http://127.0.0.1:8790/examples/${page}.html`, { waitUntil: 'load' });
  const pos = () => p.evaluate(() => [...document.querySelectorAll('h1,h2,figure,.card,footer')].map(e => Math.round(e.getBoundingClientRect().top + scrollY)).join(','));
  const before = await pos(); let st = null;
  if (!off) { await p.waitForFunction(() => ['ready', 'none', 'error'].includes(window.stitchVines.status.state), null, { timeout: 90000 }); await p.waitForTimeout(700); st = await p.evaluate(() => ({ s: window.stitchVines.status, t: window.stitchVines.stats })); }
  const after = await pos();
  const fps = await p.evaluate(() => new Promise(res => { const ts = []; let n = 0; const step = t => { ts.push(t); window.scrollBy(0, 30); if (++n < 90) requestAnimationFrame(step); else { const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); res({ mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), p95: +d[Math.floor(d.length * .95)].toFixed(1), slow: d.filter(x => x > 25).length }); } }; requestAnimationFrame(step); }));
  const cls = await p.evaluate(() => window.__cls); await ctx.close();
  return { st, moved: before !== after, cls: +cls.toFixed(4), errs, fps };
}
(async () => {
  const b = await chromium.launch(), rows = [];
  for (const page of pages) for (const W of WIDTHS) { const base = await one(b, page, W, false, true), fast = await one(b, page, W, false, false), slow = await one(b, page, W, true, false);
    const r = { page, W, state: fast.st.s.state, vines: (fast.st.s.message.match(/Grew (\d+)/) || [])[1] || '0', measureMs: fast.st.t.measureMs, growMs: fast.st.t.growMs, drawMs: fast.st.t.drawMs, slowGrowMs: slow.st.t.growMs, slowMeasureMs: slow.st.t.measureMs, bytes: fast.st.t.cacheBytes || 0, cls: Math.max(fast.cls, slow.cls), moved: fast.moved || slow.moved, errors: fast.errs.concat(slow.errs).length, fpsOff: base.fps, fpsOn: fast.fps };
    rows.push(r); console.log(`${page} ${W}: ${r.state} ${r.vines} vines | measure ${r.measureMs} grow ${r.growMs} draw ${r.drawMs} ms | 4x slower: measure ${r.slowMeasureMs} grow ${r.slowGrowMs} ms | ${(r.bytes / 1024).toFixed(0)} KB | CLS ${r.cls} moved ${r.moved} errors ${r.errors} | scroll frame ms mean ${r.fpsOff.mean}->${r.fpsOn.mean}, p95 ${r.fpsOff.p95}->${r.fpsOn.p95}, >25ms ${r.fpsOff.slow}->${r.fpsOn.slow}`); }
  require('fs').writeFileSync('/tmp/perf.json', JSON.stringify(rows, null, 1)); await b.close();
})();
