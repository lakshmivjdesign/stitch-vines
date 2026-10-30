// Automatic checker for stitch-vines. Run: node tests/check.js [910 1440 ...]
// It runs src/vine-grow.js on the recorded page layouts (tests/fixtures/layout-<W>.json) and fails on every rule that can be measured (docs/rules.md).
// It never looks at taste: only rules.  Checks 1-11 are the geometry of the plant and must pass (exit code 1 if one fails).
// Checks 12-13 are composition targets (how many branches, whether flowers appear): reported as WARN, and failing only with --strict.
//   node tests/check.js 910            one width (demo-910: a layout recorded with tools/record-layout.js)        --file other.js   a different generator       --json out.json   dump the stitches       --strict
const fs = require('fs'), path = require('path');
const { loadCtx, run } = require('./harness.js');

const MIN_R = 6.5, TOL = .95, JR_ORGAN = 6, JR_CHILD = 14, LEAN = [15, 45], DEG = 180 / Math.PI;
const key = (c, r) => c * 4096 + r;
const rast = (pl, f) => { for (let i = 0; i < pl.length - 1; i++) { const a = pl[i], b = pl[i + 1], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .35)); for (let j = 0; j <= k; j++) f(Math.round(a[0] + (b[0] - a[0]) * j / k), Math.round(a[1] + (b[1] - a[1]) * j / k)); } };
const cellsOfPolys = polys => { const s = new Map(); polys.forEach(pl => rast(pl, (c, r) => s.set(key(c, r), [c, r]))); return s; };
const resample = (pl, step = 1) => { const o = [pl[0]]; let acc = 0, need = step; for (let i = 1; i < pl.length; i++) { let a = pl[i - 1], b = pl[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); while (acc + d >= need && d > 0) { const t = (need - acc) / d; a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; o.push(a); d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0; need = step; } acc += d; } return o; };
const circ = (a, b, c) => { const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]), cr = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])); return cr < 1e-9 ? Infinity : ab * bc * ca / (2 * cr); };
const signedK = (a, b, c) => { const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), r = circ(a, b, c); return r === Infinity ? 0 : Math.sign(cr) / r; };
const angOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * DEG;

// Small objects (carousel chevrons, buttons) hide only their core; a vine may cross their padding. Same rule as in the generators: a connected object no bigger than 26 x 16 stitches is "soft" within 2 stitches of its edge.
function softCell(ctx) {
  const cs = ctx.cStart, ce = ctx.cEnd, NC = ce - cs, NR = Math.ceil(ctx.foot / ctx.u) + 14, m = new Uint8Array(NC * NR);
  for (let r = 0; r < NR; r++) for (let c = cs; c < ce; c++) m[r * NC + c - cs] = ctx.cell(c, r);
  const at = (c, r) => (c < cs || c >= ce || r < 0 || r >= NR) ? 0 : m[r * NC + c - cs], seen = new Uint8Array(NC * NR), soft = [];
  for (let r0 = 0; r0 < NR; r0++) for (let c0 = cs; c0 < ce; c0++) { const k0 = r0 * NC + c0 - cs; if (m[k0] !== 2 || seen[k0]) continue; const comp = [], q = [[c0, r0]]; let x0 = c0, x1 = c0, y0 = r0, y1 = r0; seen[k0] = 1;
    while (q.length) { const [c, r] = q.pop(); comp.push([c, r]); x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c2 = c + dc, r2 = r + dr; if (c2 < cs || c2 >= ce || r2 < 0 || r2 >= NR) continue; const k2 = r2 * NC + c2 - cs; if (m[k2] === 2 && !seen[k2]) { seen[k2] = 1; q.push([c2, r2]); } } }
    if (x1 - x0 + 1 <= 26 && y1 - y0 + 1 <= 16) comp.forEach(([c, r]) => { let edge = false; for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2; dx++) if (at(c + dx, r + dy) !== 2 && !(c + dx < cs || c + dx >= ce)) { edge = true; break; } if (edge) soft.push(r * NC + c - cs); }); }
  soft.forEach(k => { m[k] = 3; });
  return (c, r) => (c < cs || c >= ce || r < 0 || r >= NR) ? ctx.cell(c, r) : m[r * NC + c - cs];
}

function check(out, ctx0) {
  const ctx = Object.assign({}, ctx0, { cell: softCell(ctx0) });
  const res = [], add = (id, name, fails, info = '') => res.push({ id, name, pass: !fails.length, fails: fails.slice(0, 6), n: fails.length, info });
  const limbs = out.limbs || [], u = ctx.u, rowMin = Math.ceil(ctx.top / u) + 1, byId = new Map(limbs.map(l => [l.id, l]));
  const els = [];
  limbs.forEach(l => { l.stemPoly = (l.head || []).concat(l.stem, l.tail || []); l.stemEl = { limb: l, kind: 'stem', polys: [l.stemPoly], at: l.stem[0] }; els.push(l.stemEl);
    l.organs.forEach(o => { o.el = { limb: l, kind: 'organ', org: o, polys: o.polys, at: o.at }; els.push(o.el); }); });
  const owner = new Map(); els.forEach(e => { e.cells = cellsOfPolys(e.polys); e.cells.forEach((v, k) => { (owner.get(k) || owner.set(k, []).get(k)).push(e); }); });
  const allCells = new Map(); els.forEach(e => e.cells.forEach((v, k) => allCells.set(k, v)));
  const tag = e => e.limb.name + '/' + (e.kind === 'organ' ? e.org.kind : 'stem');

  // 1 gaps: a stitch of one element within one stitch of another element that it is not joined to
  { const f = [], seen = new Set(); const allowed = (e, g, c) => {
      if (e.limb === g.limb) { if (e.kind === g.kind) return false; const org = e.kind === 'organ' ? e : g; return Math.hypot(c[0] - org.at[0], c[1] - org.at[1]) <= JR_ORGAN; }
      const child = e.limb.parent === g.limb.id ? e : g.limb.parent === e.limb.id ? g : null; if (!child) return false;
      const par = child === e ? g : e; return child.kind === 'stem' && par.kind === 'stem' && Math.hypot(c[0] - child.limb.stem[0][0], c[1] - child.limb.stem[0][1]) <= JR_CHILD; };
    els.forEach(e => e.cells.forEach(([c, r]) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) (owner.get(key(c + dx, r + dy)) || []).forEach(g => { if (g === e || allowed(e, g, [c, r])) return;
      const a = e.limb.id + ':' + e.kind + (e.org ? e.limb.organs.indexOf(e.org) : ''), b = g.limb.id + ':' + g.kind + (g.org ? g.limb.organs.indexOf(g.org) : ''), k = a < b ? a + '|' + b : b + '|' + a; if (seen.has(k)) return; seen.add(k);
      f.push(`${tag(e)} touches ${tag(g)} at stitch (${c},${r})`); }); })); add(1, 'elements that are not joined never touch (one empty stitch)', f); }
  // 1b a stem never touches itself (away from its neighbours along the stroke)
  { const f = []; limbs.forEach(l => { const P = resample(l.stemPoly, .35), m = new Map(); P.forEach((p, i) => { const k = key(Math.round(p[0]), Math.round(p[1])); (m.get(k) || m.set(k, []).get(k)).push(i); });
      let bad = null; P.forEach((p, i) => { if (bad) return; const c = Math.round(p[0]), r = Math.round(p[1]); for (let dy = -1; dy <= 1 && !bad; dy++) for (let dx = -1; dx <= 1; dx++) for (const j of m.get(key(c + dx, r + dy)) || []) if (Math.abs(j - i) * .35 > 12) { bad = [c, r]; break; } });
      if (bad) f.push(`${l.name}: the stem comes back to touch itself at (${bad[0]},${bad[1]})`); }); add('1b', 'a stem never touches itself', f); }
  // 2 free ends: every limb ends in a spiral, a bud or a rose that is joined to the stem
  { const f = []; limbs.forEach(l => { const e = l.stem[l.stem.length - 1];
      if (l.term === 'spiral') { if (!l.tail || l.tail.length < 12) f.push(`${l.name}: no spiral at its end`); else if (Math.hypot(l.tail[0][0] - e[0], l.tail[0][1] - e[1]) > 1.2) f.push(`${l.name}: spiral not joined to the stem`); }
      else { const t = l.organs.find(o => o.role === 'terminal' && o.kind === l.term); if (!t) f.push(`${l.name}: ends in nothing (${l.term || 'bare end'})`); else if (Math.hypot(t.at[0] - e[0], t.at[1] - e[1]) > 1.2) f.push(`${l.name}: terminal ${t.kind} not at the stem end`); }
      if (l.head && l.head.length && Math.hypot(l.head[l.head.length - 1][0] - l.stem[0][0], l.head[l.head.length - 1][1] - l.stem[0][1]) > 1.2) f.push(`${l.name}: base spiral not joined to the stem`); }); add(2, 'every limb ends in a spiral, a bud or a rose (no free end)', f); }
  // 3 bends: no stem bend tighter than 6.5 stitches
  { const f = []; limbs.forEach(l => { const P = resample(l.stem, 1); let mn = Infinity, at = null; for (let i = 3; i < P.length - 3; i++) { const r = circ(P[i - 3], P[i], P[i + 3]); if (r < mn) { mn = r; at = P[i]; } }
      if (mn < MIN_R * TOL) f.push(`${l.name}: bend radius ${mn.toFixed(1)} at (${at[0].toFixed(0)},${at[1].toFixed(0)})`); l.minR = mn; }); add(3, 'no bend tighter than 6.5 stitches', f); }
  // 4 curves: each stem alternates convex and concave and is never a straight run; the spiral keeps turning the way the curve was turning and tightens
  { const f = []; limbs.forEach(l => { const P = resample(l.stem, 1); if (P.length < 8) return; const K = []; for (let i = 3; i < P.length - 3; i++) K.push(signedK(P[i - 3], P[i], P[i + 3]));
      let straight = 0, worst = 0; K.forEach((k, i) => { if (Math.abs(k) < 1 / 45 && !(l.parent != null && i < 10)) { straight++; worst = Math.max(worst, straight); } else straight = 0; });
      if (worst > 12) f.push(`${l.name}: a near-straight run of ${worst} stitches (a bend must be tighter than radius 45 at least every 12 stitches)`);
      let prev = 0, gap = 0; K.forEach(k => { const s = Math.abs(k) > 1 / 40 ? Math.sign(k) : 0; if (s) { if (prev && s === prev && gap > 6) f.push(`${l.name}: two ${s > 0 ? 'clockwise' : 'anticlockwise'} bends in a row`); prev = s; gap = 0; } else gap++; });
      if (l.tail && l.tail.length > 12) { const T = resample(l.tail, .8), rs = []; for (let i = 2; i < T.length - 2; i++) rs.push(circ(T[i - 2], T[i], T[i + 2])); const s0 = Math.sign(signedK(T[2], T[4], T[6])), sb = Math.sign(K.slice(-12).reduce((a, k) => a + k, 0));
        if (sb && s0 && sb !== s0) f.push(`${l.name}: the spiral turns against the curve before it`);
        if (rs[0] < MIN_R * TOL) f.push(`${l.name}: spiral starts at radius ${rs[0].toFixed(1)}`);
        for (let i = 1; i < rs.length; i++) if (rs[i] > rs[i - 1] * 1.25 + .3) { f.push(`${l.name}: spiral loosens again`); break; } } }); add(4, 'curves alternate, none straight; a spiral tightens the way the curve was turning', f); }
  // 5 children leave tangentially, then lean 15 to 45 degrees from the parent's growth direction
  { const f = []; limbs.filter(l => l.parent != null).forEach(l => { const par = byId.get(l.parent), P = resample(par.stem, 1); let bi = 0, bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p[0] - l.stem[0][0], p[1] - l.stem[0][1]); if (d < bd) { bd = d; bi = i; } });
      const t = angOf(P[Math.max(0, bi - 2)], P[Math.min(P.length - 1, bi + 2)]), S = resample(l.stem, 1);
      if (bd > 1.2) f.push(`${l.name}: starts ${bd.toFixed(1)} stitches from its parent`);
      const a10 = angDiff(angOf(S[0], S[Math.min(10, S.length - 1)]), t); if (a10 > 10.5) f.push(`${l.name}: first 10 stitches ${a10.toFixed(0)} degrees off its parent's tangent`);
      if (par.kind !== 'margin') { const lo = Math.max(0, bi), hi = Math.min(P.length - 3, bi + 20); let tc = 0, n = 0; for (let j = lo + 1; j < hi; j++) { tc += signedK(P[j - 1], P[j], P[j + 1]); n++; } tc /= Math.max(1, n); const cs = S.length > 14 ? signedK(S[2], S[7], S[12]) : 0; const first = signedK(S[Math.min(S.length - 3, 10)], S[Math.min(S.length - 2, 17)], S[Math.min(S.length - 1, 24)]); if (Math.abs(tc) > .012 && Math.sign(first) === Math.sign(tc) && Math.abs(first) > .004) f.push(`${l.name}: leans into the bend of its parent instead of away from it`); void cs; }
      const lean = angDiff(angOf(S[Math.min(10, S.length - 1)], S[Math.min(24, S.length - 1)]), t); l.lean = lean; if (lean < LEAN[0] - 1 || lean > LEAN[1] + 1) f.push(`${l.name}: leans ${lean.toFixed(0)} degrees (must be 15 to 45)`); }); add(5, 'branches leave their parent tangentially and lean 15-45 degrees', f); }
  // 6 every organ is joined to its stem
  { const f = []; limbs.forEach(l => { const S = resample(l.stemPoly, .5); l.organs.forEach(o => { let d = 1e9; S.forEach(p => { d = Math.min(d, Math.hypot(p[0] - o.polys[0][0][0], p[1] - o.polys[0][0][1])); }); if (d > .9) f.push(`${l.name}: ${o.kind} starts ${d.toFixed(1)} stitches off its stem`); }); }); add(6, 'every leaf, rose and bud is joined to its stem', f); }
  // 7 nothing above the buttons row, nothing outside the page
  { const f = []; let n1 = 0, n2 = 0; allCells.forEach(([c, r]) => { if (r < rowMin) { n1++; if (n1 < 3) f.push(`stitch above the buttons row at (${c},${r})`); } if (c < ctx.cStart || c >= ctx.cEnd || r >= ctx.R) { n2++; if (n2 < 3) f.push(`stitch outside the page at (${c},${r})`); } }); add(7, 'no stitch above the buttons row or outside the page', f, `top row ${rowMin}`); }
  // 8 flowers: at most a quarter of a rose or bud under words (or under a card)
  { const f = []; limbs.forEach(l => l.organs.filter(o => o.kind !== 'leaf').forEach(o => { let n = 0, w = 0, ob = 0; o.el.cells.forEach(([c, r]) => { n++; const k = ctx.cell(c, r); if (k === 1) w++; else if (k === 2) ob++; }); if (w / n > .25) f.push(`${l.name}: ${o.kind} ${(100 * w / n).toFixed(0)}% under words`); if (ob / n > .25) f.push(`${l.name}: ${o.kind} ${(100 * ob / n).toFixed(0)}% under a card`); })); add(8, 'a rose or bud has at most a quarter under words or cards', f); }
  // 9 hidden parts are middle parts only: the start and the end of a limb, its spiral and its organs are in the open
  { const f = []; const hid = p => ctx.cell(Math.round(p[0]), Math.round(p[1])) === 2;
    limbs.forEach(l => { const P = resample(l.stemPoly, 1), n = P.length; const first = P.slice(0, Math.min(8, n)), last = P.slice(Math.max(0, n - 8));
      if (first.some(hid)) f.push(`${l.name}: hidden at its start`); if (last.some(hid)) f.push(`${l.name}: hidden at its end`);
      if (l.tail && l.tail.length) { const T = resample(l.tail, 1); if (T.filter(hid).length > T.length * .1) f.push(`${l.name}: spiral under a card`); }
      let run1 = 0, seenHid = false; const vis = []; P.forEach(p => { if (hid(p)) { if (run1 && seenHid && run1 < 4) vis.push(run1); seenHid = true; run1 = 0; } else run1++; }); if (vis.length) f.push(`${l.name}: a visible stretch of ${vis[0]} stitches between two hidden ones`);
      l.organs.forEach(o => { if (hid(o.at)) f.push(`${l.name}: ${o.kind} attached on a hidden stretch`); let n2 = 0, h = 0; o.el.cells.forEach(([c, r]) => { n2++; if (ctx.cell(c, r) === 2) h++; }); if (h / n2 > .25) f.push(`${l.name}: ${o.kind} ${(100 * h / n2).toFixed(0)}% under a card`); });
      if (l.parent != null && hid(l.stem[0])) f.push(`${l.name}: leaves its parent from a hidden stretch`); }); add(9, 'hidden parts are middle parts only (never an end, a spiral, an organ or a start)', f); }
  // 10 leaves: at least 5, shrink toward the end, alternate, point the way the plant grows; roses smaller further out
  { const f = []; limbs.forEach(l => { const S = resample(l.stem, 1), arcOf = o => { let bi = 0, bd = 1e9; S.forEach((p, i) => { const d = Math.hypot(p[0] - o.at[0], p[1] - o.at[1]); if (d < bd) { bd = d; bi = i; } }); return bi; };
      const lv = l.organs.filter(o => o.kind === 'leaf').map(o => ({ o, s: arcOf(o) })).sort((a, b) => a.s - b.s);
      lv.forEach(({ o }) => { if (o.size < 5 - 1e-6) f.push(`${l.name}: a leaf of ${o.size.toFixed(1)} stitches`); });
      for (let i = 1; i < lv.length && l.kind !== 'margin'; i++) if (lv[i].o.size > lv[i - 1].o.size + 1.3) { f.push(`${l.name}: leaves grow larger toward the end`); break; }
      lv.forEach(({ o, s }) => { const t = angOf(S[Math.max(0, s - 2)], S[Math.min(S.length - 1, s + 2)]); if (angDiff(o.dir, t) > 80) f.push(`${l.name}: a leaf points back down the stem`); });
      let sd = 0, rep = 0; lv.forEach(({ o }) => { if (sd && o.side === sd) rep++; sd = o.side; }); if (rep > 0 && l.kind !== 'margin') f.push(`${l.name}: ${rep} leaf pair(s) on the same side in a row`);
      const rs = l.organs.filter(o => o.kind === 'rose' && o.role !== 'terminal').map(o => ({ o, s: arcOf(o) })).sort((a, b) => a.s - b.s); for (let i = 1; i < rs.length; i++) if (rs[i].o.size > rs[i - 1].o.size + .6) { f.push(`${l.name}: roses grow larger toward the end`); break; } }); add(10, 'leaves are at least 5, shrink toward the end, alternate, point the way the plant grows', f); }
  // 11 every limb is a branch of at least 3 elements (leaves, spiral, rose, bud)
  { const f = []; limbs.filter(l => l.kind !== 'margin' && l.kind !== 'tendril').forEach(l => { const n = l.organs.length + (l.term === 'spiral' ? 1 : 0); if (n < 3) f.push(`${l.name}: only ${n} element(s)`); }); add(11, 'a branch carries at least 3 elements', f); }
  {
    // 12 between sections: one branch a side (shoots count, two primaries at most); the tail band above the footer is big: 2-3 branches a side (shoots count), one spiral at most, 6 branches and spirals together at most
    { const f = [], info = [], nb = ctx.heads.length; for (let b = 0; b <= nb; b++) { const big = b === nb; let tot = 0; for (const sd of ['L', 'R']) { const pr = limbs.filter(l => l.band === b && l.side === sd && l.parent != null && byId.get(l.parent).kind === 'margin' && l.kind !== 'tendril'), sh = limbs.filter(l => l.band === b && l.side === sd && l.parent != null && byId.get(l.parent).kind !== 'margin'), sp = limbs.filter(l => l.band === b && l.side === sd && l.kind === 'tendril');
        tot += pr.length + sp.length; info.push(`${big ? 'tail' : 's' + (b + 1)}${sd}:${pr.length}+${sh.length}s`); const all = pr.length + sh.length; if (big ? (all < 2 || pr.length > 3) : (all < 1 || pr.length > 2)) f.push(`${big ? 'the space above the footer' : 'section ' + (b + 1)} ${sd}: ${pr.length} branches and ${sh.length} shoots`); if (sp.length > 1) f.push(`band ${b + 1} ${sd}: ${sp.length} spirals`); } if (big && tot > 6) f.push(`the space above the footer: ${tot} branches and spirals together (max 6)`); } add(12, 'one branch a side between sections; 2-3 a side in the big space above the footer', f, info.join(' ')); }
    // 13 the page carries flowers: at least 4 roses and buds together, and a rose in the space above the footer
    { const f = []; let fl = 0, tailRose = 0; limbs.forEach(l => l.organs.forEach(o => { if (o.kind !== 'leaf') { fl++; if (l.band === ctx.heads.length && o.kind === 'rose') tailRose++; } })); if (fl < 4) f.push(`only ${fl} roses and buds on the page`); if (!tailRose) f.push('no rose in the big space above the footer'); add(13, 'roses and buds appear (a few), and the big space has a rose', f, `${fl} roses and buds`); }
    return res;
  }
  return res;
}

function main() {
  const args = process.argv.slice(2); let file = path.join(__dirname, '..', 'src', 'vine-grow.js'), json = null, strict = false; const widths = [];
  for (let i = 0; i < args.length; i++) { if (args[i] === '--file') file = path.resolve(args[++i]); else if (args[i] === '--json') json = args[++i]; else if (args[i] === '--strict') strict = true; else if (/^(\w+-)?\d+$/.test(args[i])) widths.push(/^\d+$/.test(args[i]) ? +args[i] : args[i]); }      // 910, or demo-910 for tests/fixtures/layout-demo-910.json
  if (!widths.length) widths.push(910, 1024, 1440, 1920, 700);
  let bad = 0, warn = 0;
  widths.forEach(W => { const ctx = loadCtx(W), out = run(file, ctx); console.log(`\n== ${W} px: ${out.length} polylines, ${(out.limbs || []).length} limbs, ${out.ms} ms`);
    if (json && W === widths[0]) fs.writeFileSync(json, JSON.stringify({ W, limbs: (out.limbs || []).map(l => ({ id: l.id, name: l.name, kind: l.kind, side: l.side, band: l.band, term: l.term, parent: l.parent, head: l.head, stem: l.stem, tail: l.tail, organs: l.organs.map(o => ({ kind: o.kind, size: o.size, role: o.role, polys: o.polys })) })) }));
    check(out, ctx).forEach(r => { const soft = !strict && (r.id === 12 || r.id === 13); console.log((r.pass ? 'PASS ' : soft ? 'WARN ' : 'FAIL ') + String(r.id).padEnd(3) + r.name + (r.pass ? '' : `  [${r.n}]`) + (r.info ? '   ' + r.info : '')); if (!r.pass) { if (soft) warn++; else bad++; r.fails.forEach(x => console.log('       - ' + x)); } }); });
  console.log(bad ? `\n${bad} failing check(s)` : `\nall geometry checks pass${warn ? ` (${warn} composition warning(s))` : ''}`); process.exit(bad ? 1 : 0);
}
if (require.main === module) main();
module.exports = { check };
