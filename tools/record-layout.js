// Records a page's layout as a fixture for the checker: opens a URL at a width in a headless browser, runs src/page-adapter.js,
// and writes tests/fixtures/layout-<name>-<W>.json (the same format as the other fixtures, with `grid` strings).
//   node tools/record-layout.js http://localhost:8765/demo/index.html --width 910 --name demo
//   node tools/record-layout.js <url> --width 700,910,1440,1920 --name mysite --options '{"headings":"h2","cards":".card"}'
// Needs Playwright (a dev dependency, only for this script):  npm install   then   npx playwright install chromium
// Or use a Chromium you already have:  --browser /path/to/chrome-headless-shell
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not installed. Run:  npm install  and then  npx playwright install chromium'); process.exit(2); }

const args = process.argv.slice(2); let url = null, widths = [910], name = 'page', options = {}, height = 900, exe;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--width') widths = args[++i].split(',').map(Number);
  else if (args[i] === '--name') name = args[++i];
  else if (args[i] === '--height') height = +args[++i];
  else if (args[i] === '--browser') exe = args[++i];
  else if (args[i] === '--options') options = JSON.parse(args[++i]);
  else if (!url) url = args[i];
}
if (!url || widths.some(w => !(w > 0)) || !/^[\w-]+$/.test(name)) { console.error('usage: node tools/record-layout.js <url> [--width 700,910] [--name demo] [--options \'{"headings":"h2"}\']'); process.exit(2); }

(async () => {
  const browser = await chromium.launch(exe ? { executablePath: exe } : {}), adapter = fs.readFileSync(path.join(__dirname, '..', 'src', 'page-adapter.js'), 'utf8');
  let failed = 0;
  for (const W of widths) {
    const page = await browser.newPage({ viewport: { width: W, height } });
    await page.goto(url, { waitUntil: 'load' });
    await page.addScriptTag({ content: adapter });
    const res = await page.evaluate(async opts => { await StitchVinesAdapter.ready(); const ctx = StitchVinesAdapter.measure(opts); return { ok: ctx.ok, notes: ctx.notes, layout: StitchVinesAdapter.snapshot(ctx), width: document.documentElement.clientWidth }; }, options);
    await page.close();
    res.notes.forEach(n => console.log('  note: ' + n));
    if (!res.ok) { console.error(`${W} px: not recorded (${res.notes.join('; ') || 'no sections'})`); failed++; continue; }
    if (res.width !== W) console.log(`  note: the page width is ${res.width}, not ${W} (a scrollbar?); the layout was recorded at ${res.width}`);
    const L = res.layout, file = path.join(__dirname, '..', 'tests', 'fixtures', `layout-${name}-${W}.json`);
    fs.writeFileSync(file, JSON.stringify(L));
    console.log(`${W} px: ${L.heads.length} sections, u ${L.u.toFixed(3)}, m ${L.m}, ${L.grid.length} rows -> ${path.relative(process.cwd(), file)}`);
  }
  await browser.close(); process.exit(failed ? 1 : 0);
})();
