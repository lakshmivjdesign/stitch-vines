# Roadmap

In order of what unlocks the most.

1. **A page adapter. Done, with limits.** `src/page-adapter.js` builds `ctx` from a live page by CSS selectors; `tools/record-layout.js` records any URL as a layout for the checker. Checked on the demo page (700 to 1920 px) and a renamed copy of it; **not yet on any real website.** Open: tell the user *why* the generator returned nothing (see 8); sections other than "heading plus row of cards" (see 4); carousels clipped by overflow.
2. **A renderer. A first version exists.** `demo/render.js` draws cross stitches in one SVG behind the content, grown in a worker. It is a demo, not a library: no caching per width, one colour per kind, no animation.
3. **Speed.** About 1 to 3 seconds per layout on the demo (was 2 to 5 on the first recorded layouts). Ideas: a smaller, smarter search; precompute per width and cache.
4. **Layouts that are not "headings with a row of cards".** Today the plan assumes sections made of a heading and a row. Plans for single-column articles, a hero with buttons, and card grids are separate small plan files on one shared engine.
5. **Split the engine from the plan.** `src/vine-grow.js` mixes the engine (curvature growth, organs, collision, search) with one plan (where branches go). They should be two files.
6. **Open gaps.** Branches beside carousel arrows that sit against the margin often do not fit under the tangent-and-lean rules. Leaves come out a little small. The density method for large pages is not settled. At 700 and 910 px the demo gets no branches in the space above the footer, and at wider widths one a side, not two or three.
7. **An instruction file for assistants** (`skill/SKILL.md`): a draft exists; update it as the adapter is proven on real pages.
8. **Found while building the adapter (not fixed, outside its brief).**
   - The checker passes when the generator returns no vines at all (zero limbs): it should fail.
   - When one margin vine cannot be placed, the generator drops all vines. Cause seen on the demo: text or objects in the footer corners right under the footer line (the base bud is more than a fifth covered), or a first row of cards too close to the top (the top spiral runs into a card).
   - Only side margins of 40 and 72 px have been tried (5 and 11 stitches). Wider margins, for example a centred column on a wide screen, are untried (guessing: the margin vines may need tuning there).
