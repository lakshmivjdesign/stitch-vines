# stitch-vines

Hand-made vines that grow in the empty margins and gaps of a web page, by rules. One script file, three looks (cross stitch, charcoal, pencil) in four inks, no server, no build step for you.

Made with Claude. MIT licence.

## Add it to a page (two lines)

```html
<script>window.StitchVinesConfig = { look: 'cross', ink: 'indigo' };</script>
<script src="stitch-vines.js" defer></script>
```

Get `dist/stitch-vines.js` from this repository, or use the **studio** page (`studio/index.html`, hostable as a static page) to try the looks, preview on your own page, and download a kit (script, your settings, README, `PROMPT.md`). [Quickstart](docs/quickstart.md) takes about five minutes.

You can also paste [`PROMPT.md`](PROMPT.md) into any AI assistant: it asks you a numbered questionnaire, writes your setup, and explains the status messages. [`skill/SKILL.md`](skill/SKILL.md) is the same for assistants that can run tools.

## What it does

The script measures your page (only boxes, never words or pictures), grows vines in a background worker so the page stays usable, and draws them in one SVG **behind** the content: `aria-hidden`, no pointer events, no layout shift. It never changes your markup, text or styles. Results are remembered per page and width, vines are fitted again when the window width changes, and every limb is one continuous stroke grown by [the rules](docs/rules.md) (nothing cut afterwards, branches leave tangentially, nothing touches).

Text stays clear of vines by default (WCAG). If you let vines pass under words, you must check the contrast yourself (WCAG 1.4.3).

## Does it fit your site?

Works on sites with **empty side margins of about 24 px or more** (it shrinks the stitch to 4.5 px to make a narrow margin work) and space left and right of the content, with or without cards. Best on portfolio, blog, landing and article pages. It does **not** fit full-bleed designs, pages that scroll inside an inner box, or pages with no free strip: it then says so in plain words and changes nothing. Vines are drawn on both sides or not at all. See [does it fit](docs/does-it-fit.md) and [troubleshooting](docs/troubleshooting.md).

## Status (measured 13 Nov 2026, honest)

- Test set: 120 recorded layouts (18 public pages, my own example pages; 8 more were approved but could not be loaded from the cloud session used to build this, so they are not in the set; 4 pages from the author's portfolio, a demo page; each at 700, 910, 1024, 1440 and 1920 px). Vines grew and passed every geometry check on **114**. The other 6 get a plain message and nothing is drawn. Failures: a magazine article at 700 and 910 px, a technical blog at 700 to 1024 px, a documentation home page at 910 px (free strip only 5 to 8 stitches wide beside text).
- 5 live public pages that were not in the test set: vines grew on 9 of 10 loads (5 pages at 910 and 1440 px); the tenth said the page does not fit.
- Sample pages: the example pages now have space between sections, so branches with spirals, roses and buds grow into the gaps (8 branches at 1440 px on the portfolio example). Branches need a gap of about 16 free rows; tighter pages get margin vines only.
- Speed: planning takes about 1.5 s on a typical layout in Node and up to about 6 s on the longest (median 1.5 s, 90th percentile 3.5 s). In a browser the two example pages plan in under 0.5 s even with the CPU slowed 4 times; the 5 live pages took 0.1 to 0.8 s at normal speed (not measured slowed). Margin vines appear first; branches stop after a 3 s budget. A long page on a slow phone can take longer: it gives up after 15 s and says so. The page is never blocked.
- Layout shift: none caused (CLS under 0.001 on the examples, nothing moves); scrolling stays at 60 fps in the example runs; the cache for a page is about 60 to 90 KB.
- Every look is monochrome, in one of four inks: white, indigo, terracotta or charcoal black. White shows as a faint shadow on a light page, so use it on a darker one.
- Not done: scroll-growing vines, fruit, a server.

## What is in the repository

| path | what |
|---|---|
| `dist/stitch-vines.js` | the file people add (adapter, looks, runtime; the generator runs in a worker). Built by `npm run build`. |
| `src/engine.js`, `src/plan-general.js`, `src/planner.js`, `src/fit.js` | the generator: growth and collision (engine), where limbs go (planners), stitch size and "never a lone vine" (fit) |
| `src/page-adapter.js`, `src/looks.js`, `src/runtime.js`, `src/worker-glue.js` | measuring, the three looks, the page script, the worker |
| `studio/` | the static studio page and the kit files |
| `PROMPT.md`, `skill/SKILL.md` | for AI assistants |
| `docs/` | rules (with numbers), quickstart, does-it-fit, troubleshooting, layout contract, roadmap |
| `tests/`, `tools/` | the checker and scorer, recorded layouts (`tests/sites/`: grids only, no text or images), the recorder, browser tests |
| `examples/` | two small example pages that use the script |

## For developers

Needs Node 18+. Playwright is used only by the tools (a fresh clone needs `npx playwright install chromium` once before the browser tools work; `npm test` itself needs no browser).

    npm install
    npm test                      # builds, runs the 5 original layout checks, then scores all recorded layouts
    node tests/score.js wikipedia 1440         # one site, one width
    node tools/render-site.js wikipedia 1440 out.png     # a sketch of the page with its vines
    python3 -m http.server 8790 --bind 127.0.0.1         # then open /studio/ or /examples/blog.html
    node tools/perf.js            # timings, layout shift and scroll smoothness at five widths (needs the server)
    node tools/record-site.js <public url> --name mysite # record a layout (grid only) for the test set

The checker (`tests/check.js`) measures every rule that can be measured; geometry checks 1 to 11, the text-clear check and "the vines are real" must pass. Never change a rule or the checker to make a page pass.
