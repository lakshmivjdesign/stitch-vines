/* stitch-vines RUNTIME: the one script people add to a page.
     <script src="stitch-vines.js" defer></script>      (optionally before it:  <script>window.StitchVinesConfig = { look: 'pencil' }</script>)
   It waits for the page to settle, measures it (only boxes, never text or pictures), grows the vines in a background worker (the page stays usable),
   draws them in one SVG BEHIND the content (aria-hidden, no pointer events, no layout shift), remembers the result per page width, and re-fits when the window width changes.
   If something does not fit, it says why in plain words (StitchVines.status, the 'stitchvines:status' event, and the element in config.status) and changes nothing. */
(function () {
  const CORE_SRC = __CORE_SRC__, WORKER_GLUE = __WORKER_GLUE__;       // the engine, planner and worker code as text, run in the worker (filled in by tools/build.js)
  const defaults = {
    look: 'cross',                // 'cross' | 'charcoal' | 'pencil'
    ink: 'indigo',                // one colour for the whole drawing: 'white' | 'indigo' | 'terracotta' | 'charcoal'
    textClear: true,              // vines keep out of text (WCAG). false: they may pass under words; then YOU check the contrast
    density: 'normal',            // 'sparse' (margin vines only) | 'normal' | 'rich' (more branches where there is room)
    maxHeight: 10000,             // plan the first N css px of the page (long pages: vines for the first screens)
    zIndex: -1,                   // the layer sits behind the content; raise it if your page paints a background over it
    colors: null,                 // optional: { stem } with any css colour replaces the ink
    objects: null,                // css selector for what vines must stay out of; null: images, video, canvas, svg, iframes, figures, cards, buttons, form controls
    ignore: '[data-stitch-ignore]',
    budgetMs: 3000,               // time the worker may spend on branches after the margin vines (they appear first)
    cache: true,                  // remember the result per page and width in localStorage
    status: null,                 // css selector of an element whose text shows the status message
    auto: true,                   // start by itself when the page has loaded
    toast: false,                 // show the status in a small note in the corner (used by the bookmarklet); it fades after 8 seconds
    debug: false
  };
  const cfg = Object.assign({}, defaults, window.StitchVinesConfig || {});
  const me = document.currentScript; if (me) for (const k of ['look', 'ink', 'density', 'status']) if (me.dataset && me.dataset[k]) cfg[k] = me.dataset[k];
  const A = window.StitchVinesAdapter, NS = 'http://www.w3.org/2000/svg', SIZES = [6.5, 5.5, 4.5];
  let worker = null, token = 0, lastW = -1, last = null, timer = 0, started = false;
  const api = window.stitchVines = { config: cfg, status: { state: 'idle', message: 'Not started.' }, stats: {} };

  const say = (state, message, extra) => { api.status = Object.assign({ state, message }, extra || {}); const el = cfg.status && document.querySelector(cfg.status); if (el) el.textContent = message;
    if (cfg.toast) { let t = document.getElementById('stitch-vines-toast'); if (!t) { t = document.createElement('div'); t.id = 'stitch-vines-toast'; t.setAttribute('role', 'status'); t.setAttribute('data-stitch-ignore', ''); t.style.cssText = 'position:fixed;left:12px;bottom:12px;max-width:340px;z-index:2147483647;background:#fff;color:#111;border:1px solid #888;border-radius:6px;padding:8px 12px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25)'; document.body.appendChild(t); } t.textContent = message; t.style.display = 'block'; clearTimeout(t._h); if (state !== 'working') t._h = setTimeout(() => { t.style.display = 'none'; }, 8000); }
    if (cfg.debug) console.info('[stitch-vines] ' + state + ': ' + message); try { document.dispatchEvent(new CustomEvent('stitchvines:status', { detail: api.status })); } catch (e) { /* old browser */ } };
  const clear = () => { const old = document.getElementById('stitch-vines-layer'); if (old) old.remove(); };
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- packing: the worker sends flat number lists, rounded to a tenth of a stitch (about 100 KB for a long page) ---- */
  const unpack = r => { const pairs = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
    const parts = { stem: [], leaf: [], flower: [] }, items = { stems: [], organs: [] };
    r.stems.forEach(s => { const p = pairs(s); parts.stem.push(p); items.stems.push(p); });
    r.organs.forEach(o => { const polys = o.polys.map(pairs); polys.forEach(p => parts[o.kind === 'leaf' ? 'leaf' : 'flower'].push(p)); items.organs.push({ kind: o.kind, dir: o.dir, size: o.size, polys }); });
    return { parts, items, limbs: r.limbs }; };

  function draw(r) {
    clear(); if (!r || !r.stems || !r.stems.length) return;
    const look = window.StitchStyles[cfg.look] ? cfg.look : 'cross', svg = document.createElementNS(NS, 'svg');
    svg.id = 'stitch-vines-layer'; svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); svg.setAttribute('data-stitch-ignore', '');
    svg.setAttribute('viewBox', `0 0 ${r.W} ${r.H}`); svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = `position:absolute;left:0;top:0;width:${r.W}px;height:${r.H}px;overflow:hidden;pointer-events:none;z-index:${cfg.zIndex};` + (reduced() ? '' : 'opacity:0;transition:opacity .5s');
    if (cfg.ink === 'white' && !(cfg.colors && (cfg.colors.stem || cfg.colors.leaf))) svg.style.filter = 'drop-shadow(0 1px 1px rgba(74,58,36,.45))';          // white thread: only a faint shadow keeps it readable on paper
    const t0 = performance.now(), res = unpack(r); window.StitchStyles[cfg.look] ? window.StitchStyles[look](svg, { u: r.u, m: r.m, W: r.W }, res, { colors: cfg.colors, ink: cfg.ink }) : 0;
    document.body.insertBefore(svg, document.body.firstChild);
    const b = svg.getBoundingClientRect(); const dx = -(b.left + window.pageXOffset), dy = -(b.top + window.pageYOffset); if (Math.abs(dx) > .5 || Math.abs(dy) > .5) svg.style.transform = `translate(${dx}px,${dy}px)`;   // a positioned body: the layer still starts at the page corner
    if (!reduced()) requestAnimationFrame(() => { svg.style.opacity = '1'; });
    api.stats.drawMs = Math.round(performance.now() - t0);
  }

  /* ---- the cache: per page, width and a fingerprint of the layout, so a changed page is never drawn with old vines ---- */
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const cKey = fp => 'stitchvines:v1:' + location.origin + location.pathname + ':' + fp;
  const cGet = k => { if (!cfg.cache) return null; try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
  const cPut = (k, r) => { if (!cfg.cache) return; try { const t = JSON.stringify(r); if (t.length > 400000) return; api.stats.cacheBytes = t.length;
      const idx = JSON.parse(localStorage.getItem('stitchvines:v1:index') || '[]').filter(x => x !== k); idx.push(k); while (idx.length > 8) localStorage.removeItem(idx.shift()); localStorage.setItem('stitchvines:v1:index', JSON.stringify(idx)); localStorage.setItem(k, t); } catch (e) { /* storage full or blocked: no cache */ } };

  function getWorker() {
    if (worker) return worker;
    try { const src = 'self.window = self;\n' + CORE_SRC + '\n' + WORKER_GLUE; worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); return worker; } catch (e) { worker = null; return null; }
  }

  async function run() {
    const my = ++token; clear(); last = null;
    if (!A) { say('error', 'stitch-vines: the page adapter is missing.'); return; }
    say('working', 'Looking at the page…');
    await A.ready(8000); if (my !== token) return;
    const t0 = performance.now(), s = A.scan({ maxHeight: cfg.maxHeight, ignore: cfg.ignore, objects: cfg.objects || A.defaults.objects }); lastW = s.W;
    if (!s.W) { say('none', 'The page has no width yet (hidden tab or pane). Nothing was measured.'); lastW = -1; return; }
    if (s.problems.length) { say('none', 'This page does not fit: ' + s.problems[0] + '. Nothing was drawn and nothing on the page was changed.', { fits: false }); return; }
    const mg = A.margins(s), m = Math.max(0, Math.floor(Math.min(mg.left, mg.right))), variants = SIZES.map(u => A.rasterize(s, u, m, 1, 1.5));
    api.stats.measureMs = Math.round(performance.now() - t0);
    const fp = [s.W, Math.round(s.docH), s.text.length, s.objs.length, Math.round(s.top), Math.round(s.foot), m, cfg.textClear, cfg.density, cfg.maxHeight].join('|'), key = cKey(hash(fp));
    const hit = cGet(key); if (hit && hit.ok) { api.stats.cache = 'hit'; last = hit; api.lattice = { u: hit.u, m: hit.m }; draw(hit); say('ready', hit.message, { fits: true, cached: true }); return; }
    api.stats.cache = 'miss'; const w = getWorker();
    if (!w) { say('error', 'Vines could not be grown: this browser or the page\'s security policy does not allow a background worker (a Blob worker). The page was left as it is.', { fits: null }); return; }
    say('working', 'Growing vines in the background… the page stays usable.');
    const tg = performance.now(), H = Math.ceil(Math.min(s.docH, cfg.maxHeight + 400));
    w.onmessage = e => { const d = e.data; if (d.id !== my || my !== token) return;
      if (d.stage === 'margins') { if (d.result && d.result.real) { draw(Object.assign({ W: s.W, H }, d.result)); say('working', 'Margin vines are in; branches are still growing…'); } return; }
      api.stats.growMs = Math.round(performance.now() - tg);
      if (!d.result || !d.result.stems.length) { last = null; clear(); say('none', d.message, { fits: false }); return; }
      const r = Object.assign({ W: s.W, H, ok: true, message: d.message }, d.result); last = r; api.lattice = { u: r.u, m: r.m }; draw(r); cPut(key, r); say('ready', d.message, { fits: true, cached: false }); };
    w.onerror = ev => { worker = null; say('error', 'The background worker failed: ' + (ev && ev.message || 'unknown error') + '. The page was left as it is.'); };
    w.postMessage({ id: my, variants: variants.map(v => ({ u: v.u, m: v.m, W: v.W, top: v.top, foot: v.foot, C: v.C, R: v.R, c0: v.c0, grid: v.grid })), opts: { textClear: cfg.textClear, density: cfg.density, budgetMs: cfg.budgetMs } });
    // a worker that never answers (a very slow device): give up after a hard limit and say so
    setTimeout(() => { if (my === token && api.status.state === 'working') { try { w.terminate(); } catch (e) { /* */ } worker = null; clear(); say('none', 'This page took too long to plan on this device, so no vines were drawn. Nothing on the page was changed.', { fits: null }); } }, Math.max(15000, cfg.budgetMs * 5));
  }

  api.start = () => { if (started) return; started = true; run();
    addEventListener('resize', () => { if (document.documentElement.clientWidth === lastW) return; clearTimeout(timer); token++; clear(); timer = setTimeout(run, 500); }); };
  api.refresh = () => { run(); };
  api.stop = () => { token++; clear(); if (worker) { try { worker.terminate(); } catch (e) { /* */ } worker = null; } say('idle', 'Stopped.'); };
  api.setInk = name => { if (!window.StitchInks || !window.StitchInks[name]) return false; cfg.ink = name; if (last) draw(last); return true; };
  api.setLook = name => { if (!window.StitchStyles[name]) return false; cfg.look = name; if (last) draw(last); return true; };
  if (cfg.auto) { const go = () => api.start(); if (document.readyState === 'complete') setTimeout(go, 0); else addEventListener('load', () => setTimeout(go, 0)); }
})();
