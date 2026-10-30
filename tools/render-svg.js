// Draws a recorded layout and the vines grown on it as an SVG, so the result can be looked at without a browser or a website.
//   node tools/render-svg.js 910 docs/example-910.svg
const fs = require('fs'), path = require('path');
const { loadCtx, run } = require('../tests/harness.js');
const W = +process.argv[2] || 910, out = process.argv[3] || 'example.svg', Z = 4;
const ctx = loadCtx(W), res = run(path.join(__dirname, '..', 'src', 'vine-grow.js'), ctx);
const cs = ctx.cStart, ce = ctx.cEnd, r1 = Math.ceil(ctx.foot / ctx.u) + 14, r0 = Math.max(0, Math.floor(ctx.top / ctx.u) - 3), svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${(ce - cs) * Z}" height="${(r1 - r0) * Z}" viewBox="0 0 ${(ce - cs) * Z} ${(r1 - r0) * Z}"><rect width="100%" height="100%" fill="#eee8da"/>`);
for (let r = r0; r < r1; r++) { let c = cs; while (c < ce) { const k = ctx.cell(c, r); if (!k) { c++; continue; } let e = c; while (e < ce && ctx.cell(e, r) === k) e++; svg.push(`<rect x="${(c - cs) * Z}" y="${(r - r0) * Z}" width="${(e - c) * Z}" height="${Z}" fill="${k === 2 ? '#cdc8bc' : '#e2dccf'}"/>`); c = e; } }
const path2 = (pl, col, w) => `<polyline fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" points="${pl.map(p => ((p[0] - cs + .5) * Z).toFixed(1) + ',' + ((p[1] - r0 + .5) * Z).toFixed(1)).join(' ')}"/>`;
res.limbs.forEach(l => { svg.push(path2(l.head.concat(l.stem, l.tail), '#1e6432', 1.6)); l.organs.forEach(o => o.polys.forEach(p => svg.push(path2(p, o.kind === 'leaf' ? '#28963f' : '#1e5ac8', 1.3)))); });
svg.push('</svg>'); fs.writeFileSync(out, svg.join('\n')); console.log('wrote', out, `(${res.limbs.length} limbs)`);
