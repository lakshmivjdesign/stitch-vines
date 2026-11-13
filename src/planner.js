/* stitch-vines PLANNER + entry point (src/engine.js holds the growing tools): grows a plant-like vine background (margin vines, branches, leaves, roses, buds, golden-ratio spirals) in the empty space of a web page.
   It does not draw anything itself: it returns polylines in "stitch" units (one unit = one cell of a dot lattice). Render them as cross stitches, SVG, canvas, anything.
   Every limb is ONE continuous stroke, grown step by step from its curvature, so there are no kinks and nothing is cut afterwards (rules: docs/rules.md).
   Input (the layout contract, docs/layout-contract.md):
     ctx = { u, m, W, top, foot, heads:[{top,bottom,left,right}], rows:[{top,bottom}], cell(c, r) }
       u    stitch size in css px          m    side margin in css px           W   page width in css px
       top  css y above which nothing may grow           foot  css y of the footer's top
       heads  one box per section heading (css px)       rows  one box per section's row of cards/images, same order as heads
       cell(c, r) -> 0 free | 1 text (a vine may pass under words, unless ctx.textClear is set: then it may not) | 2 object (card, image, button: a vine may pass under its middle only)
   Output: an array of polylines [[x, y], ...] in stitch units (a cell's centre is an integer), with .limbs describing every limb for tests/check.js.
   Status: first public cut, taken from one site's working copy; see docs/roadmap.md. */
window.StitchVinesPlan = function (ctx) {
  if (!(ctx.heads && ctx.heads.length && ctx.rows && ctx.rows.length)) return window.StitchVinesGeneral(ctx);       // a page without headings-and-rows: the general planner
  const E = window.StitchVinesEngine(ctx);
  const { u, m, W, foot, heads, cs, ce, C, rowMin, rowFoot, NR, kindAt, cardRows, limbs, margins, stats, rnd, rr, seedFor, marginVine, placeLimb, mirror, tryOrgan, mkLeaf, mkRose, mkBud, DS, MINR, D } = E;
  /* ---- the sections: a heading, its intro, then the card row ---- */
  const bands = heads.map((h, i) => { const hA = Math.floor(h.top / u), hB = Math.ceil(h.bottom / u), rT = cardRows[i] ? cardRows[i][0] : hB + 20, prev = i ? cardRows[i - 1][1] : rowMin;
    return { i, ra: prev + 1, rb: rT - 1, hA, hB, hc: (hA + hB) / 2, lastC: Math.round((h.right - m) / u), rT }; });
  { const last = cardRows[cardRows.length - 1][1]; bands.push({ i: bands.length, ra: last + 1, rb: rowFoot - 1, hA: last + 1, hB: last + 1, hc: last + 1, lastC: 0, rT: rowFoot, tail: true }); }                                  // the big space under the last cards, above the footer
  /* ---- the composition: which limbs, from the rules (2 to 3 branches per band side), measured against each band's own rows and heading; shoots are free ---- */
  const clearOf2 = (c, r, rad) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (kindAt(c + dx, r + dy) === 2) return false; return true; };
  const freeNear = (c, r, rad = 5) => { for (let d = 0; d < 30; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue; const cc = Math.round(c + dx), rw = Math.round(r + dy); if (cc > cs + 3 && cc < ce - 3 && rw > rowMin + 4 && rw < NR - 6 && clearOf2(cc, rw, rad)) return [cc, rw]; } return [c, r]; };
  const slot = (b, side, o) => ({ search: 130, nl: [3, 5], ...o, alts: (o.alts || []).map(a => a.T ? { ...a, T: freeNear(mirror(side, a.T[0]), a.T[1], o.clear ?? 5) } : a), name: `b${b.i + 1}${side}-${o.kind}`, side, sgn: side === 'L' ? 1 : -1, band: b.i, T: freeNear(mirror(side, o.T[0]), o.T[1], o.clear ?? 5), wp: (o.wp || []).map(([x, y, t]) => [mirror(side, x), y, t]) });
  const makePlan = () => { const plan = [];
    bands.forEach(b => {
      if (b.tail) {                                                         // big band: 2-3 branches a side, roses and buds, a spiral
        const top = b.ra + 6;
        plan.push(slot(b, 'L', { kind: 'cover', retries: 2, node: [b.rb - 8, b.rb], T: [66, top + 10], wp: [[14, top + 14, 9], [36, top + 10, 9]], term: 'bud', alts: [{ term: 'spiral' }], endSize: 9, roses: [[.2, 6], [.55, 5]], leaves: 6, leaf: 13,
          shoots: [{ kind: 'rise', nodeT: [.2, .5], T: [24, top - 2], term: 'spiral', roses: [[.35, 4.5]], leaves: 4, leaf: 11 }] }));
        plan.push(slot(b, 'R', { kind: 'reach', retries: 2, node: [b.rb - 8, b.rb], T: [40, top + 8], wp: [[12, top + 14, 9]], term: 'spiral', alts: [{ term: 'bud' }], roses: [[.25, 6]], buds: [.6], leaves: 4, leaf: 12,
          shoots: [{ kind: 'rise', search: 300, nodeT: [.3, .6], T: [24, top - 2], term: 'spiral', alts: [{ term: 'bud' }], leaves: 4, leaf: 10 }] }));
        return; }
      const big = b.i % 2 === 0;                                            // between sections: one big branch and one small one, swapping sides
      const longT = Math.min(b.lastC + 18, 92);
      plan.push(slot(b, 'L', { kind: big ? 'cover' : 'small', retries: 2, node: [b.hB + 8, b.rT - 2], T: big ? [longT, b.hA - 2] : [26, b.hB + 2], clear: 2, term: big ? 'bud' : 'spiral', alts: [{ term: big ? 'spiral' : 'bud' }, { T: [20, b.hB + 4] }], roses: big ? [[.12, 5.5]] : [], buds: big ? [] : [.5], leaves: big ? 4 : 3, leaf: 11 }));
      plan.push(slot(b, 'R', { kind: big ? 'small' : 'reach', retries: 2, node: [b.hB + 8, b.rT - 2], T: big ? [22, b.hB + 3] : [Math.min(longT, 60), b.hA - 2], clear: 2, term: 'spiral', alts: [{ term: 'bud' }, { T: [30, b.hB + 6] }, { T: [16, b.hA - 6] }], roses: big ? [] : [[.2, 5.5]], buds: big ? [.5] : [], leaves: big ? 3 : 4, leaf: 11 })); });
    return plan; };

  const L0 = marginVine(1), R0 = marginVine(-1);
  if (!L0 || !R0) { const o = []; o.limbs = limbs; return o; }                                             // a screen too narrow for margin vines grows none
  makePlan().forEach(sp => placeLimb(sp, margins[sp.side]));

  /* ---- leaves along the margin vines, last ---- */
  [L0, R0].forEach(L => E.marginLeaves(L));
  return E.finish();
};

/* The one entry point: StitchVines(ctx) -> polylines with .limbs and .status. ctx may carry ctx.variants (the same page at several stitch sizes). */
window.StitchVines = function (ctx, opt) { return window.StitchVinesFit(ctx, opt); };
