# stitch-vines

Grows a plant-like vine background (margin vines, branches, leaves, roses, buds and golden-ratio spirals) in the empty space of a web page, by rules, so the same look works on any layout.

![Example: vines grown on a recorded layout at 910 px. Grey blocks are cards and images, light blocks are text.](docs/example-910.svg)

## What it is

- `src/vine-grow.js`: the generator. Give it a description of the page (where the text, cards, buttons and headings are) and it returns polylines. It draws nothing itself: render the polylines as cross stitches, SVG, canvas or anything else.
- `tests/check.js`: an automatic checker. It measures every rule on the generated vines (no touching, no bend tighter than 6.5 stitches, branches that leave their parent tangentially, and so on) and fails when one is broken.
- `docs/rules.md`: the rules, in plain words with their numbers. This is the instruction set.
- `docs/layout-contract.md`: what a page has to supply.
- `docs/roadmap.md`: what is missing.

Every limb is one continuous stroke grown step by step from its curvature. Nothing is cut after it is drawn, so there are no stubs, kinks or floating leaves.

## Try it

Needs Node 18 or later. No dependencies.

    node tests/check.js            # runs the generator on 5 recorded layouts and checks the rules
    node tools/render-svg.js 910 out.svg   # draws a layout with its vines as an SVG

To use the generator in a page, load `src/vine-grow.js` as a script and call `window.StitchVines(ctx)` with the layout described in `docs/layout-contract.md`.

## Status

First public cut, taken out of one website's working copy and made generic. Honest list of what is true today:

- The geometry checks (1 to 11) pass on all five recorded layouts (700 to 1920 px wide).
- The composition checks (12 and 13) warn: the big space above the footer gets one long branch a side, not two or three, because that space in the recorded layouts is only about 30 rows high.
- There is **no page adapter yet**: nothing turns a real website into the layout description automatically. The recorded layouts in `tests/fixtures/` came from one site. Building the adapter is the first job (see `docs/roadmap.md`).
- Generation takes 2 to 5 seconds. Too slow to run on every page load; it needs a faster search or a result cached per width.

## Licence

MIT, see `LICENSE`.
