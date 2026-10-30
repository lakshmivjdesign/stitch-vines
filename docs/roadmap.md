# Roadmap

In order of what unlocks the most.

1. **A page adapter.** A small browser script that reads any page and builds `ctx`: finds headings, rows of cards and images, buttons and text lines from the DOM (configurable by selectors), pads them, and fills the `cell` mask. Without it the generator only runs on recorded layouts.
2. **A renderer.** Turn the polylines into cross stitches (or SVG, or canvas) on the page, behind the content. `tools/render-svg.js` is the start.
3. **Speed.** 2 to 5 seconds per layout. Ideas: a smaller, smarter search; precompute per width and cache; run in a worker.
4. **Layouts that are not "headings with a row of cards".** Today the plan assumes sections made of a heading and a row. Plans for single-column articles, a hero with buttons, and card grids are separate small plan files on one shared engine.
5. **Split the engine from the plan.** `src/vine-grow.js` mixes the engine (curvature growth, organs, collision, search) with one plan (where branches go). They should be two files.
6. **Open gaps.** Branches beside carousel arrows that sit against the margin often do not fit under the tangent-and-lean rules. Leaves come out a little small. The density method for large pages is not settled.
7. **An instruction file for assistants** (`skill/SKILL.md`): when to use this, how to record a layout, how to run the generator and the checker, how to read a failure.
