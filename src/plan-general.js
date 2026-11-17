/* stitch-vines GENERAL PLANNER: plans vines for ANY page from its free-space map alone (no headings, no rows of cards needed).
   1. margin vines: along each side wherever the margin strip is free (long runs are cut into pieces; a notch in the strip starts a new piece)
   2. branches: into free pockets beside the content (gaps between sections, empty space beside a narrow column), leaving the margin vine tangentially
   3. a status for the person: how many vines grew, which relaxation rung was needed, or why nothing grew.
   Rules are the same as everywhere (docs/rules.md); this file only decides WHERE. */
window.StitchVinesGeneral = function (ctx, opt) {
  opt = opt || {}; const t0 = Date.now();
  const E = window.StitchVinesEngine(ctx);
  const { u, cs, ce, C, rowMin, rowFoot, NR, kindAt, stats, marginVine, placeLimb, marginLeaves, finish, limbs, textClear } = E;
  const status = { grew: 0, rung: 0, notes: [] }, say = s => status.notes.push(s);
  const blocked = (c, r) => { const k = kindAt(c, r); return textClear ? k !== 0 : k === 2 || k === 3; };
  const mid = Math.floor((cs + ce) / 2);

  /* ---- 1. how much free space is there beside the page edge on each row ---- */
  const free = { L: new Int16Array(NR), R: new Int16Array(NR) };                   // free columns from the page edge inward, capped at the middle
  for (let r = 0; r < NR; r++) { let a = 0; while (cs + a < mid - 3 && !blocked(cs + a, r)) a++; free.L[r] = a; let b = 0; while (ce - 1 - b > mid + 3 && !blocked(ce - 1 - b, r)) b++; free.R[r] = b; }

  /* ---- 2. margin pieces: runs of rows where the strip is wide enough ---- */
  const MINW = opt.minStrip || 5, PIECE = opt.pieceRows || 420, GAP = 24, STRIPMAX = 26;
  const runs = side => { const out = []; let a = -1; const f = free[side];
    for (let r = rowMin; r <= rowFoot + 1; r++) { const ok = r <= rowFoot && f[r] >= MINW; if (ok && a < 0) a = r; if (!ok && a >= 0) { if (r - a >= 80) out.push([a, r - 1]); a = -1; } } return out; };
  const pieces = side => { const o = []; runs(side).forEach(([a, b]) => { const n = Math.max(1, Math.ceil((b - a + 1 + GAP) / (PIECE + GAP))), len = (b - a + 1 - (n - 1) * GAP) / n;
      for (let i = 0; i < n; i++) { const top = Math.round(a + i * (len + GAP)), bot = Math.round(top + len); o.push([top, Math.min(b, bot)]); } }); return o; };
  const oddNW = (H, lamMax) => { const o = []; for (let nw = 1; nw < 90; nw += 2) { const lam = 2 * H / nw; if (lam >= 22 && lam <= Math.min(90, lamMax)) o.push(nw); } return o.sort((x, y) => Math.abs(2 * H / x - 50) - Math.abs(2 * H / y - 50)).slice(0, 5); };
  const segs = { L: [], R: [] };
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    pieces(side).forEach(([top, bot], k) => {
      let edge = 1e9; for (let r = top; r <= bot; r++) edge = Math.min(edge, free[side][r]);
      const edge2 = Math.min(edge, STRIPMAX + 1);                                       // the strip the vine may use: at most STRIPMAX columns next to the page edge
      const xIn = side === 'L' ? cs + edge2 - 1.9 : ce - 1 - edge2 + 1.9, xOut = side === 'L' ? cs + 1 : ce - 2;
      const A = Math.max(.5, Math.min(3.2, Math.abs(xIn - xOut) / 2)), lamMax = 2 * Math.PI * Math.sqrt(A / .042) - .5;
      const yBot = bot - 11, yTop = top + 1, H = yBot - yTop - 30;                      // 11 rows below the start for the base bud; 30 for the first lobe and the top arch
      const heads = Math.abs(xIn - xOut) < 12 ? [[1, 16], [1, 10], [1, 6.2]] : [[1, 6.2]];                            // a narrow strip: start with a gentler head lobe
      const nws = H > 20 ? oddNW(H, lamMax) : []; (stats.pieces = stats.pieces || []).push(`${side}${k} rows ${top}-${bot} edge ${edge} strip ${xOut.toFixed(1)}..${xIn.toFixed(1)} H ${H} NWs ${nws.join(',')}`);
      if (!nws.length) { stats.fail.push(`margin ${side} piece ${top}-${bot}: height ${H} fits no wave`); return; }
      let L = marginVine(sg, { seg: true, name: `m${side}${k}`, xIn, xOut, yBot, yTop, NWs: nws.slice(0, 3), dBots: [0, 8, 16], r0s: [9.5, 8, 6.8], dTops: [0, 8], heads: heads });
      if (!L) { status.rung = Math.max(status.rung, 1); L = marginVine(sg, { seg: true, term: 'bud', name: `m${side}${k}`, xIn, xOut, yBot, yTop: yTop + 9, NWs: nws.slice(0, 3), dBots: [0, 8, 16], dTops: [0, 8], heads: heads }); }   // rung 1: the top ends in a bud, not a spiral (a spiral needs about 14 stitches of room)
      if (L) { L.piece = [top, bot]; segs[side].push(L); }                                    // roses and leaves come after the branches, so they never crowd a branch's start
    });
  }
  const nMargin = segs.L.length + segs.R.length;
  if (!segs.L.length || !segs.R.length) { say(nMargin ? 'a margin vine could not be placed on one side' : 'no margin vine could be placed'); }

  if (opt.onStage) { try { opt.onStage(finish(), { stage: 'margins', ms: Date.now() - t0 }); } catch (e) { /* a failing listener never stops the plan */ } }
  const density = opt.density || 'normal', late = () => opt.deadline && Date.now() > opt.deadline;
  /* ---- 3. branches into pockets of free space beside the content ---- */
  const parentAt = (side, r) => segs[side].find(L => L.piece[0] <= r && r <= L.piece[1]);
  let nb = 0;
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1, f = free[side], inner = L => { let m = 1e9; for (let r = L.piece[0]; r <= L.piece[1]; r++) m = Math.min(m, f[r]); return Math.min(m, STRIPMAX + 2); };
    // pockets: runs of rows with at least 16 free columns beyond the margin strip
    const pockets = []; let a = -1;
    for (let r = rowMin; r <= rowFoot; r++) { const L = parentAt(side, r), w = L ? f[r] - inner(L) : 0, ok = w >= 12; if (ok && a < 0) a = r; if ((!ok || r === rowFoot) && a >= 0) { if (r - a >= 16) pockets.push([a, r - 1]); a = -1; } }
    if (density !== 'sparse') pockets.forEach(([ra, rb], pi) => {
      if (late()) { if (!status.notes.includes('time budget reached')) say('time budget reached: some branches were left out'); return; }
      const rows = rb - ra + 1, L = parentAt(side, rb); if (!L) return;
      let depth = 1e9; for (let r = ra; r <= rb; r++) depth = Math.min(depth, f[r]);
      const count = Math.min(3, (rows >= 110 ? 3 : rows >= 60 ? 2 : 1) + (density === 'rich' && rows >= 40 ? 1 : 0));
      for (let k = 0; k < count; k++) {
        const slice = rows / count, bb = Math.round(rb - k * slice), aa = Math.round(bb - slice + 1);
        const reach = Math.min(depth - 3, (slice < 50 ? 30 : 14) + Math.round(slice * (slice < 50 ? .45 : .35))), tx = side === 'L' ? cs + reach : ce - 1 - reach, ty = slice < 50 ? bb - Math.round(slice * .5) : aa + 5;   // a gap: the branch rises, then runs sideways into it; a tall space: it climbs
        const big = slice >= 45;
        const spec = { name: `p${side}${pi}.${k}`, kind: big ? 'cover' : 'small', side, sgn: sg, band: pi, retries: 2, search: 130, nl: [3, 5], node: [bb - 10, bb], T: [tx, ty], term: k % 2 ? 'bud' : 'spiral', alts: [{ term: k % 2 ? 'spiral' : 'bud' }], clear: 2, leaves: big ? 4 : 3, leaf: big ? 11 : 9, roses: big && k === 0 ? [[.45, 4.5]] : undefined };
        if (placeLimb(spec, L)) nb++;
      }
    });
  }
  [...segs.L, ...segs.R].forEach(L => { E.marginRoses(L); marginLeaves(L); });
  status.grew = limbs.length;
  const out = finish(); out.status = status; out.rung = status.rung; return out;
};
