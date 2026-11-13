// Builds two files from src/:
//   dist/vine-grow.js       the generator only (engine + planner), no page code: what the tests and the worker run
//   dist/stitch-vines.js    THE file people add to a page: adapter + looks + runtime (the generator is embedded and runs in a background worker)
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const core = ['src/engine.js', 'src/plan-general.js', 'src/planner.js', 'src/fit.js'].map(read).join('\n');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'vine-grow.js'), core);
const banner = '/* stitch-vines v0.2 (MIT). Grows plant-like vine backgrounds in the empty margins and gaps of a web page. https://github.com/lakshmivjdesign/stitch-vines */\n';
const runtime = read('src/runtime.js').replace('__CORE_SRC__', () => JSON.stringify(core)).replace('__WORKER_GLUE__', () => JSON.stringify(read('src/worker-glue.js')));
const one = banner + [read('src/page-adapter.js'), read('src/looks.js'), runtime].join('\n');
fs.writeFileSync(path.join(root, 'dist', 'stitch-vines.js'), one);
console.log('dist/vine-grow.js ' + (core.length / 1024).toFixed(0) + ' KB; dist/stitch-vines.js ' + (one.length / 1024).toFixed(0) + ' KB');
