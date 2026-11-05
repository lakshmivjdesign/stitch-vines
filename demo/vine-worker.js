// Grows the vines off the main thread, so the page stays usable while the generator works (1 to 5 seconds).
// In: the plain layout (src/page-adapter.js snapshot). Out: the vines sorted by kind (collect.js), in stitch units.
self.window = self;
importScripts('../src/vine-grow.js', 'collect.js');
onmessage = e => {
  const ctx = e.data, grid = ctx.grid, cEnd = ctx.c0 + grid[0].length;
  ctx.cell = (c, r) => (c < ctx.c0 || c >= cEnd || r < 0 || r >= grid.length) ? 0 : +(grid[r][c - ctx.c0] || 0);
  const t0 = Date.now(), out = self.StitchVines(ctx), res = self.StitchCollect(out);
  res.ms = Date.now() - t0; postMessage(res);
};
