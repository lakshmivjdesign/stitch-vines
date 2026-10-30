/* stitch-vines: grows a plant-like vine background (margin vines, branches, leaves, roses, buds, golden-ratio spirals) in the empty space of a web page.
   It does not draw anything itself: it returns polylines in "stitch" units (one unit = one cell of a dot lattice). Render them as cross stitches, SVG, canvas, anything.
   Every limb is ONE continuous stroke, grown step by step from its curvature, so there are no kinks and nothing is cut afterwards (rules: docs/rules.md).
   Input (the layout contract, docs/layout-contract.md):
     ctx = { u, m, W, top, foot, heads:[{top,bottom,left,right}], rows:[{top,bottom}], cell(c, r) }
       u    stitch size in css px          m    side margin in css px           W   page width in css px
       top  css y above which nothing may grow           foot  css y of the footer's top
       heads  one box per section heading (css px)       rows  one box per section's row of cards/images, same order as heads
       cell(c, r) -> 0 free | 1 text (a vine may pass under words) | 2 object (card, image, button: a vine may pass under its middle only)
   Output: an array of polylines [[x, y], ...] in stitch units (a cell's centre is an integer), with .limbs describing every limb for tests/check.js.
   Status: first public cut, taken from one site's working copy; see docs/roadmap.md. */
window.StitchVines = function (ctx) {
  const { u, m, W, foot, heads, cell } = ctx;
  const PHI = 1.618034, D = Math.PI / 180, TAU = Math.PI * 2, MINR = 6.6, DS = .3;
  const cs = -Math.ceil(m / u), ce = Math.ceil((W - m) / u), NC = ce - cs, C = Math.round((W - 2 * m) / u);      // stitch columns that exist: cs .. ce-1; the content runs 0 .. C-1
  const rowMin = Math.ceil(ctx.top / u) + 1, rowFoot = Math.ceil(foot / u), NR = rowFoot + 14;                   // nothing above rowMin; the page ends a little below the footer line
  let seed = 1025; const seedFor = name => { let h = 1025; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; seed = h; };
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, rr = (a, b) => a + rnd() * (b - a);
  const mask = new Uint8Array(NC * NR); for (let r = 0; r < NR; r++) for (let c = cs; c < ce; c++) mask[r * NC + c - cs] = cell(c, r);
  const kindAt = (c, r) => (c < cs || c >= ce || r < 0 || r >= NR) ? 0 : mask[r * NC + c - cs];
  const soft = [];
  { const seen = new Uint8Array(NC * NR), q = [];                                                          // small objects (carousel chevrons, buttons) hide only their core: a vine may cross their padding. Big ones (cards, rules) stay solid.
    for (let r0 = 0; r0 < NR; r0++) for (let c0 = cs; c0 < ce; c0++) { const k0 = r0 * NC + c0 - cs; if (mask[k0] !== 2 || seen[k0]) continue;
      const comp = []; let x0 = c0, x1 = c0, y0 = r0, y1 = r0; seen[k0] = 1; q.length = 0; q.push([c0, r0]);
      while (q.length) { const [c, r] = q.pop(); comp.push([c, r]); x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c2 = c + dc, r2 = r + dr; if (c2 < cs || c2 >= ce || r2 < 0 || r2 >= NR) continue; const k2 = r2 * NC + c2 - cs; if (mask[k2] === 2 && !seen[k2]) { seen[k2] = 1; q.push([c2, r2]); } } }
      if (x1 - x0 + 1 <= 26 && y1 - y0 + 1 <= 16) comp.forEach(([c, r]) => { let edge = false; for (let dy = -2; dy <= 2 && !edge; dy++) for (let dx = -2; dx <= 2; dx++) if (kindAt(c + dx, r + dy) !== 2 && !(c + dx < cs || c + dx >= ce)) { edge = true; break; } if (edge) soft.push(r * NC + c - cs); }); }
    soft.forEach(k => { mask[k] = 3; }); }
  const own = new Int32Array(NC * NR), own2 = new Int32Array(NC * NR), els = [null], ix = (c, r) => r * NC + c - cs, key = (c, r) => c * 4096 + r;
  const stats = window.__stitchVines = { fail: [] };

  /* ---- the sections: a heading, its intro, then the card row; the vines work around the heading ---- */
  const cardRows = (ctx.rows || []).map(r => [Math.floor(r.top / u), Math.ceil(r.bottom / u)]);
  const bands = heads.map((h, i) => { const hA = Math.floor(h.top / u), hB = Math.ceil(h.bottom / u), rT = cardRows[i] ? cardRows[i][0] : hB + 20, prev = i ? cardRows[i - 1][1] : rowMin;
    return { i, ra: prev + 1, rb: rT - 1, hA, hB, hc: (hA + hB) / 2, lastC: Math.round((h.right - m) / u), rT }; });
  { const last = cardRows[cardRows.length - 1][1]; bands.push({ i: bands.length, ra: last + 1, rb: rowFoot - 1, hA: last + 1, hB: last + 1, hc: last + 1, lastC: 0, rT: rowFoot, tail: true }); }                                  // the big space under the last cards, above the footer
  const edgeL = (() => { let e = 0; for (let r = cardRows[0][0] + 2; r < cardRows[0][1] - 2; r += 4) for (let c = cs; c < 10; c++) if (kindAt(c, r) === 2) { e = Math.min(e, c); break; } return e; })();      // the first stitch column a card covers, on the left
  const edgeR = (() => { let e = C; for (let r = cardRows[0][0] + 2; r < cardRows[0][1] - 2; r += 4) for (let c = ce - 1; c > C - 10; c--) if (kindAt(c, r) === 2) { e = Math.max(e, c); break; } return e; })();   // and on the right

  /* ---- the parts: leaf (two arcs and a vein on a curved S2 stalk), rose (scalloped ring and spiral), bud (lens, spiral and two sepals) ---- */
  const rot = (pts, ox, oy, a) => pts.map(([x, y]) => [ox + x * Math.cos(a) - y * Math.sin(a), oy + x * Math.sin(a) + y * Math.cos(a)]);
  const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const fillPoly = poly => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; poly.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); const o = [];
    for (let r = Math.floor(y0); r <= Math.ceil(y1); r++) for (let c = Math.floor(x0); c <= Math.ceil(x1); c++) if (inside(poly, c, r)) o.push([c, r]); return o; };
  const stalk = (P, a0, a1, len) => { const p = [[P[0], P[1]]]; for (let i = 1; i <= 8; i++) { const t = i / 8, an = a0 + (a1 - a0) * t * t, q = p[p.length - 1]; p.push([q[0] + Math.cos(an) * len / 8, q[1] + Math.sin(an) * len / 8]); } return p; };   // leaves the stem along its tangent, bends away
  const bladeOf = (L, a, ox, oy) => { const up = [], dn = [], W2 = L * .235; for (let i = 0; i <= 30; i++) { const t = i / 30, w = W2 * Math.pow(Math.sin(Math.PI * Math.pow(t, .8)), .9); up.push([t * L, w]); dn.push([t * L, -w]); }
    const v = []; for (let i = 1; i < 23; i++) v.push([i / 30 * L, 0]); return [rot(up.concat(dn.reverse()), ox, oy, a), rot(v, ox, oy, a)]; };
  const mkLeaf = (P, t, side, L, ang) => { const a1 = t + side * (ang ?? 50) * D, s = stalk(P, t + side * .3, a1, 4.2), e = s[s.length - 1], [ol, vn] = bladeOf(L, a1, e[0], e[1]);
    return { kind: 'leaf', size: L, side, dir: a1, at: [P[0], P[1]], polys: [s, ol, vn], fill: fillPoly(ol), flower: false }; };
  const roseRing = (R, a, cx, cy) => { const ring = [], sp = [], n = Math.ceil(R * 14); for (let i = 0; i <= n; i++) { const th = i / n * TAU, r = R * (.8 + .2 * Math.abs(Math.sin(2.5 * th))); ring.push([Math.cos(th) * r, Math.sin(th) * r]); }
    const k = Math.ceil(R * 10), T = TAU * 1.5; for (let i = 0; i <= k; i++) { const th = i / k * T, r = R * .62 * Math.pow(th / T, .8); sp.push([Math.cos(th) * r, Math.sin(th) * r]); } return [rot(ring, cx, cy, a), rot(sp, cx, cy, a)]; };
  const mkRose = (P, t, side, R, ang) => { const an = ang ?? 70, a1 = t + side * an * D, Ls = side ? Math.max(2.4, (R + 2.6 - .8 * R * Math.sin(an * D)) / .7) : 1.8, s = stalk(P, t + side * .3, a1, Ls), e = s[s.length - 1], cx = e[0] + Math.cos(a1) * R * .85, cy = e[1] + Math.sin(a1) * R * .85, [ring, sp] = roseRing(R, rnd() * TAU, cx, cy);
    const disc = []; for (let r = Math.floor(cy - R - 1); r <= Math.ceil(cy + R + 1); r++) for (let c = Math.floor(cx - R - 1); c <= Math.ceil(cx + R + 1); c++) if (Math.hypot(c - cx, r - cy) <= R + .6) disc.push([c, r]);
    return { kind: 'rose', size: R, side, dir: a1, at: [P[0], P[1]], polys: [s, ring, sp], fill: disc, flower: true }; };
  const mkBud = (P, t, side, L, ang) => { const a1 = t + side * (ang ?? 50) * D, s = stalk(P, t + side * .25, a1, side ? 3.6 : 2.2), e = s[s.length - 1], w = tt => L * .3 * Math.sin(Math.PI * Math.pow(tt, .7)), env = [];
    for (let i = 0; i <= 24; i++) env.push([i / 24 * L, w(i / 24)]); for (let i = 24; i >= 0; i--) env.push([i / 24 * L, -w(i / 24)]);
    const sp = [], T = TAU * 1.2; for (let i = 0; i <= 20; i++) { const th = i / 20 * T, r = L * .17 * Math.pow(th / T, .8); sp.push([L * .5 + Math.cos(th) * r, Math.sin(th) * r]); }
    const lens = rot(env, e[0], e[1], a1);
    return { kind: 'bud', size: L, side, dir: a1, at: [P[0], P[1]], polys: [s, lens, rot(sp, e[0], e[1], a1), rot([[0, 0], [-L * .25, L * .12]], e[0], e[1], a1), rot([[0, 0], [-L * .25, -L * .12]], e[0], e[1], a1)], fill: fillPoly(lens), flower: true }; };

  /* ---- occupancy: every element (a stem, a leaf, a rose, a bud) owns its stitches and the stitches inside it; nothing else may come within one stitch ---- */
  const cellsOf = polys => { const seen = new Map(); polys.forEach(pl => { for (let i = 0; i < pl.length - 1; i++) { const a = pl[i], b = pl[i + 1], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .35)); for (let j = 0; j <= k; j++) { const c = Math.round(a[0] + (b[0] - a[0]) * j / k), r = Math.round(a[1] + (b[1] - a[1]) * j / k); seen.set(key(c, r), [c, r]); } } }); return [...seen.values()]; };
  const badCell = (c, r, host, at, jr) => { if (c < cs || c >= ce || r < rowMin || r >= NR) return true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = ix(c + dx, r + dy), id = own[k], id2 = own2[k]; if (!id) continue;
      if (!(id === host && Math.hypot(c - at[0], r - at[1]) <= jr - 1.5)) return true; if (id2 && !(id2 === host && Math.hypot(c - at[0], r - at[1]) <= jr - 1.5)) return true; } return false; };
  const blocked = (cells, fill, host, at, jr) => { for (const [c, r] of cells) if (badCell(c, r, host, at, jr)) return true; for (const [c, r] of fill) if (c < cs || c >= ce || r < rowMin || r >= NR || own[ix(c, r)]) return true; return false; };
  const claim = (id, cells, fill) => { cells.forEach(([c, r]) => { const k = ix(c, r); if (!own[k]) own[k] = id; else if (own[k] !== id && !own2[k]) own2[k] = id; }); fill.forEach(([c, r]) => { const k = ix(c, r); if (!own[k]) own[k] = id; }); els[id].mine = cells.concat(fill); };
  const release = id => { els[id].mine.forEach(([c, r]) => { const k = ix(c, r); if (own[k] === id) { own[k] = own2[k]; own2[k] = 0; } else if (own2[k] === id) own2[k] = 0; }); els[id].mine = []; };
  const newEl = (limb, kind, at, jr) => { els.push({ limb, kind, at, jr, mine: [] }); return els.length - 1; };
  const hid = (x, y) => kindAt(Math.round(x), Math.round(y)) === 2;

  /* ---- growing: curvature is a chain of lobes (alternating sign, each a smooth bump); the stroke is integrated step by step ---- */
  const kappaLobes = lobes => s => { let s0 = 0; for (let j = 0; j < lobes.length; j++) { const lb = lobes[j]; if (s < s0 + lb.L || j === lobes.length - 1) { const d = lb.d || 0; if (s - s0 < d) return 0; const q = Math.sin(Math.PI * Math.min(1, (s - s0 - d) / (lb.L - d))); return lb.sg * lb.k * q * q; } s0 += lb.L; } return 0; };
  const grow = (x, y, th, kf, total, host, at, jr) => {                                // the stem: steps until its length is used up or the next stitch is not free
    const P = [[x, y]], TH = [th], S = [0], K = [kf(0)], HD = [hid(x, y) ? 1 : 0], seen = new Map(); let s = 0, cc = Math.round(x), cr = Math.round(y), stop = -1, hd = HD[0]; seen.set(key(cc, cr), 0);
    while (s < total - 1e-9) { const k = kf(s + DS / 2); th += k * DS / 2; x += Math.cos(th) * DS; y += Math.sin(th) * DS; th += k * DS / 2; s += DS; P.push([x, y]); TH.push(th); S.push(s); K.push(k);
      const c = Math.round(x), r = Math.round(y); if (c !== cc || r !== cr) { cc = c; cr = r; hd = kindAt(c, r) === 2 ? 1 : 0; if (badCell(c, r, host, at, jr)) { HD.push(hd); stop = P.length - 1; break; }
        let hit = false; for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) { const q = seen.get(key(c + dx, r + dy)); if (q !== undefined && s - q > 12) { hit = true; break; } } if (hit) { HD.push(hd); stop = P.length - 1; break; } seen.set(key(c, r), s); }
      HD.push(hd); }
    return { P, TH, S, K, HD, stop, seen }; };
  const spiralFrom = (g, i, sgn, r0, host, at, jr, soft) => {                         // a spiral that carries on the bend: radius / phi every half turn, until it would touch something
    const seen = new Map(); g.seen.forEach((q, k) => { if (q <= g.S[i]) seen.set(k, q); });
    let x = g.P[i][0], y = g.P[i][1], th = g.TH[i], s = g.S[i], ph = 0, cc = Math.round(x), cr = Math.round(y), why2 = 'done'; const pts = [[x, y]];
    for (let n = 0; n < 900; n++) { const r = r0 * Math.pow(PHI, -ph / Math.PI); if (r < 1.9) break; const dph = DS / r; th += sgn * dph / 2; x += Math.cos(th) * DS; y += Math.sin(th) * DS; th += sgn * dph / 2; ph += dph; s += DS;
      const c = Math.round(x), rw = Math.round(y); if (c !== cc || rw !== cr) { cc = c; cr = rw; if (badCell(c, rw, host, at, jr)) { why2 = 'cell ' + c + ',' + rw; break; } if (!soft && kindAt(c, rw) === 2) { why2 = 'object ' + c + ',' + rw; break; } let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) for (let dx = -1; dx <= 1; dx++) { const q = seen.get(key(c + dx, rw + dy)); if (q !== undefined && s - q > 12) { hit = true; break; } } if (hit) { why2 = 'self ' + c + ',' + rw; break; } seen.set(key(c, rw), s); }
      pts.push([x, y]); }
    return { pts, turns: ph / TAU, why: why2 }; };

  const limbs = []; let limbSeq = 0, roseCount = 0;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]), angD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) / D;
  const chordAt = (P, s0, s1) => ang(P[Math.min(P.length - 1, Math.round(s0 / DS))], P[Math.min(P.length - 1, Math.round(s1 / DS))]);

  /* ---- margin vines: a spiral just above the footer line, a gentle wave up the margin, then a big arch that closes into a spiral just under the buttons row ---- */
  const pure = (x, y, th, kf, total) => { const P = [[x, y]], TH = [th]; let s = 0; while (s < total - 1e-9) { const k = kf(s + DS / 2); th += k * DS / 2; x += Math.cos(th) * DS; y += Math.sin(th) * DS; th += k * DS / 2; s += DS; P.push([x, y]); TH.push(th); } return { P, TH }; };
  const spiralPure = (x, y, th, sgn, r0) => { const pts = [[x, y]]; let ph = 0; for (let n = 0; n < 900; n++) { const r = r0 * Math.pow(PHI, -ph / Math.PI); if (r < 2.4) break; const dph = DS / r; th += sgn * dph / 2; x += Math.cos(th) * DS; y += Math.sin(th) * DS; th += sgn * dph / 2; ph += dph; pts.push([x, y]); } return pts; };
  const margins = {};
  function marginVine(sg) {                                                             // sg +1: the left margin (curls to the right at the top), -1: the right margin
    const xIn = sg > 0 ? edgeL - 1.9 : edgeR + 1.9, xOut = sg > 0 ? cs + 1 : ce - 2; if (Math.abs(xIn - xOut) < .8) { stats.fail.push('margin ' + sg + ' too narrow ' + xIn + ' ' + xOut); return null; }     // no room for a margin vine (narrow screens): none is grown
    const xc = (xIn + xOut) / 2, A = Math.max(.5, Math.min(3.2, Math.abs(xIn - xOut) / 2)), Lr = 12, La = 15;
    for (const dBot of [0, 6, 12, 20]) for (const NW of [17, 23, 31, 41]) for (const r0 of [9.5, 8.5, 7.5, 6.8]) for (const dTop of [0, 3, 6, 10, 15]) for (const [hs, rh] of [[1, 6.2]]) {
      const k1 = 1 / r0, dR = Lr / (2 * rh), th0 = -Math.PI / 2 - hs * sg * dR, yStart = rowFoot + 3 - dBot;                              // the vine runs down beside the footer rule and ends in a bud, so the space above the footer has a long stem to branch from
      const make = lam => { const om = TAU / lam, kw = A * om * om, wEnd = NW * lam / 2, k0 = sg * kw;                      // the heading wobbles around straight up; the wave ends upright and bending inward
        const kf = s => { if (s < Lr) { const q = Math.cos(Math.PI * s / (2 * Lr)); return hs * sg / rh * q * q; } const w = s - Lr; if (w < wEnd) return -sg * kw * Math.cos(om * w);
          const a = Math.min(1, (w - wEnd) / La), q = Math.sin(Math.PI * a / 2); return k0 + (sg * k1 - k0) * q * q; };       // the arch: curvature rises smoothly to 1/r0, where the spiral takes over
        return { kf, total: Lr + wEnd + La, wEnd }; };
      let lam = 58, fit = null;
      for (let it = 0; it < 10; it++) { const mk = make(lam), g = pure(0, yStart, th0, mk.kf, mk.total), e = g.P.length - 1, tl = spiralPure(g.P[e][0], g.P[e][1], g.TH[e], sg, r0);
        const apex = Math.min(...g.P.map(p => p[1]), ...tl.map(p => p[1])), want = yStart - (rowMin + 2.5 + dTop), ext = yStart - apex; fit = { mk, g }; if (Math.abs(ext - want) < .25) break; lam *= want / ext; }
      if (A * Math.pow(TAU / lam, 2) < .035) continue;                                       // a margin strip that narrow needs a shorter wave, or the bends are too faint to read as curves
      if (lam < 22 || lam > 90) { stats.fail.push('margin ' + sg + ' lam ' + lam.toFixed(1)); continue; }
      const wv = fit.g.P.slice(Math.round(Lr / DS), Math.round((Lr + fit.mk.wEnd) / DS)), x0 = xc - (Math.min(...wv.map(p => p[0])) + Math.max(...wv.map(p => p[0]))) / 2;
      const g = grow(x0, yStart, th0, fit.mk.kf, fit.mk.total, 0, [0, 0], 0); if (g.stop >= 0) { stats.fail.push('margin ' + sg + ' stem stopped at ' + g.P[g.stop].map(v => v.toFixed(1))); continue; }
      const L = { id: ++limbSeq, name: sg > 0 ? 'margin-L' : 'margin-R', kind: 'margin', side: sg > 0 ? 'L' : 'R', sg, band: -1, parent: null, term: 'spiral', P: g.P, TH: g.TH, S: g.S, K: g.K, stem: g.P, organs: [], head: [], tail: [], children: [] };
      L.sid = newEl(L, 'stem', [x0, yStart], 8); claim(L.sid, cellsOf([g.P]), []);
      const e = g.P.length - 1, tl = spiralFrom(g, e, sg, r0, L.sid, g.P[e], 9, false); if (tl.turns < .9) { release(L.sid); if (stats.fail.length < 6) stats.fail.push('margin ' + sg + ' top spiral ' + tl.turns.toFixed(2) + ' ' + tl.why); continue; }
      claim(L.sid, els[L.sid].mine.concat(cellsOf([tl.pts])), []);
      L.tail = tl.pts; L.head = []; L.r0 = r0; limbs.push(L); margins[L.side] = L;
      if (!tryOrgan(L, mkBud, 0, [0], [9, 7.5, 6], { ang: 0, back: true, role: 'base' })) { limbs.pop(); delete margins[L.side]; release(L.sid); stats.fail.push('margin ' + sg + ' base bud'); continue; }
      return L; }
    return null; }

  /* ---- a branch: search for the stem that fits, then dress it. The search tries many whole candidates and keeps the best that survives dressing ---- */
  const nodesOf = (par, rowA, rowB, tA, tB) => { const o = [], P = par.P, tot = par.S[par.S.length - 1]; for (let i = 20; i < P.length - 40; i += 2) { const r = P[i][1], t = par.S[i] / tot;
      if (rowA != null && (r < rowA || r > rowB)) continue; if (tA != null && (t < tA || t > tB)) continue; if (hid(P[i][0], P[i][1]) || hid(P[i - 6][0], P[i - 6][1]) || hid(P[i + 6][0], P[i + 6][1])) continue; if (par.kind === 'margin' && (Math.sin(par.TH[i]) > -.6 || par.sg * (par.TH[i] + Math.PI / 2) < -.04 || par.sg * (par.TH[Math.min(P.length - 1, i + 66)] - par.TH[i]) > .12)) continue; o.push(i); } return o; };   // a margin node: the vine climbs there, and does not turn inward over the child in the next 20 stitches
  // the first lobe of a branch is built to leave tangentially and lean 15-45 degrees: its curvature is solved so that the chord from stitch 10 to 24 leans the wanted amount
  const leanOf = (k, d, L) => { let x = 0, y = 0, th = 0, x10 = 0, y10 = 0, a10 = 0; for (let i = 1; i <= 80; i++) { const s = (i - .5) * DS, q = s < d ? 0 : Math.sin(Math.PI * Math.min(1, (s - d) / (L - d))), kk = k * q * q; th += kk * DS / 2; x += Math.cos(th) * DS; y += Math.sin(th) * DS; th += kk * DS / 2; if (i === 33) { x10 = x; y10 = y; a10 = Math.atan2(y, x); } }
    return [Math.atan2(y - y10, x - x10) / D, Math.abs(a10) / D]; };
  const slopes = new Map();
  const calibK = (d, L, want) => { const k2 = Math.round(d) * 100 + Math.round(L); let a = slopes.get(k2); if (!a) { a = leanOf(.05, Math.round(d), Math.round(L)); slopes.set(k2, a); } if (a[0] < 1) return 0; const k = .05 * want / a[0]; return a[1] * k / .05 < 8.5 ? k : 0; };
  const randLobes = (sg0, n, first) => { const out = []; let sg = sg0; for (let j = 0; j < n; j++) { let lb; if (j === 0) { for (let t = 0; t < 8; t++) { const d = rr(0, 9), L1 = rr(first[0], first[1]), k = calibK(d, L1, rr(20, 40)); if (k > 0 && k <= .13) { lb = { sg, d, L: L1, k }; break; } } lb = lb || { sg, d: 4, L: 36, k: .05 }; } else lb = { sg, d: 0, L: rr(14, 30), k: rr(.085, .135) }; out.push(lb); sg = -sg; } return out; };
  const lobesLen = lobes => lobes.reduce((a, l) => a + l.L, 0);
  // stem checks that need the whole stem: hidden only in the middle; the branch leaves tangentially, then leans 15-45 degrees
  const why = {};
  const stemOk = (P, endI, parentTan, K) => { const n = endI + 1, no = k => { why[k] = (why[k] || 0) + 1; return null; }; if (n * DS < 26) return no('len'); let hiddenN = 0, run = 0, seenHid = false;
    for (let i = 0; i < n; i++) { if (hid(P[i][0], P[i][1])) { hiddenN++; if (i * DS < 8) return no('hidStart'); if ((n - 1 - i) * DS < 8) return no('hidEnd'); if (run && seenHid && run * DS < 4) return no('hidGap'); seenHid = true; run = 0; } else run++; }
    if (seenHid && run * DS < 8) return no('hidTail');
    if (angD(chordAt(P, 0, 10), parentTan) > 9) return no('tangent'); const lean = angD(chordAt(P, 10, Math.min(24, (n - 1) * DS)), parentTan); if (lean < 17 || lean > 43) return no('lean' + (lean < 17 ? 'Lo' : 'Hi'));
    if (hiddenN * DS > 30) return no('hidMuch');
    { let run2 = 0; for (let i = 34; i < n - 10; i++) { if (Math.abs(K[i]) < 1 / 42) { if (++run2 > 36) return no('straight'); } else run2 = 0; } }     // a branch is curvy: a bend of radius 42 or tighter at least every 11 stitches (its first 10 leave along the parent)
    return { hiddenN, lean }; };

  function placeLimb(spec0, par) { const t0 = Date.now(); const res = placeLimb0(spec0, par); (stats.times = stats.times || []).push(spec0.name + ' ' + (Date.now() - t0) + 'ms ' + (res ? 'ok' : 'FAIL')); return res; }
  function placeLimb0(spec0, par) { for (let r = 0; r < (spec0.retries ?? 1); r++) for (const v of [spec0, ...(spec0.alts || []).map(o => ({ ...spec0, ...o, alts: null }))]) { const L = placeOne({ ...v, variant: '#' + r }, par); if (L) return L; } return null; }
  function placeOne(spec, par) {
    seedFor(spec.name + (spec.variant || ''));
    let nodes = []; for (let w = 0; w <= 40 && nodes.length < 10; w += 8) nodes = nodesOf(par, spec.node && spec.node[0] - w, spec.node && spec.node[1] + w, spec.nodeT && spec.nodeT[0], spec.nodeT && spec.nodeT[1]);   // no free node in the wanted rows: look a little further
    if (!nodes.length) { stats.fail.push(spec.name + ': no node'); return null; }
    for (const k in why) delete why[k]; const dbg = { short: 0, noend: 0, stem: 0, tail: 0, nodes: nodes.length };
    const one = gen => { const i0 = gen.ni, x0 = par.P[i0][0], y0 = par.P[i0][1], at = [x0, y0], g = grow(x0, y0, par.TH[i0], kappaLobes(gen.lobes), lobesLen(gen.lobes), par.sid, at, 14);
      const lim = g.stop < 0 ? g.P.length - 1 : g.stop - 1; if (lim < 90) { dbg.short++; return null; }
      const ptn = ang(par.P[Math.max(0, i0 - 7)], par.P[Math.min(par.P.length - 1, i0 + 7)]), wps = spec.wp || [], cum = wps.map(() => new Float64Array(lim + 1));
      wps.forEach(([wx, wy], w) => { let d = 1e9; for (let j = 0; j <= lim; j++) { if (j % 3 === 0) d = Math.min(d, Math.hypot(g.P[j][0] - wx, g.P[j][1] - wy)); cum[w][j] = d; } });
      const lastHid = new Int32Array(lim + 1); { let lh = -1000; for (let j = 0; j <= lim; j++) { if (g.HD[j]) { if (j < 27) { dbg.short++; return null; } lh = j; } lastHid[j] = lh; } }
      const ends = []; for (let i = spec.minLen || 90; i <= lim; i += 3) { if (i - lastHid[i] < 29) continue; const k = Math.abs(g.K[i]);
        if (spec.term === 'spiral' && (k < 1 / 17 || k > 1 / MINR || g.K[i - 33] * g.K[i] <= 0 || Math.abs(g.K[i - 33]) < .008)) continue;       // a spiral carries on a bend that is already tight enough and not loosening
        let c = Math.hypot(g.P[i][0] - spec.T[0], g.P[i][1] - spec.T[1]) * 1.5 + (k < Math.abs(g.K[i - 6]) - 1e-4 ? 4 : 0); wps.forEach(([, , tol], w) => { if (cum[w][i] > tol) c += (cum[w][i] - tol) * 1.2; }); ends.push([c, i]); }
      ends.sort((a, b) => a[0] - b[0]); if (!ends.length) dbg.noend++;;
      const room = (x, y) => { let n = 0, f = 0; const c0 = Math.round(x), r0 = Math.round(y); for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) { n++; const c = c0 + dx, r = r0 + dy; if (c > cs && c < ce - 1 && r > rowMin && r < NR && !own[ix(c, r)] && kindAt(c, r) !== 2) f++; } return f / n; };   // how much free ground lies around an end: a terminal needs room
      const top = ends.slice(0, 14); top.forEach(e => { e[0] += (1 - room(g.P[e[1]][0], g.P[e[1]][1])) * (spec.roomW ?? 14); }); top.sort((a, b) => a[0] - b[0]);
      const pick = []; for (const e of top) { if (pick.every(q => Math.abs(q[1] - e[1]) > 12)) pick.push(e); if (pick.length >= 6) break; }
      for (const [cost, i] of pick) { const chk = stemOk(g.P, i, ptn, g.K); if (!chk) { dbg.stem++; continue; } let tail = null;
        if (spec.term === 'spiral') { const sgn = Math.sign(g.K[i]), r0 = Math.max(MINR, 1 / Math.abs(g.K[i])), tl = spiralFrom(g, i, sgn, r0, par.sid, at, 14, false); if (tl.turns < .8) { dbg.tail++; continue; } tail = tl.pts; }
        return { gen, g, i, tail, at, cost: cost + chk.hiddenN * .8 }; }
      return null; };
    const turnAt = ni => { let a = 0; for (let j = ni; j < Math.min(par.K.length, ni + 66); j++) a += par.K[j]; return a / 66; };   // which way the parent is bending after the node
    const sgFor = ni => { if (spec.sgn != null) return spec.sgn; const t = turnAt(ni); return Math.abs(t) > .012 ? -Math.sign(t) : (rnd() < .5 ? 1 : -1); };      // a branch leans to the OUTER side of its parent's bend, never into it
    let pool = [];
    for (let n = 0; n < spec.search; n++) { const ni0 = nodes[Math.floor(rnd() * nodes.length)], sg = sgFor(ni0), gen = { ni: ni0, lobes: randLobes(sg, spec.nl[0] + Math.floor(rnd() * (spec.nl[1] - spec.nl[0] + 1)), spec.first || [24, 56]) }; const b = one(gen); if (b) pool.push(b); }
    for (let round = 0; round < 2 && pool.length; round++) { pool.sort((a, b) => a.cost - b.cost); pool = pool.slice(0, 8); const kids = [];
      pool.forEach(p => { for (let n = 0; n < 10; n++) { const lobes = p.gen.lobes.map((lb, j) => { if (j) return { ...lb, L: Math.max(12, lb.L * rr(.85, 1.2)), k: Math.min(.14, Math.max(.08, lb.k * rr(.85, 1.15))) }; const d = Math.max(0, Math.min(10, (lb.d || 0) + rr(-2, 2))), L1 = Math.max(22, lb.L * rr(.85, 1.2)), k = calibK(d, L1, rr(20, 40)); return k > 0 && k <= .13 ? { ...lb, d, L: L1, k } : lb; });
          if (rnd() < .2 && lobes.length < spec.nl[1] + 1) lobes.push({ sg: -lobes[lobes.length - 1].sg, L: rr(14, 30), k: rr(.085, .13) });
          let ni = p.gen.ni; if (rnd() < .3) { const c2 = nodes[Math.floor(rnd() * nodes.length)]; if (sgFor(c2) === p.gen.lobes[0].sg || spec.sgn != null) ni = c2; } const b = one({ ni, lobes }); if (b) kids.push(b); } }); pool = pool.concat(kids); }
    pool.sort((a, b) => a.cost - b.cost);
    const seenK = new Set(), div = pool.filter(c => { const k = Math.round(c.gen.ni / 6) + ':' + Math.round(c.i / 25); if (seenK.has(k)) return false; seenK.add(k); return true; });
    for (const cand of div.slice(0, 40)) { const L = commitLimb(spec, cand, par); if (L) return L; }
    if (dbg.short > spec.search * .8 && !spec.widened && spec.node) return placeOne({ ...spec, widened: true, node: [spec.node[0] - 24, spec.node[1] + 24] }, par);     // nearly every try ran into something at once: look at other nodes
    stats.fail.push(spec.name + ': no candidate fits (' + pool.length + ' tried) ' + JSON.stringify(dbg) + JSON.stringify(why)); return null; }

  function undo(L) { release(L.sid); L.organs.forEach(o => release(o.eid)); L.organs = []; (L.children || []).forEach(undo); const k = limbs.indexOf(L); if (k >= 0) limbs.splice(k, 1); }
  function commitLimb(spec, cd, par) {
    const { g, i, tail, at } = cd, P = g.P.slice(0, i + 1), stemPoly = tail ? P.concat(tail.slice(1)) : P;
    const L = { id: ++limbSeq, name: spec.name, kind: spec.kind, side: spec.side, band: spec.band, parent: par.id, term: spec.term, stem: P, tail: tail || [], head: [], organs: [], children: [], P, TH: g.TH.slice(0, i + 1), S: g.S.slice(0, i + 1), K: g.K.slice(0, i + 1), sgn: spec.sgn ?? cd.gen.lobes[0].sg };
    L.sid = newEl(L, "stem", at, 14); const cells = cellsOf([stemPoly]); if (blocked(cells, [], par.sid, at, 14)) { why.late = (why.late || 0) + 1; return null; } claim(L.sid, cells, []);
    if (spec.term !== 'spiral') { const n = P.length - 1, o = spec.term === 'bud' ? tryOrgan(L, mkBud, n, [0], [spec.endSize || 9, 7.5, 6], { ang: 0, role: 'terminal' }) : tryOrgan(L, mkRose, n, [0], [spec.endSize || 5, 4.2, 3.5], { ang: 0, role: 'terminal' }); if (!o) { why.term = (why.term || 0) + 1; undo(L); return null; } }
    limbs.push(L);
    (spec.shoots || []).forEach(sh => { const c = placeLimb({ search: 150, nl: [2, 3], roomW: 30, minLen: 140, ...sh, name: spec.name + '/' + sh.kind, side: spec.side, band: spec.band, T: sh.T.map((v, k) => k ? v : mirror(spec.side, v)), wp: (sh.wp || []).map(([x, y, t]) => [mirror(spec.side, x), y, t]) }, L); if (c) L.children.push(c); });   // shoots first: they need room beside the stem
    seedFor(spec.name + '#dress'); if (!dressLimb(L, spec)) { why.dress = (why.dress || 0) + 1; undo(L); return null; }
    return L; }

  /* ---- dressing: roses (a bud beside every other one), buds, then leaves from the base outward, each smaller than the last ---- */
  const tanAt = (L, i) => ang(L.P[Math.max(0, i - 3)], L.P[Math.min(L.P.length - 1, i + 3)]);
  function tryOrgan(L, mk, i, sides, sizes, opt = {}) { const P = L.P, t = opt.back ? L.TH[i] + Math.PI : opt.ang === 0 ? L.TH[i] : tanAt(L, i), at = P[i];
    if (hid(at[0], at[1]) || hid(P[Math.max(0, i - 8)][0], P[Math.max(0, i - 8)][1]) || hid(P[Math.min(P.length - 1, i + 8)][0], P[Math.min(P.length - 1, i + 8)][1])) return null;
    for (const side of sides) for (const sz of sizes) for (const an of (opt.angs || [opt.ang])) {
      if (mk === mkLeaf) { const a1 = t + side * (an ?? 50) * D; let bad = false; for (const f of [4, 4 + sz * .45, 4 + sz * .95]) { const x = at[0] + Math.cos(a1) * f, y = at[1] + Math.sin(a1) * f, c = Math.round(x), r = Math.round(y); if (badCell(c, r, L.sid, at, 6) || kindAt(c, r) === 2) { bad = true; break; } } if (bad) continue; }   // a cheap look ahead before the leaf is drawn
      const o = mk(at, t, side, sz, an); const cells = cellsOf(o.polys); if (blocked(cells, o.fill, L.sid, o.at, 6)) continue;
      let w = 0, ob = 0; cells.forEach(([c, r]) => { const k = kindAt(c, r); if (k === 1) w++; else if (k === 2) ob++; }); if (ob > cells.length * .2 || (o.flower && w > cells.length * .22)) continue;
      o.eid = newEl(L, 'organ', o.at, 6); claim(o.eid, cells, o.fill); o.role = opt.role || 'side'; L.organs.push(o); return o; } return null; }
  const leafRun = (L, spec, from, to, L0, first) => { const n = L.P.length - 1, total = L.S[n]; let placed = 0, s = from, side = first, fails = 0, prev = 99;       // leaves alternate strictly, point the way the plant grows, shrink toward the end, never under 5
    const want = spec.leaves ?? 4;
    while (s < to && placed < want && fails < 30) { const t = s / total, Lw = Math.min(prev + 1.1, Math.max(5, L0 * (1 - .5 * t))), i = Math.round(s / DS); const o = tryOrgan(L, mkLeaf, Math.min(n, i), [side], [Lw, Lw * .9, Lw * .8, Lw * .7, Lw * .6].filter(v => v >= 5), { angs: [50, 38, 62] });
      if (o) { placed++; side = -side; prev = o.size; s += o.size * .75 + 4 + t * 4; fails = 0; } else { fails++; s += 2.5; } } return placed; };
  function dressLimb(L, spec) {
    const n = L.P.length - 1, total = L.S[n], sd = L.sgn ? -L.sgn : 1;
    let prevR = 99, prevI = 0;                                                                                                                              // roses are big near the base, smaller further out; each is looked for along the stem, near where it was wanted
    (spec.roses || []).forEach(([t, R], k) => { const R1 = Math.min(R, prevR), sizes = [R1, R1 * .88, R1 * .76, R1 * .66].filter(v => v >= 3.4); let o = null, at0 = 0;
      for (const off of [0, 5, -5, 10, -10, 15, -15, 20, 26, 32]) { const i = Math.round(total * t / DS + off / DS); if (i < Math.max(24, prevI + 30) || i > n - 20) continue; o = tryOrgan(L, mkRose, i, k % 2 ? [sd, -sd] : [-sd, sd], sizes, { angs: [70, 56, 84] }); if (o) { at0 = i; break; } }
      if (o) { prevR = o.size; prevI = at0; if (roseCount++ % 2 === 0) for (const off of [24, 30, -24, 36]) { const j = at0 + off; if (j > 24 && j < n - 10 && tryOrgan(L, mkBud, j, [-o.side, o.side], [7, 6, 5.5], { angs: [50, 62] })) break; } } });               // C: only half of the roses carry a bud
    (spec.buds || []).forEach(t => { tryOrgan(L, mkBud, Math.min(n - 10, Math.max(24, Math.round(total * t / DS))), [sd, -sd], [8, 6.5, 5.5]); });
    { const k0 = L.organs.length, want = spec.leaves ?? 4; let n = leafRun(L, spec, spec.leafFrom ?? 9, total - 4, spec.leaf ?? 12, sd);
      if (n < Math.min(want, 3)) { while (L.organs.length > k0) release(L.organs.pop().eid); n = leafRun(L, spec, spec.leafFrom ?? 9, total - 4, spec.leaf ?? 12, -sd); } }       // if the leaves cannot start on one side, start on the other
    return L.organs.length + (spec.term === 'spiral' ? 1 : 0) >= (spec.minEl ?? 3); }

  /* ---- the composition: which limbs, from the rules (2 to 3 branches per band side), measured against each band's own rows and heading; shoots are free ---- */
  function mirror(side, x) { return side === 'L' ? x : (C - 1) - x; }
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

  /* ---- leaves along the margin vines, last: up, alternating, larger in the middle and thinning toward both ends ---- */
  [L0, R0].forEach(L => { seedFor(L.name + '#leaves'); const n = L.P.length - 1, total = L.S[n]; let s = 12, k = 0;                             // the margin strip is a few stitches wide: the leaves face inward
    while (s < total - 30) { const t = s / total, sz = Math.max(6, 7 + 5 * Math.sin(Math.PI * t)), i = Math.round(s / DS);
      const o = tryOrgan(L, mkLeaf, i, [L.sg], [sz, sz * .85, sz * .7].filter(v => v >= 5), { angs: [50, 38, 62] }); if (o) { s += 12 + k % 2 * 4 + 6 * Math.abs(.5 - t); k++; } else s += 2; } });

  const out = []; limbs.forEach(L => { out.push(L.head.concat(L.stem, L.tail.slice(1))); L.organs.forEach(o => o.polys.forEach(p => out.push(p))); });
  out.limbs = limbs; stats.limbs = limbs.length; return out;
};
