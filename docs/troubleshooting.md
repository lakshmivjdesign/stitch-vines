# Troubleshooting (built from the real failures)

Read the status first: `stitchVines.status` in the browser console (`state` and `message`), or set `status: '#element'` in the config.

| what you see | why | what to do |
|---|---|---|
| Nothing appears, status `ready` | your page paints a background above the layer (a wrapper `div` with a background colour) | set `zIndex: 0` |
| Nothing appears, status `none`: *no free strip … 5 stitches wide* | the margin beside the content is too narrow at this window width | widen the margins, or accept no vines at this width |
| `none`: *but not one … on BOTH sides* | one margin could hold a vine, the other could not; one lone vine is never drawn | widen the narrower margin or accept none |
| `none`: *scrolls inside an inner container* | the page scrolls in a box, not the window, so its height cannot be measured | not supported |
| `error`: *does not allow a background worker (a Blob worker)* | a Content-Security-Policy without `worker-src blob:` (or `child-src blob:`), or a very old browser | add `worker-src blob:` to the policy |
| Nothing at all, status `idle` | the script did not start | check the script path; `auto: false` in the config means you must call `stitchVines.start()` |
| Vines too sparse | tight margins and no gaps between sections | `density: 'rich'` adds branches where there is room; it cannot add room |
| Vines overlap images | the image is not in the default list of objects (a CSS background image) | add its selector to `objects` |
| Vines pass under words | `textClear: false` | set it back to `true`, or check contrast (WCAG 1.4.3) |
| Vines in the wrong place after the page changed | content grew after load (carousel, accordion, lazy images) | call `stitchVines.refresh()` once it settles |
| Vines only on the first screens of a very long page | only the first `maxHeight` px (default 10000) are planned | raise or lower `maxHeight` knowing the cost |
| Took a long time on a phone | planning runs in a background worker; branches stop after `budgetMs` (3 s) and margin vines are drawn first | `density: 'sparse'`, or a lower `maxHeight` |

## Things that were real problems during testing

- **24 px margins** (a long encyclopedia article at 910 px): the first version needed 6 or more stitches of margin. A smaller stitch fixed it, down to a margin of about 19 px.
- **A sidebar** on one side (264 px left, 44 px right): the first version assumed a centred column. Now each side is measured on its own; if one side has no strip, nothing is drawn.
- **No sections** (an article or a shop grid with no heading-and-row structure): the first version needed headings followed by rows of cards. The general planner works from empty space alone.
- **Pages whose load event never arrives:** the script waits at most 8 seconds for fonts and images.
- **Strict security policies** blocked injecting the first version. The script is a normal file you add yourself; only the worker needs `worker-src blob:`.
- **All vines dropped when one could not be placed:** now margin vines are cut into pieces, a piece that cannot end in a spiral ends in a bud, and a page gets vines on both sides or a plain message.
- **The checker passing on zero vines:** fixed; a run without a vine on each side now fails.
