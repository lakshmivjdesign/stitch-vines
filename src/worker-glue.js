// runs inside the worker, after the engine and planner
self.window = self;
const r1 = v => Math.round(v * 10) / 10, flat = pl => { const a = new Array(pl.length * 2); for (let i = 0; i < pl.length; i++) { a[2 * i] = r1(pl[i][0]); a[2 * i + 1] = r1(pl[i][1]); } return a; };
function pack(out, u, m) { const limbs = out.limbs || [], stems = [], organs = [];
  limbs.forEach(l => { stems.push(flat(l.head.concat(l.stem, l.tail))); l.organs.forEach(o => organs.push({ kind: o.kind, dir: r1(o.dir * 100) / 100, size: r1(o.size), polys: o.polys.map(flat) })); });
  return { u, m, stems, organs, limbs: limbs.length }; }
onmessage = e => {
  const { id, variants, opts } = e.data, t0 = Date.now();
  const ctxs = variants.map(v => { const g = v.grid, cEnd = v.c0 + g[0].length; return Object.assign({}, v, { cStart: v.c0, cEnd, textClear: opts.textClear, heads: [], rows: [], cell: (c, r) => (c < v.c0 || c >= cEnd || r < 0 || r >= g.length) ? 0 : +(g[r][c - v.c0] || 0) }); });
  const ctx = Object.assign({}, ctxs[0], { variants: ctxs }), byU = new Map(ctxs.map(c => [c.u, c]));
  const out = self.StitchVines(ctx, { density: opts.density, deadline: t0 + opts.budgetMs, onStage: (o, info) => { if (info.real) postMessage({ id, stage: 'margins', result: Object.assign(pack(o, info.u, byU.get(info.u).m), { real: true }) }); } });
  const st = out.status || {}, c = byU.get(out.u) || ctxs[0];
  postMessage({ id, stage: 'done', message: st.message, ok: !!st.ok, result: st.ok ? pack(out, out.u, c.m) : null, ms: Date.now() - t0 });
};
