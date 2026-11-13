// Draws the vines the generator grows on a recorded layout, over a grey sketch of the page (text light, objects darker). For looking, not for the product.
//   node tools/render-site.js wikipedia 1440 out.png [--v 1] [--rows 0-900] [--scale 0.5]
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const { read, ctxOf, list } = require('../tests/sites.js'), { run } = require('../tests/harness.js');
const a = process.argv.slice(2), [name, W, outFile] = a; let vi = 0, rows = null, scale = .5, file = path.join(__dirname, '..', 'dist', 'vine-grow.js');
for (let i = 3; i < a.length; i++) { if (a[i] === '--v') vi = +a[++i]; else if (a[i] === '--rows') rows = a[++i].split('-').map(Number); else if (a[i] === '--scale') scale = +a[++i]; else if (a[i] === '--file') file = a[++i]; }
const f = list().find(x => x.name === name && x.W == W); if (!f) { console.error('no such layout'); process.exit(2); }
const ctx = ctxOf(read(f.file), vi), out = run(file, ctx), u = ctx.u, m = ctx.m;
const r0 = rows ? rows[0] : 0, r1 = rows ? rows[1] : ctx.grid.length, X = c => (m + c * u), Y = r => (r - r0) * u;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ctx.W * scale}" height="${(r1 - r0) * u * scale}" viewBox="0 0 ${ctx.W} ${(r1 - r0) * u}"><rect width="100%" height="100%" fill="#fbf7ee"/>`;
for (let r = r0; r < Math.min(r1, ctx.grid.length); r++) { const row = ctx.grid[r]; let c = 0; while (c < row.length) { const k = row[c]; if (k === '0') { c++; continue; } let d = c; while (d < row.length && row[d] === k) d++; svg += `<rect x="${X(ctx.c0 + c)}" y="${Y(r)}" width="${(d - c) * u}" height="${u}" fill="${k === '1' ? '#bbb' : '#777'}" opacity="${k === '1' ? .55 : .7}"/>`; c = d; } }
const line = (pl, col, w) => { const pts = pl.filter(p => p[1] >= r0 - 20 && p[1] <= r1 + 20); if (pts.length < 2) return ''; return `<polyline fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" points="${pl.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ')}"/>`; };
(out.limbs || []).forEach(l => { svg += line(l.head.concat(l.stem, l.tail), '#1d6b4f', 2.2); l.organs.forEach(o => o.polys.forEach(p => { svg += line(p, o.kind === 'leaf' ? '#2e8b57' : '#3b5bdb', 1.6); })); });
svg += '</svg>';
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: Math.ceil(ctx.W * scale), height: Math.ceil((r1 - r0) * u * scale) }, deviceScaleFactor: 1 }); await p.setContent(svg); await p.screenshot({ path: outFile }); await b.close();
  console.log(`${name} ${W}: ${(out.limbs || []).length} limbs, ${out.ms} ms -> ${outFile}`); })();
