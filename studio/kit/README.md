# stitch-vines kit

What is in this folder:

- `stitch-vines.js`: the one script. Do not edit it.
- `stitch-vines-config.js`: your settings (look, text clear, density). Edit this one.
- `PROMPT.md`: paste it into any AI assistant if you want it to set things up for you and read the status messages.
- `README.md`: this file.

## Add it to your page (two lines before `</body>`)

```html
<script src="stitch-vines-config.js"></script>
<script src="stitch-vines.js" defer></script>
```

Put all files in the same folder as your page, or change the paths. Open the page in a normal browser window. Vines appear after a second or two in the empty margins and gaps, behind your content. They cannot be clicked and are hidden from screen readers (they are decoration).

## If nothing appears

Open the browser console and type `stitchVines.status`. It says, in plain words, what happened. The common reasons: your side margins are too narrow (under about 19 px), the page scrolls inside a box, or the site's security policy blocks background workers (it needs `worker-src blob:`). The full list is in the project's troubleshooting page.

## Is my site a fit?

Works on sites with empty side margins (about 24 px or more) and space left and right of the content. It does not fit full-bleed designs with no margin, pages that scroll inside an inner box, or pages with no free strip. Then it says so and changes nothing. It never changes your page's own markup, text or styles.

Licence: MIT.
