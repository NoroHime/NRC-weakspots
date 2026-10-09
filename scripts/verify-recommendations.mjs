import { readFileSync } from 'node:fs';

const data = JSON.parse(
  readFileSync(new URL('../src/data/type-chart.json', import.meta.url), 'utf8'),
);

const ids = data.types.map((t) => t.id);
const n = ids.length;
const FULL = (1 << n) - 1;

const bit = new Map();
ids.forEach((id, index) => bit.set(id, 1 << index));

const mask = new Map();
for (const attack of ids) {
  let m = 0;
  for (const defense of ids) {
    if (data.matrix[attack][defense] === 'strong') m |= bit.get(defense);
  }
  mask.set(attack, m);
}

// Exactly how the app builds its candidate list: any attack type not selected.
function appMinCover(base, selected, limit) {
  if (base === FULL) return 0;
  const candidates = ids.filter((id) => !selected.includes(id));
  let minimumFull = Number.POSITIVE_INFINITY;

  function visit(startIndex, addedLen, combinedMask) {
    if (combinedMask === FULL) {
      if (addedLen < minimumFull) minimumFull = addedLen;
      return;
    }
    if (addedLen >= limit || addedLen >= minimumFull) return;
    for (let i = startIndex; i < candidates.length; i += 1) {
      const nextMask = combinedMask | mask.get(candidates[i]);
      if (nextMask === FULL) {
        if (addedLen + 1 < minimumFull) minimumFull = addedLen + 1;
      } else {
        visit(i + 1, addedLen + 1, nextMask);
      }
    }
  }

  visit(0, 0, base);
  return Number.isFinite(minimumFull) ? minimumFull : null;
}

// Independent brute force: smallest subset of candidate attack types that
// brings base up to FULL, by plain subset enumeration.
function bruteMinCover(base, selected) {
  if (base === FULL) return 0;
  const candidates = ids.filter((id) => !selected.includes(id));
  for (let size = 1; size <= candidates.length; size += 1) {
    const combo = [];
    let found = false;
    const recurse = (start, left) => {
      if (found) return;
      if (left === 0) {
        let m = base;
        for (const id of combo) m |= mask.get(id);
        if (m === FULL) found = true;
        return;
      }
      for (let i = start; i <= candidates.length - left; i += 1) {
        combo.push(candidates[i]);
        recurse(i + 1, left - 1);
        combo.pop();
      }
    };
    recurse(0, size);
    if (found) return size;
  }
  return null;
}

let mismatches = 0;
const bases = [{ label: '(empty)', base: 0, selected: [] }];
for (const id of ids) {
  bases.push({ label: id, base: mask.get(id), selected: [id] });
}

for (const { label, base, selected } of bases) {
  const app = appMinCover(base, selected, 10);
  const brute = bruteMinCover(base, selected);
  const status = app === brute ? 'ok' : 'MISMATCH';
  if (app !== brute) mismatches += 1;
  console.log(`${status.padEnd(8)} base=${label.padEnd(9)} app=${String(app).padEnd(5)} brute=${brute}`);
}

console.log('---');
console.log(`bases checked: ${bases.length} | mismatches: ${mismatches}`);
console.log(`minimum additions from empty selection = ${bruteMinCover(0, [])}`);
console.log(mismatches === 0 ? 'RECOMMENDATION ALGORITHM OK' : 'ALGORITHM PROBLEM');
