# Roadmap

**v0.2 (13 Nov 2026) done:** engine split from planner, a general planner that works from free space (no headings needed), automatic stitch size, margin vines cut into pieces, bud tops for narrow strips, never a lone vine, a stricter checker, a test set of 116 layouts with a scorer, one-file build with worker, cache and three looks, studio page, PROMPT.md, SKILL.md, docs. The list below is the older roadmap; items marked are what is still open.

In order of what unlocks the most.

1. **A page adapter. Done, with limits.** `src/page-adapter.js` builds `ctx` from a live page by CSS selectors; `tools/record-layout.js` records any URL as a layout for the checker. Checked on the demo page (700 to 1920 px) and a renamed copy of it. Tried on three real sites and failed on all three (see README, Status). Open: tell the user *why* the generator returned nothing (see 8); sections other than "heading plus row of cards" (see 4); carousels clipped by overflow.
2. **A renderer. A first version exists.** `demo/render.js` draws cross stitches in one SVG behind the content, grown in a worker. It is a demo, not a library: no caching per width, one colour per kind, no animation.
3. **Speed.** About 1 to 3 seconds per layout on the demo (was 2 to 5 on the first recorded layouts). Ideas: a smaller, smarter search; precompute per width and cache.
4. **Layouts that are not "headings with a row of cards".** Today the plan assumes sections made of a heading and a row. Plans for single-column articles, a hero with buttons, and card grids are separate small plan files on one shared engine.
5. **Split the engine from the plan. Done (P0).** `src/engine.js` (growth, organs, collision, margin vines, branch search) and `src/planner.js` (where limbs go); `npm run build` joins them into `dist/vine-grow.js`. Output checked byte-identical to the old single file on 7 layouts.
6. **Open gaps.** Branches beside carousel arrows that sit against the margin often do not fit under the tangent-and-lean rules. Leaves come out a little small. The density method for large pages is not settled. At 700 and 910 px the demo gets no branches in the space above the footer, and at wider widths one a side, not two or three.
7. **An instruction file for assistants** (`skill/SKILL.md`): a draft exists; update it as the adapter is proven on real pages.
8. **Found while building the adapter (not fixed, outside its brief).**
   - The checker passes when the generator returns no vines at all (zero limbs): it should fail.
   - When one margin vine cannot be placed, the generator drops all vines. Cause seen on the demo: text or objects in the footer corners right under the footer line (the base bud is more than a fifth covered), or a first row of cards too close to the top (the top spiral runs into a card).
   - Real-site failures to fix in the adapter: pages that scroll inside an inner container (document height is wrong); columns that are not centred (sidebars); no side margin at all; headings that are not followed by a row of images. `ready()` hung for ever on a page whose load event never came; fixed (it now stops waiting after 8 s).
   - With text kept clear, the left side of the page gets no branches (text is left-aligned there) and the margin vine needs about 20 empty rows above the first text.
   - Only side margins of 40 and 72 px have been tried (5 and 11 stitches). Wider margins, for example a centred column on a wide screen, are untried (guessing: the margin vines may need tuning there).

9. **Open after v0.2.** (a) Narrow strips: pages whose free strip is only 5 to 8 stitches beside text still often fail (6 of 116 test layouts); the first bend and the base bud do not fit. (b) Between-section branches in gaps shorter than about 16 rows are not grown. (c) Planning time on very long pages on slow phones (a 15 s cut-off and a 3 s branch budget exist). (d) The cross stitch look is not yet the author's white thread on dots. (e) Content that changes after load needs `stitchVines.refresh()`. (f) Zentangle and quilling looks were dropped from the product (they remain in `demo/`).
