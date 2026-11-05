// Drawing styles for the demo. Each one takes the same vines (polylines in stitch units) and draws them into an SVG.
//   StitchStyles[name](svg, ctx, res)  ->  a count for the status line
// Honest labels: cross stitch and charcoal are looks given to the vines as they are. Kolam, zentangle and quilling are
// "inspired by" renderings of the same vine shapes; a real kolam (a dot grid and looping lines) or a real zentangle would need its own generator.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const r1 = v => Math.round(v * 10) / 10;
  const thin = (pl, n) => { const o = []; for (let i = 0; i < pl.length; i += n) o.push(pl[i]); if ((pl.length - 1) % n) o.push(pl[pl.length - 1]); return o; };
  const frame = ctx => { const u = ctx.u, X = x => r1(ctx.m + (x + .5) * u), Y = y => r1((y + .5) * u);
    return { u, X, Y, d: (pl, n = 2, close) => thin(pl, n).map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join('') + (close ? 'Z' : '') }; };
  const cellsOf = polys => { const seen = new Map();   // walk each polyline in steps of 0.35 stitch and round to the nearest cell (docs/layout-contract.md)
    polys.forEach(pl => { for (let i = 0; i < pl.length - 1; i++) { const a = pl[i], b = pl[i + 1], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .35));
      for (let j = 0; j <= k; j++) { const c = Math.round(a[0] + (b[0] - a[0]) * j / k), r = Math.round(a[1] + (b[1] - a[1]) * j / k); seen.set(c * 4096 + r, [c, r]); } } }); return [...seen.values()]; };
  const defs = svg => el('defs', {}, svg);
  const group = (svg, attrs) => el('g', Object.assign({ fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, attrs), svg);
  const path = (g, d, attrs) => el('path', Object.assign({ d }, attrs), g);
  const flowers = items => items.organs.filter(o => o.kind !== 'leaf');
  const leaves = items => items.organs.filter(o => o.kind === 'leaf');

  /* ---- cross stitch: one small cross per cell ---- */
  function cross(svg, ctx, res) {
    const F = frame(ctx), u = ctx.u, s = u * .32, claimed = new Map(), colours = { stem: '#1e6432', leaf: '#28963f', flower: '#1e5ac8' };
    ['stem', 'leaf', 'flower'].forEach(kind => cellsOf(res.parts[kind]).forEach(([c, r]) => claimed.set(c * 4096 + r, [c, r, kind])));       // one class per cell: flowers over leaves over stems
    const d = { stem: [], leaf: [], flower: [] };
    claimed.forEach(([c, r, kind]) => { const x = ctx.m + (c + .5) * u, y = (r + .5) * u; d[kind].push(`M${(x - s).toFixed(1)} ${(y - s).toFixed(1)}l${(2 * s).toFixed(1)} ${(2 * s).toFixed(1)}M${(x + s).toFixed(1)} ${(y - s).toFixed(1)}l${(-2 * s).toFixed(1)} ${(2 * s).toFixed(1)}`); });
    ['stem', 'leaf', 'flower'].forEach(kind => path(group(svg, { stroke: colours[kind], 'stroke-width': (u * .22).toFixed(2) }), d[kind].join('')));
    return claimed.size + ' stitches';
  }

  /* ---- charcoal: soft dark strokes with a rough edge, a grainy fill and a faint smudge underneath ---- */
  function charcoal(svg, ctx, res) {
    const F = frame(ctx), u = ctx.u, df = defs(svg);
    df.innerHTML = '<filter id="sv-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter>'
      + '<filter id="sv-charcoal" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/>'
      + '<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.7 0 0 0 -0.05" result="grain"/><feComposite in="d" in2="grain" operator="in"/></filter>';
    const all = res.parts.stem.concat(res.parts.leaf, res.parts.flower).map(p => F.d(p, 3)).join('');
    path(group(svg, { stroke: '#2a2724', 'stroke-width': u * 1.7, opacity: .1, filter: 'url(#sv-blur)' }), all);                                      // the smudge
    const g = group(svg, { stroke: '#2a2724', filter: 'url(#sv-charcoal)' });
    path(g, res.parts.stem.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .85, opacity: .88 });
    path(g, res.parts.stem.map(p => F.d(p, 3)).join(''), { 'stroke-width': u * .5, opacity: .55, transform: 'translate(.7 .5)' });                      // a second, offset pass: charcoal is never one clean line
    path(g, res.parts.leaf.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .5, opacity: .8 });
    path(g, res.parts.flower.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .62, opacity: .92 });
    return res.limbs + ' limbs';
  }

  /* ---- kolam (inspired): a field of dots, the vines as smooth looping lines between them, in a warm red ---- */
  function kolam(svg, ctx, res) {
    const F = frame(ctx), u = ctx.u, red = '#8a2f22', df = defs(svg);
    df.innerHTML = '<filter id="sv-flour" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>';
    const all = res.parts.stem.concat(res.parts.leaf, res.parts.flower), near = cellsOf(all), dots = new Map(), STEP = 3, R = 6;
    near.forEach(([c, r]) => { for (let i = Math.floor((c - R - 1.5) / STEP); i <= Math.ceil((c + R - 1.5) / STEP); i++) for (let j = Math.floor((r - R - 1.5) / STEP); j <= Math.ceil((r + R - 1.5) / STEP); j++) {
      const x = STEP * i + 1.5, y = STEP * j + 1.5; if (Math.hypot(x - c, y - r) <= R - 1) dots.set(i * 8192 + j, [x, y]); } });             // pulli: dots on a lattice between the stitch cells
    let dd = ''; dots.forEach(([x, y]) => { dd += 'M' + F.X(x) + ' ' + F.Y(y) + 'h.01'; });
    path(group(svg, { stroke: red, 'stroke-width': u * .55, opacity: .75 }), dd);
    const g = group(svg, { stroke: red, filter: 'url(#sv-flour)', opacity: .9 });
    path(g, res.parts.stem.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .62 });
    path(g, res.parts.leaf.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .5 });
    path(g, res.parts.flower.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .5 });
    return dots.size + ' dots';
  }

  /* ---- zentangle (inspired): black pen; stems get an echo line and beads, leaves are hatched or dotted, buds filled ---- */
  function zentangle(svg, ctx, res) {
    const F = frame(ctx), u = ctx.u, ink = '#1b1b1b', df = defs(svg), step = 3;
    const echo = (pl, dist) => { const P = thin(pl, step), segs = []; let cur = [];                                                              // an offset copy of a stem, broken where the stem turns tightly
      P.forEach((p, i) => { const a = P[Math.max(0, i - 2)], b = P[Math.min(P.length - 1, i + 2)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const a1 = Math.atan2(p[1] - a[1], p[0] - a[0]), a2 = Math.atan2(b[1] - p[1], b[0] - p[0]), turn = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
        if (turn > .55) { if (cur.length > 1) segs.push(cur); cur = []; } else cur.push([p[0] - dy / l * dist, p[1] + dx / l * dist]); }); if (cur.length > 1) segs.push(cur); return segs; };
    const g = group(svg, { stroke: ink });
    path(g, res.items.stems.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .3 });
    let ec = '', beads = '';
    res.items.stems.forEach(p => { echo(p, 1.4).forEach(s => { ec += F.d(s, 1); }); echo(p, -1.4).forEach(s => { ec += F.d(s, 1); }); for (let i = 20; i < p.length - 20; i += 18) beads += 'M' + F.X(p[i][0]) + ' ' + F.Y(p[i][1]) + 'h.01'; });
    path(g, ec, { 'stroke-width': u * .12, opacity: .8 });
    path(g, beads, { 'stroke-width': u * .62 });
    leaves(res.items).forEach((o, k) => {                                                                                                         // each leaf: outline, vein, and a fill clipped to its outline
      const out = o.polys[1], id = 'sv-z' + k, cl = el('clipPath', { id }, df); el('path', { d: F.d(out, 1, true) }, cl);
      let cx = 0, cy = 0; out.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= out.length; cy /= out.length;
      const R = o.size * .8, a = o.dir + (k % 2 ? 0 : 1.15), hx = Math.cos(a), hy = Math.sin(a), nx = -hy, ny = hx; let d = '';
      for (let t = -R; t <= R; t += k % 2 ? 1.5 : .9) { const x0 = cx + nx * t, y0 = cy + ny * t;
        if (k % 2) { for (let s = -R; s <= R; s += 1.5) d += 'M' + F.X(x0 + hx * s) + ' ' + F.Y(y0 + hy * s) + 'h.01'; } else d += 'M' + F.X(x0 - hx * R) + ' ' + F.Y(y0 - hy * R) + 'L' + F.X(x0 + hx * R) + ' ' + F.Y(y0 + hy * R); }
      path(el('g', { 'clip-path': 'url(#' + id + ')', fill: 'none', stroke: ink, 'stroke-linecap': 'round' }, svg), d, { 'stroke-width': k % 2 ? u * .42 : u * .15 });
      path(g, F.d(o.polys[0], 2) + F.d(out, 2, true) + F.d(o.polys[2], 2), { 'stroke-width': u * .22 });
    });
    flowers(res.items).forEach(o => { path(g, o.polys.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .24 }); if (o.kind === 'bud') path(g, F.d(o.polys[1], 2, true), { fill: ink, 'stroke-width': u * .1 }); });
    return res.limbs + ' limbs';
  }

  /* ---- quilling (inspired): flat paper strips with a little shadow; leaves and buds are pinched coils, roses tight coils ---- */
  function quilling(svg, ctx, res) {
    const F = frame(ctx), u = ctx.u, df = defs(svg);
    df.innerHTML = '<filter id="sv-paper" x="-3%" y="-3%" width="106%" height="106%"><feDropShadow dx="0.7" dy="1.3" stdDeviation="0.7" flood-color="#1a1a1a" flood-opacity="0.38"/></filter>';
    const g = group(svg, { filter: 'url(#sv-paper)' });
    path(g, res.items.stems.map(p => F.d(p, 2)).join(''), { stroke: '#2f7d4f', 'stroke-width': u * .7 });
    path(g, res.items.stems.map(p => F.d(p, 2)).join(''), { stroke: '#7ccf97', 'stroke-width': u * .2 });                                     // the lit face of the strip
    leaves(res.items).forEach(o => { path(g, F.d(o.polys[0], 2), { stroke: '#2f7d4f', 'stroke-width': u * .5 }); path(g, F.d(o.polys[1], 2, true), { fill: '#4fae6a', stroke: '#2f7d4f', 'stroke-width': u * .22 }); path(g, F.d(o.polys[2], 2), { stroke: '#a6e3b8', 'stroke-width': u * .2 }); });
    flowers(res.items).forEach(o => { const col = o.kind === 'rose' ? '#d9556c' : '#e3a63c', dark = o.kind === 'rose' ? '#a73349' : '#b87b17';
      path(g, F.d(o.polys[0], 2), { stroke: '#2f7d4f', 'stroke-width': u * .5 });
      path(g, F.d(o.polys[1], 2, true), { fill: o.kind === 'bud' ? col : 'none', stroke: o.kind === 'bud' ? dark : col, 'stroke-width': o.kind === 'bud' ? u * .22 : u * .6 });
      path(g, F.d(o.polys[2], 2), { stroke: o.kind === 'rose' ? dark : col, 'stroke-width': u * .5 });
      for (let i = 3; i < o.polys.length; i++) path(g, F.d(o.polys[i], 1), { stroke: '#2f7d4f', 'stroke-width': u * .35 }); });
    return res.limbs + ' limbs';
  }

  window.StitchStyles = { cross, charcoal, kolam, zentangle, quilling };
  window.StitchStyleNames = { cross: 'Cross stitch', charcoal: 'Charcoal', kolam: 'Kolam (inspired)', zentangle: 'Zentangle (inspired)', quilling: 'Quilling (inspired)' };
})();
