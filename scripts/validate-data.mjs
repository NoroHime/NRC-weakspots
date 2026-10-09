import { readFileSync } from 'node:fs';

const data = JSON.parse(
  readFileSync(new URL('../src/data/type-chart.json', import.meta.url), 'utf8'),
);

const ids = data.types.map((t) => t.id);
const problems = [];

if (ids.length !== 18) problems.push(`type count is ${ids.length}, expected 18`);
if (new Set(ids).size !== ids.length) problems.push('duplicate type ids');

const matrixIds = Object.keys(data.matrix);
if (matrixIds.length !== ids.length) {
  problems.push(`matrix rows ${matrixIds.length}, expected ${ids.length}`);
}
for (const id of ids) {
  if (!matrixIds.includes(id)) problems.push(`missing matrix row: ${id}`);
}

let cells = 0;
for (const attack of ids) {
  const row = data.matrix[attack];
  if (!row) continue;
  const cols = Object.keys(row);
  if (cols.length !== 18) problems.push(`row ${attack} has ${cols.length} columns`);
  for (const defense of ids) {
    const value = row[defense];
    if (value === undefined) problems.push(`missing cell ${attack}->${defense}`);
    else if (!['strong', 'neutral', 'weak'].includes(value)) {
      problems.push(`bad value ${attack}->${defense} = ${value}`);
    }
    cells += 1;
  }
}

// Attack coverage: how many defense types a single attack type can hit for 'strong'.
const singleStrong = ids.map((attack) => ({
  attack,
  strong: ids.filter((d) => data.matrix[attack][d] === 'strong').length,
}));

// Greedy set cover size to confirm full coverage is achievable.
let uncovered = new Set(ids);
const chosen = [];
while (uncovered.size > 0) {
  let best = null;
  let bestGain = -1;
  for (const attack of ids) {
    if (chosen.includes(attack)) continue;
    const gain = ids.filter(
      (d) => uncovered.has(d) && data.matrix[attack][d] === 'strong',
    ).length;
    if (gain > bestGain) {
      bestGain = gain;
      best = attack;
    }
  }
  if (!best || bestGain <= 0) break;
  chosen.push(best);
  uncovered = new Set(
    ids.filter((d) => uncovered.has(d) && data.matrix[best][d] !== 'strong'),
  );
}

console.log('types:', ids.length, '| matrix rows:', matrixIds.length, '| cells checked:', cells);
console.log('violations:', problems.length);
for (const problem of problems) console.log('  -', problem);
console.log('single-attack strong counts:', JSON.stringify(singleStrong));
console.log('greedy cover picks:', chosen.length, chosen.join(','), '| remaining uncovered:', uncovered.size);
console.log(problems.length === 0 ? 'DATA OK' : 'DATA PROBLEMS FOUND');
