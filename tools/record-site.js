// Records the LAYOUT of a public page for the test set. One load per site; the width is changed by resizing the window.
// Only geometry is kept: a grid of free (0) / text (1) / object (2) cells at three stitch sizes. No words, no pictures, no cookies, no logins.
//   node tools/record-site.js <url> --name wikipedia [--widths 700,910,1024,1440,1920]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { chromium } = require('playwright');
const args = process.argv.slice(2); let url = null, name = null, widths = [700, 910, 1024, 1440, 1920];
for (let i = 0; i < args.length; i++) { if (args[i] === '--name') name = args[++i]; else if (args[i] === '--widths') widths = args[++i].split(',').map(Number); else if (!url) url = args[i]; }
if (!url || !/^[\w-]+$/.test(name || '')) { console.error('usage: node tools/record-site.js <url> --name site'); process.exit(2); }
const adapter = fs.readFileSync(path.join(__dirname, '..', 'src', 'page-adapter.js'), 'utf8');
const USIZES = [6.5, 5.5, 4.5];
(async () => {
  const browser = await chromium.launch(), ctxB = await browser.newContext({ bypassCSP: true, viewport: { width: widths[0], height: 900 } }), page = await ctxB.newPage();   // bypassCSP: only so this recorder can inject the adapter into pages with a strict policy
  try { await page.goto(url, { waitUntil: 'load', timeout: 45000 }); } catch (e) { console.log(name + ': could not load (' + e.message.split('\n')[0].slice(0, 80) + ')'); await browser.close(); process.exit(1); }
  await page.addScriptTag({ content: adapter });
  // a read-only scroll to the bottom and back, so images that load on scroll have their size
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < Math.min(h, 12000); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  for (const W of widths) {
    await page.setViewportSize({ width: W, height: 900 }); await page.waitForTimeout(500);
    const res = await page.evaluate(async () => { await StitchVinesAdapter.ready(3000); const s = StitchVinesAdapter.scan(), mg = StitchVinesAdapter.margins(s); return { s, mg }; });
    const { s, mg } = res, m = Math.max(0, Math.floor(Math.min(mg.left, mg.right)));
    const rec = await page.evaluate(({ s, m, US }) => US.map(u => { const g = StitchVinesAdapter.rasterize(s, u, m); return { u: g.u, uWanted: u, m, C: g.C, c0: g.c0, R: g.R, grid: g.grid }; }), { s, m, US: USIZES });
    const out = { name, url, W, docH: s.docH, vh: s.vh, top: s.top, foot: s.foot, margins: { left: mg.left, right: mg.right, fullBleedRows: mg.fullBleedRows }, notes: s.notes, problems: s.problems, counts: { text: s.text.length, objs: s.objs.length }, v: rec };
    fs.writeFileSync(path.join(__dirname, '..', 'tests', 'sites', `${name}-${W}.json.gz`), zlib.gzipSync(JSON.stringify(out)));
    console.log(`${name} ${W}: height ${Math.round(s.docH)}, margins ${Math.round(mg.left)}/${Math.round(mg.right)} px, ${s.text.length} text boxes, ${s.objs.length} objects${s.problems.length ? ', PROBLEM: ' + s.problems[0] : ''}`);
  }
  await browser.close();
})();
