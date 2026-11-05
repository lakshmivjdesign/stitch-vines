// Demo renderer: measures this page, grows the vines, and draws them behind the content in one SVG, in the style picked in the panel.
// The SVG sits behind everything (z-index -1), ignores the pointer, is hidden from assistive technology, and is positioned
// inside the body, so it changes neither the layout nor what can be read or clicked.
(function () {
  const params = new URLSearchParams(location.search), status = document.getElementById('stitch-vines-status'), picker = document.getElementById('stitch-style'), NS = 'http://www.w3.org/2000/svg';
  let worker = null, token = 0, lastW = 0, last = null, style = StitchStyles[params.get('style')] ? params.get('style') : 'cross';
  if (picker) picker.value = style;

  const say = t => { if (status) status.textContent = t; };
  const clear = () => { const old = document.getElementById('stitch-vines-layer'); if (old) old.remove(); };

  function draw(ctx, res) {
    clear();
    const H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), svg = document.createElementNS(NS, 'svg');
    svg.id = 'stitch-vines-layer'; svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.setAttribute('data-stitch-ignore', '');
    svg.setAttribute('viewBox', `0 0 ${ctx.W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
    if (params.has('mask')) {                                            // what the adapter measured: text light, objects darker
      const g = document.createElementNS(NS, 'g'); g.setAttribute('opacity', '.5');
      ctx.grid.forEach((row, r) => { for (let i = 0; i < row.length; i++) if (row[i] !== '0') { const e = document.createElementNS(NS, 'rect'); e.setAttribute('x', ctx.m + (ctx.c0 + i) * ctx.u); e.setAttribute('y', r * ctx.u); e.setAttribute('width', ctx.u); e.setAttribute('height', ctx.u); e.setAttribute('fill', row[i] === '2' ? '#9aa0a8' : '#d9c9a0'); g.appendChild(e); } });
      svg.appendChild(g);
    }
    const t0 = performance.now(), n = StitchStyles[style](svg, ctx, res);
    document.body.insertBefore(svg, document.body.firstChild);
    return { n, drawMs: Math.round(performance.now() - t0) };
  }

  function report(ctx, res) {
    if (!res.limbs) { say(`No vines at ${ctx.W} px: the margin is too narrow for them.`); return; }
    const d = draw(ctx, res);
    say(`${StitchStyleNames[style]}: vines grown in ${(res.ms / 1000).toFixed(1)} s at ${ctx.W} px (${d.n}), drawn in ${d.drawMs} ms.`);
  }

  function grow(plain) {                                                  // in a worker when the page is served over http; on the main thread otherwise
    return new Promise(resolve => {
      try { worker = worker || new Worker('vine-worker.js'); worker.onmessage = e => resolve(e.data); worker.onerror = () => { worker = null; fallback(); }; worker.postMessage(plain); return; } catch (e) { worker = null; }
      fallback();
      function fallback() { setTimeout(() => { const ctx = Object.assign({}, plain), cEnd = ctx.c0 + ctx.grid[0].length; ctx.cell = (c, r) => (c < ctx.c0 || c >= cEnd || r < 0 || r >= ctx.grid.length) ? 0 : +(ctx.grid[r][c - ctx.c0] || 0);
        const t0 = Date.now(), out = window.StitchVines(ctx), res = StitchCollect(out); res.ms = Date.now() - t0; resolve(res); }, 0); }
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
    last = { ctx, res }; window.stitchVinesLast = last;
    report(ctx, res);
  }

  if (picker) picker.addEventListener('change', () => {                    // a new style only redraws; the vines are not grown again
    style = picker.value; const u = new URL(location.href); u.searchParams.set('style', style); history.replaceState(null, '', u);
    if (last) report(last.ctx, last.res);
  });

  let timer = 0;
  addEventListener('resize', () => { if (document.documentElement.clientWidth === lastW) return; clearTimeout(timer); clear(); last = null; say('Width changed: growing new vines…'); timer = setTimeout(run, 500); });
  run();
})();
