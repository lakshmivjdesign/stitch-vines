# Does it fit my site?

**Short answer:** it works on sites that have **empty side margins** (about 24 px or more; it uses a smaller stitch to make a narrow margin work) and **some space left and right of the content**, with or without cards. It does best on portfolio, blog, landing and article-with-sections pages.

**It does not fit, and then says so and changes nothing:**

- full-bleed designs with no side margin (content or colour bands from edge to edge everywhere);
- pages that scroll inside an inner box instead of the window (the page height cannot be measured);
- pages with sidebars on both sides, or one very wide sidebar, so there is no free strip beside the content;
- pages with no gaps at all.

It draws vines on **both** sides or on neither. One lone vine looks wrong, so it never draws one.

## What I tested (honest numbers)

A test set of recorded layouts (only the grid of free, text and object cells is kept: no words, no pictures): 18 public pages, the author's four portfolio pages and a demo page, each at 700, 910, 1024, 1440 and 1920 px: 120 layouts. Result: vines grew on 114 of them and passed every geometry check; the other 6 gave a plain "does not fit" message and drew nothing. Pages used: articles, blogs, documentation, agency and landing pages, government and non-profit pages.

Where it still fails (guessing the cause from the logs: the free strip is only 5 to 8 stitches wide beside text, too narrow for the first bend):

- a magazine article page at 700 and 910 px (36 px margins);
- a technical blog at 700 to 1024 px (almost no margin);
- a documentation home page at 910 px.

A 4.5 px stitch is the smallest used; below a margin of about 19 px there is no room at all.

This is a test set, not a promise about your site. The status message tells you what happened on yours.

## How to find out in one minute

Add the two lines from the [quickstart](quickstart.md). If it fits, vines appear and the status says `Grew N vines`. If not, the status says why in plain words and nothing on your page has changed.
