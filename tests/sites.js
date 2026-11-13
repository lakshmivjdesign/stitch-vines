// Loads a recorded site layout (tests/sites/<name>-<W>.json.gz) as a `ctx` the generator and the checker can use.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.join(__dirname, 'sites');
const list = () => fs.readdirSync(dir).filter(f => f.endsWith('.json.gz')).map(f => { const m = f.match(/^(.+)-(\d+)\.json\.gz$/); return { file: f, name: m[1], W: +m[2] }; }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : a.W - b.W);
const read = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, file))));
// a ctx for variant `vi` (0: 6.5 px stitch, 1: 5.5, 2: 4.5), using the stitch size and the lattice that variant was recorded with
function ctxOf(rec, vi) {
  const v = rec.v[Math.min(vi, rec.v.length - 1)], grid = v.grid, cEnd = v.c0 + grid[0].length;
  return { u: v.u, m: v.m, W: rec.W, top: rec.top, foot: rec.foot, C: v.C, R: v.R, c0: v.c0, cStart: v.c0, cEnd, grid, heads: v.heads || [], rows: v.rows || [], textClear: !rec.own,
    cell: (c, r) => (c < v.c0 || c >= cEnd || r < 0 || r >= grid.length) ? 0 : +(grid[r][c - v.c0] || 0), margins: rec.margins, notes: rec.notes, problems: rec.problems, name: rec.name };
}
module.exports = { list, read, ctxOf };
