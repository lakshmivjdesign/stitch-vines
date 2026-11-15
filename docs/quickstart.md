# Quickstart (5 minutes)

1. **Get the file.** Download `dist/stitch-vines.js` from this repository (or use "Download kit" on the studio page: the script, a config file, the README and `PROMPT.md` in one zip). Put it next to your page.
2. **Add two lines before `</body>`:**

```html
<script>window.StitchVinesConfig = { look: 'cross', ink: 'indigo' };</script>
<script src="stitch-vines.js" defer></script>
```

3. **Open the page** in a normal browser window (about 1440 px wide). Wait one or two seconds. Vines appear in the left and right margins and in gaps between sections. They sit behind your content and cannot be clicked.
4. **Check a narrower window** (about 910 px). Vines are fitted again whenever the window width changes.
5. **Read the status** if nothing appears: open the browser console and type `stitchVines.status`, or add `status: '#some-element'` to the config to print it on the page. [Troubleshooting](troubleshooting.md) explains each message.

## The few settings

| setting | values | default | what it does |
|---|---|---|---|
| `look` | `'cross'`, `'charcoal'`, `'pencil'` | `'cross'` | how the same vines are drawn. A look never moves anything. |
| `ink` | `'white'`, `'indigo'`, `'terracotta'`, `'charcoal'` | `'indigo'` | one colour for the whole drawing (monochrome). White needs a dark page; on a light page it shows only as a faint shadow. |
| `textClear` | `true`, `false` | `true` | vines keep one stitch away from all words. `false` lets them pass under words: check contrast first. |
| `density` | `'sparse'`, `'normal'`, `'rich'` | `'normal'` | sparse: margin vines only. rich: more branches where there is room. |
| `colors` | `{ stem: '#hex' }` | none | any css colour instead of the ink. |
| `objects` | css selector | images, video, canvas, svg, iframes, figures, cards, buttons, form controls | what vines must stay out of. Add your own, for example `'img, svg, .hero'`. |
| `maxHeight` | px | `10000` | plan only the first N px of a long page. |
| `zIndex` | number | `-1` | raise to `0` if your page paints a background over the layer. |
| `status` | css selector | none | element that shows the status message. |

In the console: `stitchVines.setLook('pencil')`, `stitchVines.setInk('terracotta')`, `stitchVines.refresh()` (after late content), `stitchVines.stop()`.

## An AI assistant can do this for you

Paste [`PROMPT.md`](../PROMPT.md) into any assistant, answer its numbered questions in one message, and paste the snippet it gives you. Is your site a fit? See [does it fit](does-it-fit.md).
