/* stitch-vines FIT: picks the stitch size and the relaxation rung, so a page gets vines whenever it can, and never silently none.
   Input: ctx.variants = [ctx at 6.5 px stitch, ctx at 5.5 px, ctx at 4.5 px] (same page, same width), or a plain ctx.
   Order tried: the largest stitch that leaves the margin 5 or more stitches wide; if no real vines grow, the next smaller stitch.
   Real vines = a margin vine on both sides (and at least 2 limbs). Result: the polylines, with .status = { ok, u, rung, grew, message }. */
window.StitchVinesFit = function (ctx0, opt) {
  const list = ctx0.variants && ctx0.variants.length ? ctx0.variants : [ctx0], tried = [];
  let best = null;
  const real = out => { const L = out.limbs || [], sides = new Set(L.filter(l => l.kind === 'margin').map(l => l.side)); return L.length >= 2 && sides.size === 2; };
  // how much of the page has a free strip of 5 or more stitches on both sides? (cheap look before the expensive planning)
  const stripScore = c => { const cs = c.cStart, ce = c.cEnd, mid = Math.floor((cs + ce) / 2), r0 = Math.ceil(c.top / c.u) + 1, r1 = Math.ceil(c.foot / c.u); let ok = 0, n = 0;
    const blocked = (x, r) => { const k = c.cell(x, r); return c.textClear ? k !== 0 : k === 2 || k === 3; };
    for (let r = r0; r < r1; r++) { n++; let a = 0, b = 0; while (a < 5 && !blocked(cs + a, r)) a++; while (b < 5 && !blocked(ce - 1 - b, r)) b++; if (a >= 5 && b >= 5) ok++; } return n ? ok / n : 0; };
  const order = list.map((c, i) => ({ c, i, sc: stripScore(c) })).filter(v => v.sc >= .12);
  if (!order.length) { const o = []; o.limbs = []; o.status = { ok: false, rung: 0, grew: 0, message: 'This layout does not fit: there is no free strip beside the content that is 5 stitches wide (about ' + Math.round(5 * list[list.length - 1].u) + ' px) for at least 12% of the page height, at this window width. Nothing was drawn.' }; return o; }
  const maxSc = Math.max(...order.map(v => v.sc));
  let start = order.findIndex(v => v.sc >= .7 * maxSc); if (start < 0) start = 0;
  for (let k = start; k < order.length; k++) {
    const v = order[k], out = window.StitchVinesPlan(v.c, opt); out.u = v.c.u; tried.push(`${v.c.u.toFixed(1)} px stitch: ${(out.limbs || []).length} limbs`);
    if (!best || (out.limbs || []).length > (best.limbs || []).length) best = out;
    if (real(out)) { best = out; break; } }
  if (!real(best)) { best.status = Object.assign({}, best.status, { ok: false, message: 'No vines were drawn: ' + ((window.__stitchVines && window.__stitchVines.fail || [])[0] || 'no free strip long enough in the margins') + ' (tried ' + tried.join('; ') + ')' }); }
  else best.status = Object.assign({}, best.status, { ok: true, u: best.u, message: 'Grew ' + best.limbs.length + ' vines (' + best.u.toFixed(1) + ' px stitch' + (best.u < list[0].u - .3 ? ', smaller stitch for narrow margins' : '') + ').' });
  return best;
};
