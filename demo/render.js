// Demo renderer: measures this page, grows the vines, and draws them behind the content as cross stitches in one SVG.
// The SVG sits behind everything (z-index -1), ignores the pointer, is hidden from assistive technology, and is positioned
// inside the body, so it changes neither the layout nor what can be read or clicked.
(function () {
  const params = new URLSearchParams(location.search), status = document.getElementById('stitch-vines-status'), NS = 'http://www.w3.org/2000/svg';
  const colours = { stem: '#1e6432', leaf: '#28963f', flower: '#1e5ac8' };
  let worker = null, token = 0, lastW = 0;

  const say = t => { if (status) status.textContent = t; };
  const clear = () => { const old = document.getElementById('stitch-vines-layer'); if (old) old.remove(); };

  // walk each polyline in steps of 0.35 stitch and round to the nearest cell (docs/layout-contract.md)
  function cellsOf(polys) {
    const seen = new Map();
    polys.forEach(pl => { for (let i = 0; i < pl.length - 1; i++) { const a = pl[i], b = pl[i + 1], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .35));
      for (let j = 0; j <= k; j++) { const c = Math.round(a[0] + (b[0] - a[0]) * j / k), r = Math.round(a[1] + (b[1] - a[1]) * j / k); seen.set(c * 4096 + r, [c, r]); } } });
    return [...seen.values()];
  }

  function draw(ctx, parts) {
    clear();
    const H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), svg = document.createElementNS(NS, 'svg');
    svg.id = 'stitch-vines-layer'; svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.setAttribute('data-stitch-ignore', '');
    svg.setAttribute('viewBox', `0 0 ${ctx.W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
    if (params.has('mask')) {                                            // what the adapter measured: text light, objects darker
      const g = document.createElementNS(NS, 'g'); g.setAttribute('opacity', '.5');
      ctx.grid.forEach((row, r) => { for (let i = 0; i < row.length; i++) if (row[i] !== '0') { const e = document.createElementNS(NS, 'rect'); e.setAttribute('x', ctx.m + (ctx.c0 + i) * ctx.u); e.setAttribute('y', r * ctx.u); e.setAttribute('width', ctx.u); e.setAttribute('height', ctx.u); e.setAttribute('fill', row[i] === '2' ? '#9aa0a8' : '#d9c9a0'); g.appendChild(e); } });
      svg.appendChild(g);
    }
    const u = ctx.u, s = u * .32, claimed = new Map();                   // one class per cell: flowers over leaves over stems
    ['stem', 'leaf', 'flower'].forEach(kind => cellsOf(parts[kind]).forEach(([c, r]) => claimed.set(c * 4096 + r, [c, r, kind])));
    const d = { stem: [], leaf: [], flower: [] };
    claimed.forEach(([c, r, kind]) => { const x = ctx.m + (c + .5) * u, y = (r + .5) * u; d[kind].push(`M${(x - s).toFixed(1)} ${(y - s).toFixed(1)}l${(2 * s).toFixed(1)} ${(2 * s).toFixed(1)}M${(x + s).toFixed(1)} ${(y - s).toFixed(1)}l${(-2 * s).toFixed(1)} ${(2 * s).toFixed(1)}`); });
    ['stem', 'leaf', 'flower'].forEach(kind => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d[kind].join('')); p.setAttribute('stroke', colours[kind]); p.setAttribute('stroke-width', (u * .22).toFixed(2)); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('fill', 'none'); svg.appendChild(p); });
    document.body.insertBefore(svg, document.body.firstChild);
    return claimed.size;
  }

  function grow(plain) {                                                  // in a worker when the page is served over http; on the main thread otherwise
    return new Promise(resolve => {
      try { worker = worker || new Worker('vine-worker.js'); worker.onmessage = e => resolve(e.data); worker.onerror = () => { worker = null; fallback(); }; worker.postMessage(plain); return; } catch (e) { worker = null; }
      fallback();
      function fallback() { setTimeout(() => { const ctx = Object.assign({}, plain), cEnd = ctx.c0 + ctx.grid[0].length; ctx.cell = (c, r) => (c < ctx.c0 || c >= cEnd || r < 0 || r >= ctx.grid.length) ? 0 : +(ctx.grid[r][c - ctx.c0] || 0);
        const t0 = Date.now(), out = window.StitchVines(ctx), parts = { stem: [], leaf: [], flower: [] };
        out.limbs.forEach(l => { parts.stem.push(l.head.concat(l.stem, l.tail)); l.organs.forEach(o => o.polys.forEach(p => parts[o.kind === 'leaf' ? 'leaf' : 'flower'].push(p))); });
        resolve({ parts, ms: Date.now() - t0, limbs: out.limbs.length }); }, 0); }
    });
  }

  async function run() {
    const mine = ++token;
    await StitchVinesAdapter.ready();
    const ctx = StitchVinesAdapter.measure(), W = ctx.W; lastW = W;
    window.stitchVinesLast = { ctx };                                      // for looking at it from the console
    if (!ctx.ok) { say('No vines: ' + ctx.notes.join('; ')); if (!W) lastW = -1; return; }   // a hidden pane has no width: the next resize tries again
    say('Growing vines… (the page is already usable; this takes a few seconds)');
    const res = await grow(StitchVinesAdapter.snapshot(ctx));
    if (mine !== token) return;                                            // the window was resized meanwhile: a newer run is on its way
    const n = draw(ctx, res.parts);
    window.stitchVinesLast = { ctx, res };
    say(res.limbs ? `Vines grown in ${(res.ms / 1000).toFixed(1)} s at ${W} px (${res.limbs} limbs, ${n} stitches).` : `No vines at ${W} px: the margin is too narrow for them.`);
  }

  let timer = 0;
  addEventListener('resize', () => { if (document.documentElement.clientWidth === lastW) return; clearTimeout(timer); clear(); say('Width changed: growing new vines…'); timer = setTimeout(run, 500); });
  run();
})();
