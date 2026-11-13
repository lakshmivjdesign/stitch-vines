// Opens the studio page at 3 widths, switches look, changes a tweak, makes the zip, and checks the zip's contents. Needs the http server on 8790.
const { chromium } = require('playwright'), fs = require('fs'), cp = require('child_process');
(async () => {
  const b = await chromium.launch();
  for (const W of [390, 910, 1440]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, acceptDownloads: true }), p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8790/studio/index.html', { waitUntil: 'load' });
    await p.waitForFunction(() => window.stitchVines && ['ready', 'none', 'error'].includes(window.stitchVines.status.state), null, { timeout: 60000 });
    const s1 = await p.evaluate(() => window.stitchVines.status.message);
    await p.check('input[value=pencil]'); await p.waitForTimeout(500);
    const look = await p.evaluate(() => window.stitchVines.config.look);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    let zipInfo = '';
    if (W === 1440) { const [d] = await Promise.all([p.waitForEvent('download'), p.click('#dl')]); const f = '/tmp/kit.zip'; await d.saveAs(f); zipInfo = cp.execSync('unzip -l ' + f + ' | tail -n +4 | head -6').toString().replace(/\n/g, ' ; '); try { cp.execSync('unzip -tq ' + f); zipInfo += ' | zip test OK'; } catch (e) { zipInfo += ' | ZIP TEST FAILED'; } }
    await p.screenshot({ path: `/tmp/shots/studio-${W}.png` });
    console.log(`studio ${W}: status "${s1.slice(0, 60)}" | look after click ${look} | horizontal overflow ${overflow} | errors ${errs.length}${zipInfo ? ' | ' + zipInfo : ''}`);
    await ctx.close();
  }
  await b.close();
})();
