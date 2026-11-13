---
name: stitch-vines
description: Grow a line-drawn vine background (margin vines, branches, leaves, roses, buds, spirals) in the empty space of a web page, by rules, drawn as cross stitch, charcoal, zentangle or quilling, and check it with an automatic checker. Use when someone wants a hand-made vine decoration that stays clear of text and cards on any layout.
---

# stitch-vines (draft)

Status: draft. The generator, the page adapter, a demo renderer with four styles and the checker exist. The adapter has been proven only on the demo page in this repo; read the real-site results in `README.md` (Status) and `docs/roadmap.md` before promising anything on a live site.

## Ask first (before measuring anything)

1. **Text and contrast.** May vines pass under text? Default: no (`textClear: true`: vines keep a stitch away from every word). If the answer is yes, the vine colours must keep WCAG 1.4.3 contrast against the text colour wherever they overlap: 4.5:1 for normal text, 3:1 for large text (24 px, or 18.66 px bold). Measure it, do not eyeball it (`StitchVinesAdapter.contrast(vineColour, textColour)`, or pass `vineColours` to `measure` and read `ctx.notes`). Only elements whose colour passes get the exception (a rose with enough contrast can; a dark charcoal line cannot). The vines themselves are decoration, but the words they sit under are not.
2. **Style.** Line tracing only: cross stitch, charcoal, zentangle (inspired), quilling (inspired). Say which are real looks and which are inspired.
3. **Sections.** Which headings and which rows of cards or images define the sections? If the page has none (an article, a shop grid), say so: the adapter returns `ok: false`.
4. **Room.** With text kept clear the generator needs empty space above the first text (about 20 rows of 6.5 px) and empty footer corners. Ask whether the page can give it.
5. **Widths.** Which widths matter? Record at least 700, 910, 1440, 1920.

## Steps

1. Read `docs/rules.md`. These are the rules; do not invent others.
2. Measure the page with `StitchVinesAdapter.measure(options)` from `src/page-adapter.js` (after `await StitchVinesAdapter.ready()`). Read `ctx.ok` and `ctx.notes`: if `ok` is false, fix the selectors or say the page has no "heading plus row of cards" sections; do not invent sections.
3. Record the layout at several widths: `node tools/record-layout.js <url> --width 700,910,1440,1920 --name <site> --options '{...}'`. It needs Playwright (`npm install`, `npx playwright install chromium`).
4. Run `node tests/check.js <site>-700 <site>-910 ...`. Geometry checks (1 to 11, and 12t when text is kept clear) must pass. Report composition warnings (12, 13) honestly; do not change the checker to make them pass. **If a layout shows 0 limbs, that is a failure even though the checker prints "pass"**: the generator could not place its margin vines. Find out why (`window.__stitchVines.fail`, or run the generator in Node through `tests/harness.js`) and report the cause.
5. Call `window.StitchVines(ctx)` in the page and draw the polylines behind the content (`demo/render.js` and `demo/styles.js`: an SVG behind the content, `aria-hidden`, no pointer events, grown in a worker because it takes 1 to 5 seconds). Look at the result at several widths. Say which rules still fail and at which widths you looked.

## Do not

- Cut a limb after it is drawn. Collisions are handled by growing a different candidate.
- Put anything above the top limit.
- Let vines overlap text without having measured the contrast.
- Hide or change the page's text or layout: the overlay sits behind the content and takes no space.
- Edit the checker or the generator's rules to make a layout pass.
- Claim a check passes without running it.
