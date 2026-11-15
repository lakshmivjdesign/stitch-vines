// The three looks. Each takes the same vines (polylines in stitch units) and draws them into an SVG; a look never moves anything. Each one takes the same vines (polylines in stitch units) and draws them into an SVG.
//   StitchStyles[name](svg, ctx, res)  ->  a count for the status line
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // One ink per drawing (monochrome). The four inks: white, indigo, terracotta, charcoal. `colors.stem` (or colors: { stem }) overrides it with any css colour.
  const INKS = { white: '#ffffff', indigo: '#2A3A8F', terracotta: '#9A3A1E', charcoal: '#1D1C1A' };
  const inkOf = (opt, dflt) => (opt && opt.colors && (opt.colors.stem || opt.colors.leaf)) || INKS[opt && opt.ink] || INKS[dflt];
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
  function cross(svg, ctx, res, opt) {
    const F = frame(ctx), u = ctx.u, s = u * .32, claimed = new Map(), ink = inkOf(opt, 'indigo'), colours = Object.assign({ stem: ink, leaf: ink, flower: ink }, opt && opt.colors);
    ['stem', 'leaf', 'flower'].forEach(kind => cellsOf(res.parts[kind]).forEach(([c, r]) => claimed.set(c * 4096 + r, [c, r, kind])));       // one class per cell: flowers over leaves over stems
    const d = { stem: [], leaf: [], flower: [] };
    claimed.forEach(([c, r, kind]) => { const x = ctx.m + (c + .5) * u, y = (r + .5) * u; d[kind].push(`M${(x - s).toFixed(1)} ${(y - s).toFixed(1)}l${(2 * s).toFixed(1)} ${(2 * s).toFixed(1)}M${(x + s).toFixed(1)} ${(y - s).toFixed(1)}l${(-2 * s).toFixed(1)} ${(2 * s).toFixed(1)}`); });
    ['stem', 'leaf', 'flower'].forEach(kind => path(group(svg, { stroke: colours[kind], 'stroke-width': (u * .22).toFixed(2) }), d[kind].join('')));
    return claimed.size + ' stitches';
  }

  /* ---- charcoal: soft dark strokes with a rough edge, a grainy fill and a faint smudge underneath ---- */
  function charcoal(svg, ctx, res, opt) {
    const F = frame(ctx), u = ctx.u, df = defs(svg), INK = inkOf(opt, 'charcoal');
    df.innerHTML = '<filter id="sv-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter>'
      + '<filter id="sv-charcoal" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/>'
      + '<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="9" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.7 0 0 0 -0.05" result="grain"/><feComposite in="d" in2="grain" operator="in"/></filter>';
    const all = res.parts.stem.concat(res.parts.leaf, res.parts.flower).map(p => F.d(p, 3)).join('');
    path(group(svg, { stroke: INK, 'stroke-width': u * 1.7, opacity: .1, filter: 'url(#sv-blur)' }), all);                                      // the smudge
    const g = group(svg, { stroke: INK, filter: 'url(#sv-charcoal)' });
    path(g, res.parts.stem.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .85, opacity: .88 });
    path(g, res.parts.stem.map(p => F.d(p, 3)).join(''), { 'stroke-width': u * .5, opacity: .55, transform: 'translate(.7 .5)' });                      // a second, offset pass: charcoal is never one clean line
    path(g, res.parts.leaf.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .5, opacity: .8 });
    path(g, res.parts.flower.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .62, opacity: .92 });
    return res.limbs + ' limbs';
  }

  /* ---- pencil: a hard graphite line, drawn twice with a hair of difference, leaves lightly hatched, buds and roses shaded; a little paper grain ---- */
  function pencil(svg, ctx, res, opt) {
    const F = frame(ctx), u = ctx.u, ink = inkOf(opt, 'charcoal'), df = defs(svg);
    df.innerHTML = '<filter id="sv-pencil" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.1" xChannelSelector="R" yChannelSelector="G" result="d"/>'
      + '<feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="3" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.55" result="grain"/><feComposite in="d" in2="grain" operator="in"/></filter>';
    const g = group(svg, { stroke: ink, filter: 'url(#sv-pencil)' });
    path(g, res.parts.stem.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .24, opacity: .92 });
    path(g, res.parts.stem.map(p => F.d(p, 3)).join(''), { 'stroke-width': u * .16, opacity: .5, transform: 'translate(.5 .35)' });                  // the second pass
    leaves(res.items).forEach((o, k) => { const out = o.polys[1], id = 'sv-p' + k, cl = el('clipPath', { id }, df); el('path', { d: F.d(out, 1, true) }, cl);
      let cx = 0, cy = 0; out.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= out.length; cy /= out.length; const R = o.size * .8, a = o.dir + 1.0, hx = Math.cos(a), hy = Math.sin(a), nx = -hy, ny = hx; let d = '';
      for (let t = -R; t <= R; t += 1.1) { const x0 = cx + nx * t, y0 = cy + ny * t; d += 'M' + F.X(x0 - hx * R) + ' ' + F.Y(y0 - hy * R) + 'L' + F.X(x0 + hx * R) + ' ' + F.Y(y0 + hy * R); }
      path(el('g', { 'clip-path': 'url(#' + id + ')', fill: 'none', stroke: ink, 'stroke-linecap': 'round', opacity: .55 }, svg), d, { 'stroke-width': u * .1 });
      path(g, F.d(o.polys[0], 2) + F.d(out, 2, true) + F.d(o.polys[2], 2), { 'stroke-width': u * .2 }); });
    flowers(res.items).forEach(o => { path(g, o.polys.map(p => F.d(p, 2)).join(''), { 'stroke-width': u * .22 }); if (o.kind === 'bud') path(g, F.d(o.polys[1], 2, true), { fill: ink, 'fill-opacity': .22, 'stroke-width': u * .2 }); });
    return res.limbs + ' limbs';
  }

  window.StitchStyles = { cross, charcoal, pencil };
  window.StitchStyleNames = { cross: 'Cross stitch', charcoal: 'Charcoal', pencil: 'Pencil' };
  // the main colours each look draws with, so a page can check them against its text colour (WCAG contrast)
  window.StitchInks = INKS;
  window.StitchStyleColours = { cross: Object.values(INKS), charcoal: Object.values(INKS), pencil: Object.values(INKS) };
})();
