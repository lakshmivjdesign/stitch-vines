# The rules

These are the design rules the generator grows by and the checker measures. Numbers are in "stitches": one stitch is one cell of the dot lattice the page sits on.

## A plant, not a pattern

1. **Every limb is one continuous stroke.** A margin vine, a branch, a shoot: each is drawn without lifting. Leaves, roses, buds and spirals belong to a limb and are joined to it. Nothing floats and nothing is cut after it is drawn.
2. **A branch leaves its parent at a node, tangentially.** It starts along the parent's direction (its first 10 stitches stay within 10 degrees of the parent's tangent), then leans 15 to 45 degrees away from it.
3. **A branch leaves from the OUTER side of its parent's bend.** It parts from its parent within about 12 stitches. It never runs alongside its parent (the line would look doubled, with uneven width), never crosses it, and never leaves from the side the parent is bending toward.
4. **Curves alternate, convex then concave. Never straight, never a kink.** No bend is tighter than 6.5 stitches (radius). Every branch has a bend of radius 45 or tighter at least every 12 stitches.
5. **A spiral continues the limb's own curve.** It keeps turning the way the limb was turning, and its radius is divided by phi (1.618) every half turn.
6. **Every limb ends in a spiral, a bud or a rose.** A branch has at least 3 elements (leaves, a spiral, a rose, a bud).

## Leaves, roses, buds

7. Leaves sit on a curved stalk, point the way the plant grows, alternate sides along a branch, and get smaller toward the end of the branch (never under 5 stitches).
8. Roses are big near the base of a limb and smaller further out, sized by the room. Only about half of the roses carry a bud beside them.
9. A rose or bud grows on a short stalk that leaves the stem tangentially.

## Where things may be

10. **Nothing touches unless it is joined.** Between two parts that belong to different branches (or are not joined) there is at least one empty stitch.
11. **Nothing above the top limit** the page gives (for example the bottom of a navigation bar) and nothing off the page.
12. **Text and objects.** Vines sit under words and under objects. A rose or bud may have at most a quarter of itself under words or under an object. A limb may pass under an object only in its middle: its start, its end, its spiral and everything attached to it stay in the open. Small objects (buttons, carousel arrows) hide only their core: a vine may cross their padding.
13. **Left and right sides stay apart:** the two margin vines never meet, and the middle of the page stays open.

## How much

14. **Between sections:** one branch a side, one big and one small (swapping sides), with a spiral if it fits.
15. **Big empty spaces** (below a hero, under the last row, above the footer): 2 to 3 branches a side and one spiral a side, at most 6 branches and spirals together. This is about preventing crowding, not a hard count.
16. **Density falls toward the ends of vines,** on each branch and across the page. Roses and buds at the end of a branch are the exception.
17. The page carries flowers: a few roses and buds, and a rose in every big empty space.

## What the checker measures

Checks 1 to 11 (geometry) fail the run: no touching, free ends, bend radius, curves, tangent departure and lean, joined organs, top limit, flower cover, hidden parts only in the middle, leaves and roses, 3 elements per branch. Checks 12 and 13 (branch counts, flowers appear) are composition targets and only warn unless run with `--strict`.
