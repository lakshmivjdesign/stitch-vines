const { chromium } = require('playwright');
(async () => {
  const [page, W, look] = [process.argv[2] || 'blog', +process.argv[3] || 1440, process.argv[4] || 'cross'];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await p.goto(`http://127.0.0.1:8790/examples/${page}.html?look=${look}`, { waitUntil: 'load' });
  const before = await p.evaluate(() => [document.documentElement.scrollHeight, [...document.querySelectorAll('h1,h2,figure,.card,footer')].map(e => Math.round(e.getBoundingClientRect().top + scrollY))]);
  await p.evaluate(l => { if (l !== 'cross') window.stitchVines.config.look = l; }, look);
  const t0 = Date.now(); await p.waitForFunction(() => ['ready', 'none', 'error'].includes(window.stitchVines.status.state), null, { timeout: 60000 });
  const st = await p.evaluate(() => ({ status: window.stitchVines.status, stats: window.stitchVines.stats }));
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => [document.documentElement.scrollHeight, [...document.querySelectorAll('h1,h2,figure,.card,footer')].map(e => Math.round(e.getBoundingClientRect().top + scrollY)), window.__cls, (() => { const s = document.getElementById('stitch-vines-layer'); return s ? { aria: s.getAttribute('aria-hidden'), pe: getComputedStyle(s).pointerEvents, z: getComputedStyle(s).zIndex } : null; })()]);
  console.log(JSON.stringify({ page, W, look, state: st.status.state, msg: st.status.message, waitedMs: Date.now() - t0, stats: st.stats, heightBefore: before[0], heightAfter: after[0], moved: JSON.stringify(before[1]) !== JSON.stringify(after[1]), cls: after[2], layer: after[3], errors: errs }));
  await p.screenshot({ path: `/tmp/shots/${page}-${W}-${look}.png`, fullPage: true });
  await b.close();
})();
