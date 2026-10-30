---
name: stitch-vines
description: Grow a plant-like vine background (margin vines, branches, leaves, roses, buds, golden-ratio spirals) in the empty space of a web page, by rules, and check it with an automatic checker. Use when someone wants a hand-stitched or botanical vine decoration that avoids text and cards on any layout.
---

# stitch-vines (draft)

Status: draft. The generator and checker exist; the page adapter does not yet (see `docs/roadmap.md`). Do not promise that this works on an arbitrary live website until the adapter exists.

## Steps

1. Read `docs/rules.md`. These are the rules; do not invent others.
2. Build the layout description (`docs/layout-contract.md`): stitch size, margins, the top limit, the footer, headings, card rows, and the cell mask (free, text, object).
3. Call `window.StitchVines(ctx)`. It returns polylines.
4. Run `node tests/check.js` on a recorded layout of the page. Geometry checks (1 to 11) must pass. Report composition warnings (12, 13) honestly; do not change the checker to make them pass.
5. Render the polylines behind the page content and look at the result at several widths. Say which rules still fail.

## Do not

- Cut a limb after it is drawn. Collisions are handled by growing a different candidate.
- Put anything above the top limit.
- Claim a check passes without running it.
