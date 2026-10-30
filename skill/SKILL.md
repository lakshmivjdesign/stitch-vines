---
name: stitch-vines
description: Grow a plant-like vine background (margin vines, branches, leaves, roses, buds, golden-ratio spirals) in the empty space of a web page, by rules, and check it with an automatic checker. Use when someone wants a hand-stitched or botanical vine decoration that avoids text and cards on any layout.
---

# stitch-vines (draft)

Status: draft. The generator, the page adapter, a demo renderer and the checker exist. The adapter has been proven only on the demo page in this repo, not on real websites: do not promise that it works on an arbitrary live site. Read `README.md` (Status) and `docs/roadmap.md` (item 8) first.

## Steps

1. Read `docs/rules.md`. These are the rules; do not invent others.
2. Measure the page with `StitchVinesAdapter.measure(options)` from `src/page-adapter.js` (after `await StitchVinesAdapter.ready()`). Choose the selectors for the headings and the cards or images (`docs/layout-contract.md`, options table). Read `ctx.ok` and `ctx.notes`: if `ok` is false, fix the selectors or say the page has no "heading plus row of cards" sections; do not invent sections.
3. Record the layout at several widths (for example 700, 910, 1440, 1920): `node tools/record-layout.js <url> --width 700,910,1440,1920 --name <site> --options '{...}'`. It needs Playwright (`npm install`, `npx playwright install chromium`).
4. Run `node tests/check.js <site>-700 <site>-910 ...`. Geometry checks (1 to 11) must pass. Report composition warnings (12, 13) honestly; do not change the checker to make them pass. **If a layout shows 0 limbs, that is a failure even though the checker prints "pass"**: the generator could not place its margin vines. Look at `window.__stitchVines.fail` (or run the generator in Node through `tests/harness.js`) to see why, and report the cause.
5. Call `window.StitchVines(ctx)` in the page and draw the polylines behind the content (`demo/render.js` is a starting point: an SVG behind the content, `aria-hidden`, no pointer events, grown in a worker because it takes 1 to 3 seconds). Look at the result at several widths. Say which rules still fail and at which widths you looked.

## Do not

- Cut a limb after it is drawn. Collisions are handled by growing a different candidate.
- Put anything above the top limit.
- Hide or change the page's text or layout: the overlay sits behind the content and takes no space.
- Edit the checker or the generator's rules to make a layout pass.
- Claim a check passes without running it.
