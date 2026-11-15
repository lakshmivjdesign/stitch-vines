// A contact sheet: three looks x four inks on the portfolio example (white is shown on a dark page). For looking.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), out = [];
  for (const look of ['cross', 'charcoal', 'pencil']) for (const ink of ['white', 'indigo', 'terracotta', 'charcoal']) {
    const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await p.goto(`http://127.0.0.1:8790/examples/portfolio.html?look=${look}&ink=${ink}${ink === 'white' ? '&bg=dark' : ''}`, { waitUntil: 'load' });
    await p.waitForFunction(() => ['ready', 'none', 'error'].includes(window.stitchVines.status.state)); await p.waitForTimeout(800);
    const f = `/tmp/shots/ink-${look}-${ink}.png`; await p.screenshot({ path: f, clip: { x: 0, y: 100, width: 330, height: 640 } }); out.push(f); await p.context().close(); }
  await b.close(); console.log(out.join('\n')); })();
