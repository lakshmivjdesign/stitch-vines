// Runs the generator on a recorded page layout (tests/fixtures/layout-<W>.json) without a browser.
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadCtx(W) {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'layout-' + W + '.json')));
  const { grid, c0 } = j, cEnd = Math.ceil((j.W - j.m) / j.u), c00 = -Math.ceil(j.m / j.u);
  j.cell = (c, r) => (c < c00 || c >= cEnd || r < 0 || r >= grid.length) ? 0 : +(grid[r][c - c0] || 0);
  j.c0 = c0; j.cStart = c00; j.cEnd = cEnd; return j;
}
function run(file, ctx, hook = 'StitchVines') {
  const win = {}; const sandbox = { window: win, Math, console, Map, Set, Float64Array, Int32Array, Uint8Array, Array, Object, Number, Date };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  const t0 = Date.now(); const out = win[hook](ctx); out.ms = Date.now() - t0; out.debug = win.__stitchVines; return out;
}
module.exports = { loadCtx, run };
