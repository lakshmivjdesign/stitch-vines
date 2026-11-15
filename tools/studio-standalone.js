// Makes ONE self-contained html file of the studio page (script and kit files inlined), so it can be opened from anywhere without a server. For inspecting.
//   node tools/studio-standalone.js out.html
const fs = require('fs'), path = require('path'), r = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let h = r('studio/index.html');
const script = r('dist/stitch-vines.js').replace(/<\/script/gi, '<\\/script');
h = h.replace('<script src="../dist/stitch-vines.js" defer></script>', '<script>' + script + '</script>');
const files = { 'dist/stitch-vines.js': r('dist/stitch-vines.js'), 'PROMPT.md': r('PROMPT.md'), 'kit/README.md': r('studio/kit/README.md') };
// the zip button reads these instead of fetching them
h = h.replace("function get(u){return fetch(u)", "var EMB=" + JSON.stringify(files).replace(/<\//g, '<\\/') + ";function get(u){var k=u.replace(/^\\.\\.\\//,'');if(EMB[k])return Promise.resolve(new TextEncoder().encode(EMB[k]));return fetch(u)");
h = h.replace('<a id="l1" href="../dist/stitch-vines.js" download>stitch-vines.js</a>, <a id="l2" href="../PROMPT.md" download>PROMPT.md</a>', '<a id="l1" download="stitch-vines.js" href="data:text/javascript;charset=utf-8,' + encodeURIComponent(files['dist/stitch-vines.js']) + '">stitch-vines.js</a>, <a id="l2" download="PROMPT.md" href="data:text/markdown;charset=utf-8,' + encodeURIComponent(files['PROMPT.md']) + '">PROMPT.md</a>');
h = h.replace("var abs=new URL('../dist/stitch-vines.js',location.href).href;", "var abs='https://YOUR-ADDRESS/stitch-vines.js'; /* [TO CONFIRM: the address where you host the script] */");
fs.writeFileSync(process.argv[2], h); console.log('wrote', process.argv[2], (h.length / 1024).toFixed(0) + ' KB');
