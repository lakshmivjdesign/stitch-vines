// Sorts the generator's output into what the drawing styles need. Used by the worker and by the main-thread fallback.
//   parts: polylines by kind (stem, leaf, flower)      items: stems, and organs with their kind, direction and size
function StitchCollect(out) {
  const parts = { stem: [], leaf: [], flower: [] }, items = { stems: [], organs: [] };
  (out.limbs || []).forEach(l => {
    const stem = l.head.concat(l.stem, l.tail);
    parts.stem.push(stem); items.stems.push(stem);
    l.organs.forEach(o => { o.polys.forEach(p => parts[o.kind === 'leaf' ? 'leaf' : 'flower'].push(p)); items.organs.push({ kind: o.kind, dir: o.dir, size: o.size, polys: o.polys }); });
  });
  return { parts, items, limbs: (out.limbs || []).length };
}
if (typeof self !== 'undefined') self.StitchCollect = StitchCollect;
