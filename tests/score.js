// Scores the generator on every recorded layout. A layout PASSES when the geometry checks 1 to 11 pass AND the vines are real
// (at least 2 limbs, a margin vine on both sides). It reports how many vines grew, how long it took, and why it gave up.
//   node tests/score.js                 all layouts, 4 at a time        node tests/score.js wikipedia 910   one site, one width
//   --file dist/vine-grow.js   --json out.json   --v 1 (use the 5.5 px variant)   --quiet
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { list, read, ctxOf, withVariants } = require('./sites.js'), { run } = require('./harness.js'), { check } = require('./check.js');
const args = process.argv.slice(2); let file = path.join(__dirname, '..', 'dist', 'vine-grow.js'), json = null, vi = 0, quiet = false, one = null; const pos = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--file') file = path.resolve(args[++i]); else if (args[i] === '--json') json = args[++i]; else if (args[i] === '--v') vi = +args[++i]; else if (args[i] === '--quiet') quiet = true; else if (args[i] === '--one') one = args[++i]; else pos.push(args[i]); }

function scoreOne(f) {
  const rec = read(f.file), row = { site: f.name, W: f.W, own: !!rec.own };
  try {
    const ctx = withVariants(rec); row.marginSt = +(ctx.m / ctx.u).toFixed(1);
    const out = run(file, ctx); row.u = +(out.u || ctx.u).toFixed(2); const cu = ctx.variants.find(v => v.u === out.u) || ctx; row.ms = out.ms; row.limbs = (out.limbs || []).length; row.rung = out.rung ?? null; row.status = out.status ? out.status.message : null;
    const sides = new Set((out.limbs || []).filter(l => l.kind === 'margin').map(l => l.side)); row.margins = [...sides].join('');
    const res = check(out, cu), bad = res.filter(r => !r.pass && r.id !== 12 && r.id !== 13);
    row.fail = bad.map(r => r.id).join(',');
    let fl = 0, lf = 0; (out.limbs || []).forEach(l => l.organs.forEach(o => { if (o.kind === 'leaf') lf++; else fl++; })); row.flowers = fl; row.leaves = lf; row.branches = (out.limbs || []).filter(l => l.kind !== 'margin').length;
    row.real = row.limbs >= 2 && sides.size === 2; row.geometry = bad.length === 0; row.pass = row.real && row.geometry;
    row.why = (out.status && !out.status.ok && out.status.message || '').slice(0, 160);
  } catch (e) { row.crash = String(e.message || e).split('\n')[0].slice(0, 90); row.pass = false; row.limbs = 0; }
  return row;
}
if (one) { const f = list().find(x => x.file === one); process.stdout.write(JSON.stringify(scoreOne(f)) + '\n'); process.exit(0); }

const files = list().filter(f => !pos.length || (pos.every(p => /^\d+$/.test(p)) ? pos.includes(String(f.W)) : pos.some(p => /^\d+$/.test(p) ? +p === f.W : f.name === p)) && (!pos.some(p => !/^\d+$/.test(p)) || pos.filter(p => !/^\d+$/.test(p)).includes(f.name)) && (!pos.some(p => /^\d+$/.test(p)) || pos.filter(p => /^\d+$/.test(p)).includes(String(f.W))));
const rows = []; let next = 0, running = 0;
function spawn() {
  while (running < 4 && next < files.length) { const f = files[next++]; running++;
    const c = cp.spawn(process.execPath, [__filename, '--one', f.file, '--file', file, '--v', String(vi)], { stdio: ['ignore', 'pipe', 'inherit'] }); let buf = '';
    c.stdout.on('data', d => buf += d); c.on('close', () => { running--; try { rows.push(JSON.parse(buf.trim().split('\n').pop())); } catch (e) { rows.push({ site: f.name, W: f.W, pass: false, limbs: 0, crash: 'worker died' }); } if (next >= files.length && !running) done(); else spawn(); }); }
}
function done() {
  rows.sort((a, b) => a.site < b.site ? -1 : a.site > b.site ? 1 : a.W - b.W);
  if (!quiet) rows.forEach(r => console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.site.padEnd(14)} ${String(r.W).padStart(4)} u${r.u ?? '-'} m${String(r.marginSt ?? '-').padStart(5)}st  ${String(r.limbs).padStart(3)} limbs (${r.branches ?? '-'} br, ${r.flowers ?? '-'} fl)  ${r.margins || '-'}  ${String(r.ms ?? '-').padStart(5)} ms${r.rung != null ? '  rung ' + r.rung : ''}${r.fail ? '  geometry FAIL ' + r.fail : ''}${r.crash ? '  CRASH ' + r.crash : ''}${r.why && !r.pass ? '  ' + r.why : ''}`));
  const by = {}; rows.forEach(r => { (by[r.site] = by[r.site] || []).push(r); });
  const tot = rows.length, ok = rows.filter(r => r.pass).length, own = rows.filter(r => r.own), ownOk = own.filter(r => r.pass).length;
  console.log(`\nSCORE ${ok}/${tot} layouts pass (${Math.round(100 * ok / tot)}%); her pages + demo ${ownOk}/${own.length}; sites with all 5 widths ${Object.values(by).filter(a => a.every(r => r.pass)).length}/${Object.keys(by).length}; zero vines ${rows.filter(r => !r.limbs).length}`);
  if (json) fs.writeFileSync(json, JSON.stringify(rows, null, 1));
}
spawn();
