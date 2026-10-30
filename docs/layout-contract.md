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

## Recorded layouts

`tests/fixtures/layout-<W>.json` hold one example layout at five widths: the same fields as `ctx`, with `cell` replaced by `grid` (a list of strings, one per row, one digit per column starting at column `c0`).
