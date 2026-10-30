# The layout contract

The generator knows nothing about HTML. It needs a description of the page's empty space, in stitch units.

    window.StitchVines(ctx)  ->  array of polylines (with .limbs)

## ctx

| field | meaning |
|---|---|
| `u` | stitch size in css px (the dot lattice the page sits on) |
| `m` | side margin in css px (the strip left and right of the content) |
| `W` | page width in css px |
| `top` | css y of the top limit: nothing grows above it (for example the bottom of the nav bar) |
| `foot` | css y of the top of the footer |
| `heads` | one box `{top, bottom, left, right}` (css px) per section heading |
| `rows` | one box `{top, bottom}` (css px) per section's row of cards or images, in the same order as `heads` |
| `cell(c, r)` | `0` free, `1` text (a vine may pass under words), `2` object (card, image, button) |

## Cells

`c` is the column counted from the left edge of the content (the centre of a cell is an integer), `r` the row counted from the top of the page. Columns exist from `-ceil(m / u)` to `ceil((W - m) / u) - 1`: the side margins are columns too, and that is where the margin vines run. Outside that range `cell` returns 0.

Mark text with padding (about one stitch around each line of text) and objects with padding (about one and a half stitches), so vines keep a little air.

## Output

An array of polylines, each a list of `[x, y]` points in stitch units (a cell's centre is an integer). `result.limbs` describes every limb (stem, tail spiral, organs, parent) for the checker. Rasterise polylines by walking each segment in steps of about 0.35 stitch and rounding to the nearest cell.

## The lattice

Column `c` covers x from `m + c*u` to `m + (c+1)*u` (css px, page coordinates); row `r` covers y from `r*u` to `(r+1)*u`. A stitch's centre (an integer in the polylines) is drawn at `x = m + (c + 0.5)*u`, `y = (r + 0.5)*u`. A cell is marked when it overlaps a padded box.

## Building ctx from a page: `src/page-adapter.js`

    const ctx = StitchVinesAdapter.measure(options);   // after: await StitchVinesAdapter.ready()  (fonts and images loaded)

It returns `ctx` as above, plus `ok` (false when no section was found: the generator needs at least one heading followed by a row of cards or images), `notes` (plain-language warnings), and the plain data `C`, `R`, `c0`, `grid` that recorded layouts hold. `StitchVinesAdapter.snapshot(ctx)` returns the data version without `cell`.

| option | default | meaning |
|---|---|---|
| `u` | `6.5` | stitch size in css px |
| `fit` | `true` | nudge `u` so the content width is a whole number of stitches (the generator assumes this); `false` keeps `u` exactly, for a page that already has its own lattice |
| `m` | container's left edge | side margin in css px |
| `container` | `main` (else body) | the content column; headings and rows are looked for inside it |
| `scope` | `body` | where text and objects are looked for |
| `top` | `header` | bottom edge of the first match is the top limit |
| `foot` | `footer` | top edge of the first match is the footer line |
| `headings` | `h2` | one per section |
| `cards` | `img, picture, video, canvas, figure, .card, [data-stitch-card]` | what makes a row: the cards and images between a heading and the next heading (their joint box is the row) |
| `rows` | none | selector for the row containers themselves, instead of `cards` |
| `minCard` | `6` | stitches; smaller cards or images do not make a row |
| `objects` | images, video, canvas, svg, iframe, figure, cards, buttons, form controls | boxes padded 1.5 stitches, marked 2 |
| `rules` | header bottom edge, footer top edge | thin lines across the content width, padded 1.5 stitches, marked 2 |
| `text` | all text in `scope` | selector limiting where text counts |
| `ignore` | `[data-stitch-ignore]` | never measured (the vine overlay, status notes) |
| `textPad`, `objectPad` | `1`, `1.5` | padding in stitches |

Text boxes come from real line boxes (text ranges), so a paragraph is a block and a heading is only as wide as its words. Objects win over text where they overlap. Links and navigation are text, not objects; add `nav` to `objects` for a bar that should be solid.

What the adapter does not see: backgrounds, borders and shadows (only the element boxes), content drawn from CSS pseudo-elements, text inside images, parts of a carousel that are scrolled out of view or clipped, and anything that moves after measuring. Measure again when the width or the content changes.

What the generator needs from the page (observed, not designed): a section list as above; side margins of at least about 5 stitches; room above the first row of cards (the first margin vine curls into it); and the left and right corners just below the footer line empty (each margin vine starts there with a bud). If a margin vine cannot be placed, `StitchVines` returns no vines.

## Recorded layouts

`tests/fixtures/layout-<W>.json` hold one example layout at five widths: the same fields as `ctx`, with `cell` replaced by `grid` (a list of strings, one per row, one digit per column starting at column `c0`). `tools/record-layout.js` writes `tests/fixtures/layout-<name>-<W>.json` in the same format from a live page; check one with `node tests/check.js <name>-<W>`.
