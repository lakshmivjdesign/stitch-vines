---
name: stitch-vines
description: Add a hand-made vine background (margin vines, branches, leaves, roses, buds, spirals) to a website with one script file. Looks: cross stitch, charcoal, pencil. Grows in a background worker, draws behind the content, keeps clear of text by default. Use when someone wants decorative vines in the empty margins and gaps of a page, or asks why vines did not appear.
---

# stitch-vines (skill)

One script (`dist/stitch-vines.js`) measures a page, grows vines in a worker, and draws them in one SVG behind the content (`aria-hidden`, no pointer events, no layout shift). You configure it; you never edit it.

Read `PROMPT.md` in this repository: it holds the questionnaire, the snippet, the status table, the tweaks and the pitfalls. This skill is the short version for an assistant that can run tools.

## Ask first (if you can ask; otherwise use the defaults)

1. Which page(s) and platform; can a `<script>` tag be added?
2. Is there empty space left and right of the content? How wide at 1440 and 910 px?
3. May vines pass under text? Default **no**. If yes, measure contrast (WCAG 1.4.3: 4.5:1 normal, 3:1 large) between the vine colour and the text colour before drawing under words.
4. Look (`cross`, `charcoal`, `pencil`), colours, density (`sparse`, `normal`, `rich`), areas to keep clear.
5. Late content, Content-Security-Policy.

## Steps

1. Put `dist/stitch-vines.js` next to the page. Add before `</body>`:
   `<script>window.StitchVinesConfig = { look: 'cross', textClear: true, density: 'normal' }</script>` then `<script src="stitch-vines.js" defer></script>`.
2. Open the page at about 1440 and about 910 px. Read `window.stitchVines.status` (`state`: working, ready, none, error; `message`). Use the table in `PROMPT.md`.
3. Optional: record the layout and run the checker (needs Node and Playwright): `node tools/record-site.js <url> --name mysite` then `node tests/score.js mysite`. Geometry checks 1 to 11 and "the vines are real" must pass; composition checks 12 and 13 apply only to pages with headings and rows.
4. Say what you checked and at which widths. If a width shows `none`, quote the message; that is a correct, honest result.

## Tweaks

`look`, `colors`, `textClear`, `density`, `objects` (extra selector to keep clear), `maxHeight`, `zIndex`, `status`, `toast`. Runtime: `stitchVines.setLook(name)`, `stitchVines.refresh()`, `stitchVines.stop()`.

## Do not

- Edit the script, the checker or `docs/rules.md` to make a page pass. If a page does not fit, say so.
- Let vines pass under text without measuring contrast.
- Hide or change the page's text or layout: the layer sits behind the content and takes no space.
- Claim a check passed without running it.
- Draw a single lone vine: the script draws vines on both sides or none, on purpose.
