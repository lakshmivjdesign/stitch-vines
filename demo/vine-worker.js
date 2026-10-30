// Grows the vines off the main thread, so the page stays usable while the generator works (2 to 5 seconds).
// In: the plain layout (src/page-adapter.js snapshot). Out: polylines per kind, in stitch units.
self.window = self;
importScripts('../src/vine-grow.js');
onmessage = e => {
  const ctx = e.data, grid = ctx.grid, cEnd = ctx.c0 + grid[0].length;
  ctx.cell = (c, r) => (c < ctx.c0 || c >= cEnd || r < 0 || r >= grid.length) ? 0 : +(grid[r][c - ctx.c0] || 0);
  const t0 = Date.now(), out = self.StitchVines(ctx), parts = { stem: [], leaf: [], flower: [] };
  (out.limbs || []).forEach(l => { parts.stem.push(l.head.concat(l.stem, l.tail)); l.organs.forEach(o => o.polys.forEach(p => parts[o.kind === 'leaf' ? 'leaf' : 'flower'].push(p))); });
  postMessage({ parts, ms: Date.now() - t0, limbs: (out.limbs || []).length });
};
