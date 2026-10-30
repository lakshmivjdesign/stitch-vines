/* stitch-vines page adapter: reads a live page and builds the layout description (`ctx`) that src/vine-grow.js needs (docs/layout-contract.md).
   Plain JS, no dependencies, no build step. Load it as a script, then:
     const ctx = StitchVinesAdapter.measure({ u: 6.5, headings: 'h2' });      // ctx.ok is false (and ctx.notes says why) when the page has no heading with a row of cards
     const polylines = window.StitchVines(ctx);
   Wait for fonts and images first (their size moves everything): `await StitchVinesAdapter.ready()`.
   Everything is configurable with CSS selectors; the defaults are in `defaults` below.
   The lattice: column c covers x from m + c*u to m + (c+1)*u (css px, page coordinates); row r covers y from r*u to (r+1)*u. A cell is marked when it overlaps a padded box.
   Text boxes come from real line boxes (text ranges), padded one stitch; objects are padded one and a half stitches. Objects win over text where they overlap. */
(function (root) {
  const defaults = {
    u: 6.5,                 // stitch size in css px. With `fit` it is nudged so the content width is a whole number of stitches (the page then sits on the lattice)
    fit: true,
    m: null,                // side margin in css px; null: the left edge of `container`
    container: 'main',      // the content column (falls back to the body); headings and rows are looked for inside it
    scope: 'body',          // where text and objects are looked for
    top: 'header',          // nothing grows above the bottom edge of the first match (none: the page top)
    foot: 'footer',         // the footer's top edge is the first match's top (none: the page bottom)
    headings: 'h2',         // one per section
    cards: 'img, picture, video, canvas, figure, .card, [data-stitch-card]',   // what makes a row: the cards and images between a heading and the next heading
    rows: null,             // or the row containers themselves (one per section), instead of working them out from `cards`
    minCard: 6,             // a card or image smaller than this (in stitches, both ways) does not make a row
    objects: 'img, picture, video, canvas, svg, iframe, figure, .card, [data-stitch-card], button, [role="button"], .btn, input, select, textarea',   // (links are text, not objects; add 'nav' for a nav bar that should be solid)
    rules: [{ selector: 'header', edge: 'bottom' }, { selector: 'footer', edge: 'top' }],   // lines a vine keeps clear of, drawn across the content width
    text: null,             // selector limiting where text counts (null: all text in `scope`)
    ignore: '[data-stitch-ignore]',   // never measured (the vine overlay itself, status notes)
    textPad: 1,             // stitches around each line of text
    objectPad: 1.5          // stitches around each object
  };

  const pageX = () => root.pageXOffset || 0, pageY = () => root.pageYOffset || 0;
  const r3 = v => Math.round(v * 1000) / 1000;

  function visible(el) {
    if (el.checkVisibility) { try { return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }); } catch (e) { /* fall through */ } }
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = root.getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false; }
    return true;
  }
  const boxOf = rect => ({ left: rect.left + pageX(), right: rect.right + pageX(), top: rect.top + pageY(), bottom: rect.bottom + pageY() });

  function measure(options) {
    const o = Object.assign({}, defaults, options || {}), doc = root.document, notes = [];
    const ignored = el => !!(o.ignore && el.closest && el.closest(o.ignore));
    const all = (sel, within) => [...(within || doc).querySelectorAll(sel)].filter(el => !ignored(el) && visible(el));
    const first = sel => sel ? all(sel)[0] || null : null;

    const W = doc.documentElement.clientWidth, docH = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    if (W < 1) return { ok: false, u: o.u, m: 0, W, top: 0, foot: 0, heads: [], rows: [], cell: () => 0, C: 0, R: 0, c0: 0, cStart: 0, cEnd: 0, grid: [], notes: ['the page has no width (hidden tab or pane): nothing to measure'] };
    const container = (o.container && doc.querySelector(o.container)) || doc.body, scope = doc.querySelector(o.scope) || doc.body;
    const cBox = boxOf(container.getBoundingClientRect());
    const m = o.m != null ? o.m : r3(Math.max(0, cBox.left));
    if (Math.abs((W - cBox.right) - m) > 2 && o.m == null) notes.push('the content column is not centred (left margin ' + r3(m) + ' px, right ' + r3(W - cBox.right) + ' px): the generator assumes equal margins');
    const C = Math.max(1, Math.round((W - 2 * m) / o.u)), u = o.fit ? (W - 2 * m) / C : o.u;
    if (m < 4 * u) notes.push('the side margin is only ' + r3(m / u) + ' stitches: there is no room for the margin vines');

    const topEl = first(o.top), footEl = first(o.foot);
    const top = topEl ? r3(boxOf(topEl.getBoundingClientRect()).bottom) : 0, foot = footEl ? r3(boxOf(footEl.getBoundingClientRect()).top) : docH;
    if (!topEl) notes.push('no element matches the top selector "' + o.top + '": vines may grow up to the page top');
    if (!footEl) notes.push('no element matches the footer selector "' + o.foot + '": the page bottom is taken as the footer');

    /* ---- sections: a heading, then the row of cards or images that follows it ---- */
    const textBox = el => { const rs = []; const tw = doc.createTreeWalker(el, 4); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.nodeValue.trim()) continue; const rg = doc.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0 && r.height > 0) rs.push(boxOf(r)); }
      if (!rs.length) return boxOf(el.getBoundingClientRect()); return { left: Math.min(...rs.map(b => b.left)), right: Math.max(...rs.map(b => b.right)), top: Math.min(...rs.map(b => b.top)), bottom: Math.max(...rs.map(b => b.bottom)) }; };
    const heads = [], rows = [];
    const headEls = all(o.headings, container).map(el => ({ el, box: textBox(el) })).filter(h => h.box.bottom > top).sort((a, b) => a.box.top - b.box.top);
    const cardBoxes = o.rows ? all(o.rows, container).map(el => boxOf(el.getBoundingClientRect()))
      : all(o.cards, container).map(el => boxOf(el.getBoundingClientRect())).filter(b => b.right - b.left >= o.minCard * u && b.bottom - b.top >= o.minCard * u);
    headEls.forEach((h, i) => { const end = i + 1 < headEls.length ? headEls[i + 1].box.top : foot, mine = cardBoxes.filter(b => b.top >= h.box.bottom - 1 && b.top < end);
      if (!mine.length) { notes.push('heading "' + (h.el.textContent || '').trim().slice(0, 30) + '" has no row of cards or images after it: left out of the sections (it still counts as text)'); return; }
      heads.push({ top: r3(h.box.top), bottom: r3(h.box.bottom), left: r3(h.box.left), right: r3(h.box.right) });
      rows.push({ top: r3(Math.min(...mine.map(b => b.top))), bottom: r3(Math.max(...mine.map(b => b.bottom))) }); });
    if (!heads.length) notes.push('no section found: the generator needs at least one heading ("' + o.headings + '") followed by a row of cards or images ("' + (o.rows || o.cards) + '")');

    /* ---- the cell mask: 0 free, 1 text, 2 object ---- */
    const cStart = -Math.ceil(m / u), cEnd = Math.ceil((W - m) / u), NC = cEnd - cStart, R = Math.ceil(docH / u), NR = Math.max(R, Math.ceil(foot / u) + 15), mask = new Uint8Array(NC * NR);
    const E = 1e-6, mark = (b, pad, kind) => { const p = pad * u, x0 = b.left - p, x1 = b.right + p, y0 = b.top - p, y1 = b.bottom + p;
      const c0 = Math.max(cStart, Math.floor((x0 - m) / u + E)), c1 = Math.min(cEnd - 1, Math.ceil((x1 - m) / u - E) - 1), r0 = Math.max(0, Math.floor(y0 / u + E)), r1 = Math.min(NR - 1, Math.ceil(y1 / u - E) - 1);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r * NC + c - cStart; if (mask[k] < kind) mask[k] = kind; } };
    const scopes = o.text ? all(o.text, scope) : [scope], seen = new Set(), vis = new Map();
    scopes.forEach(s => { const tw = doc.createTreeWalker(s, 4); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (seen.has(n) || !n.nodeValue.trim()) continue; seen.add(n); const p = n.parentElement; if (!p) continue;
      if (!vis.has(p)) vis.set(p, !ignored(p) && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName) && visible(p)); if (!vis.get(p)) continue;
      const rg = doc.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width >= 2 && r.height >= 2) mark(boxOf(r), o.textPad, 1); } });
    all(o.objects, scope).forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) mark(boxOf(r), o.objectPad, 2); });
    (o.rules || []).forEach(rule => all(rule.selector, scope).forEach(el => { const b = boxOf(el.getBoundingClientRect()), y = rule.edge === 'top' ? b.top : b.bottom; mark({ left: Math.max(b.left, m), right: Math.min(b.right, W - m), top: y, bottom: y }, o.objectPad, 2); }));

    const cell = (c, r) => (c < cStart || c >= cEnd || r < 0 || r >= NR) ? 0 : mask[r * NC + c - cStart];
    const grid = []; for (let r = 0; r < NR; r++) { let s = ''; for (let c = cStart; c < cEnd; c++) s += mask[r * NC + c - cStart]; grid.push(s); }
    return { ok: heads.length > 0, u, m, W, top, foot, heads, rows, cell, C, R, c0: cStart, cStart, cEnd, grid, notes };
  }

  // the plain data version of a ctx (what tests/fixtures/layout-*.json hold: `cell` replaced by `grid`)
  function snapshot(ctx) { const o = {}; ['u', 'm', 'W', 'top', 'foot', 'heads', 'rows', 'C', 'R', 'c0', 'grid'].forEach(k => { o[k] = ctx[k]; }); return o; }

  // resolves when fonts and images have loaded, so the measured positions are the final ones
  async function ready() {
    const doc = root.document;
    if (doc.readyState !== 'complete') await new Promise(res => root.addEventListener('load', res, { once: true }));
    if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
    await Promise.all([...doc.images].map(im => im.complete ? null : new Promise(res => { im.addEventListener('load', res, { once: true }); im.addEventListener('error', res, { once: true }); })));
  }

  root.StitchVinesAdapter = { measure, snapshot, ready, defaults };
})(typeof window !== 'undefined' ? window : globalThis);
