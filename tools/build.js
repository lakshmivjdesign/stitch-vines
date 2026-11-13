// Joins the parts into the one file people add to a page: dist/stitch-vines.js (engine, planner). Later: adapter, looks, worker.
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const parts = ['src/engine.js', 'src/plan-general.js', 'src/planner.js', 'src/fit.js'];
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'vine-grow.js'), parts.map(p => fs.readFileSync(path.join(root, p), 'utf8')).join('\n'));
console.log('dist/vine-grow.js written from', parts.join(' + '));
