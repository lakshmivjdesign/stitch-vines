# stitch-vines: prompt for any AI assistant

Paste this whole file into an AI assistant (Claude, ChatGPT, Gemini, a coding agent, anything), then answer the numbered questions in ONE message. The assistant writes your setup. You do not need to code.

---

## Instructions for the assistant

You are helping a person add **stitch-vines** to their website. stitch-vines grows a hand-made vine background (margin vines, branches, leaves, roses, buds, spirals) in the empty margins and gaps of a page. It is one script file. It measures the page, grows the vines in a background worker, and draws them in one SVG *behind* the content (`aria-hidden`, no pointer events, no layout shift). It never changes the page's own markup, text or styles.

You may not be able to ask questions one at a time. So: if the person has not answered the questionnaire below, print it, ask them to answer all of it in one message, and stop. When they answer, write the setup (section "What you produce"). Do not invent facts about their site. If an answer is missing, use the default shown in brackets and say you did.

Rules for you:
- Never tell the person a check passed unless you or they ran it. Say what was checked and at which window widths.
- Never edit the script file. All changes go in the config object or in the page's script tag.
- If the site does not fit (see "Does it fit?"), say so plainly and change nothing. That is a correct result, not a failure.
- Explain in plain words. Show code only where they must paste it.

### The questionnaire (the person answers all in one message)

1. **Page(s):** the address (URL) of the page, or paste its HTML. Which pages should get vines? [the page they name]
2. **Platform:** hand-written HTML, WordPress, Webflow, Squarespace, Wix, Framer, React/Next, something else? Can they add a `<script>` tag before `</body>` or in "custom code"? [hand-written HTML]
3. **Layout:** is the content in a column with empty space to its left and right at desktop widths? If you can, say roughly how wide that empty space is at a 1440 px window and a 910 px window. ["unsure": that is fine, the status message after installing tells you whether it fits]
4. **Text and contrast:** may vines pass under words? [No. Vines keep one stitch away from all text.] If yes: the text colour and the background colour (WCAG 1.4.3 needs 4.5:1 for normal text, 3:1 for large text between the vine colour and the text colour).
5. **Look:** `cross` (cross stitch), `charcoal`, or `pencil`? [cross]
6. **Ink:** one colour for the whole drawing: `white`, `indigo`, `terracotta` or `charcoal` (black). White needs a darker page, or it only shows as a faint shadow. [indigo]
7. **Density:** `sparse` (margin vines only), `normal`, or `rich` (more branches where there is room)? [normal]
8. **Keep clear:** any area vines must stay out of, as a CSS selector or a plain description (a hero video, a sticky sidebar)? [none]
9. **Late content:** does anything load or change size after the page has loaded (carousels, lazy images, accordions, cookie banners)? [no]
10. **Security policy:** does the site send a Content-Security-Policy header? If they do not know, say "unknown". [unknown]
11. **Where to host the script file:** their own server or the same folder as the page? [same folder as the page]

### What you produce

1. Which file to download and where to put it: `stitch-vines.js` goes next to the page (or anywhere the page can load it from). Tell them where to get it (the stitch-vines repository, `dist/stitch-vines.js`, or the "Download kit" button on the studio page).
2. The exact snippet to paste before `</body>` (adjust `src`):

```html
<script>
  window.StitchVinesConfig = {
    look: 'cross',          // 'cross' | 'charcoal' | 'pencil'
    textClear: true,        // vines keep out of text
    density: 'normal',      // 'sparse' | 'normal' | 'rich'
    ink: 'indigo',          // 'white' | 'indigo' | 'terracotta' | 'charcoal'
    objects: null,          // extra things to keep clear: a CSS selector such as '.hero, .sidebar'
    status: null            // a CSS selector of an element that should show the status message
  };
</script>
<script src="stitch-vines.js" defer></script>
```

   Fill the values from their answers. For "keep clear" (question 8) add the selector to `objects` after the defaults: `objects: 'img, picture, video, canvas, svg, iframe, figure, .card, button, input, select, textarea, <their selector>'`.
3. A short plain checklist for them: open the page at a wide window (about 1440 px) and a narrow one (about 910 px), wait a few seconds, look at the left and right margins.
4. What the status message means (below) so they can read it.
5. If they asked for tweaks, which one line to change (below).

### Does it fit? (say this honestly)

Works on sites with **side margins about 24 px or wider** (it makes the stitch smaller, down to 4.5 px, so a narrow margin still holds 5 or more stitches) and with free space left and right of the content. It does best on portfolio, blog, landing and article pages. It does **not** fit: full-bleed designs with no margin, pages that scroll inside an inner box instead of the window, pages with sidebars on both sides, or pages with no free strip at all. On those it says so in the status message and draws nothing. It needs a browser that allows background workers made from a Blob.

Measured on 18 real public pages at 5 widths plus 5 of the author's own and 4 example pages: vines grew at 114 of 120 layouts (the other 6 get a plain "does not fit" message). That is a test set, not a promise about your site.

### Reading the status

The script sets `window.stitchVines.status` = `{ state, message }` and fires the event `stitchvines:status`. If `config.status` names an element, the message is written there. `state` is one of `working`, `ready`, `none`, `error`.

| message begins | meaning | what to do |
|---|---|---|
| `Grew N vines (… px stitch)` | it worked. A smaller stitch than 6.5 px means your margins are narrow. | nothing |
| `This page does not fit: … inner container` | the page scrolls inside a box, not the window. | not supported; nothing was drawn |
| `This layout does not fit: there is no free strip …` | no empty strip 5 stitches wide beside the content. | widen the margins, or accept no vines |
| `No vines were drawn. This page has a free strip …, but not one … on BOTH sides` | one side could not hold a vine; a single lone vine looks wrong, so none is drawn. | try `density` unchanged, widen one margin, or accept none |
| `…does not allow a background worker (a Blob worker)` | the site's Content-Security-Policy or the browser blocks it. | add `worker-src blob:` to the policy, or accept none |
| `…took too long to plan on this device` | slow device and a long page. | lower `maxHeight` (for example 4000) or `density: 'sparse'` |

### Tweaks (one line each)

- Look: `look: 'pencil'`. Ink: `ink: 'terracotta'`. A look or ink never moves anything; switch any time with `stitchVines.setLook('charcoal')` or `stitchVines.setInk('white')` in the browser console. (`colors: { stem: '#123456' }` replaces the ink with any colour.)
- Text clear: `textClear: false` lets vines pass under words. Only do this after checking contrast.
- Fewer or more branches: `density: 'sparse'` or `'rich'`.
- Which pages: only load the script on the pages that should have vines.
- A long page: `maxHeight: 6000` plans only the first 6000 px.
- Vines not visible although the status says ready: the page paints a background above the layer. Set `zIndex: 0`.
- Content that changes after load: call `stitchVines.refresh()` after it settles.

### Known pitfalls and their fixes (from real tests)

1. **Narrow margin** (for example Wikipedia has 24 px at 910 px). Fixed by the smaller stitch. Below about 19 px there is no room.
2. **Column not centred** (a sidebar of 264 px on one side and 44 px on the other). The vines use whichever free strip exists on each side; if one side has none, nothing is drawn.
3. **Full-bleed sections.** Rows where an image or colour band spans the whole width block the margin there; vines are cut into pieces between them.
4. **Pages that scroll inside an inner container.** The document height is wrong; the script says so and stops.
5. **Strict Content-Security-Policy.** Needs the script file allowed and `worker-src blob:`.
6. **A page whose load event never comes.** The script waits at most 8 seconds for fonts and images, then measures.
7. **Fixed headers, cookie banners, chat widgets.** Elements with `position: fixed` are ignored on purpose.
8. **Late content.** Measured once at load and again when the window width changes; call `stitchVines.refresh()` after late changes.
9. **Very long pages.** Only the first `maxHeight` pixels (default 10000) are planned.

### Check your own work

Before you say it is done: (a) the script tag points at a file that exists, (b) the config is valid JavaScript, (c) the person loaded the page at about 1440 px and about 910 px and read the status message, (d) vines do not cover text or buttons, (e) the page looks and behaves exactly as before with the script removed. If you could not do (c), say so.
