/**
 * `node packages/sim/test/lives-bench.ts [lives] [rounds]`: M2.7's gate, the year in 1,000 lives
 * (test/year.ts). Lives from 18 to 90, spread evenly, each kept for a year: deaths by age band
 * against the life table's chances summed, and illnesses a life-year against the record's rates
 * (ROADMAP Readings). Defaults: 1,000 lives.
 */
import { type IllnessRecord, illnessOf } from '../src/health/records.ts';
import { sliceSim } from './slice.ts';
import { lifeYear, type Year } from './year.ts';

const lives = Number(process.argv[2] ?? 1000);
const bands = [
  [18, 39],
  [40, 64],
  [65, 90],
] as const;
const t0 = performance.now();
const years: Year[] = [];
for (let i = 0; i < lives; i++) years.push(lifeYear(`lives-${i}`, 18 + (i % 73)));
const ms = performance.now() - t0;
for (const [from, to] of bands) {
  const band = years.filter((y) => y.age >= from && y.age <= to);
  const died = band.filter((y) => y.died).length;
  const expected = band.reduce((n, y) => n + y.expected / 100_000, 0);
  const within = Math.abs(died - expected) <= 3 * Math.sqrt(expected) + 1;
  console.log(
    `ages ${from}-${to}: ${band.length} lives, ${died} died, ${expected.toFixed(1)} expected, within 3 sd: ${within}`,
  );
}
const r = illnessOf(sliceSim().content) as IllnessRecord;
for (const k of r.kinds) {
  const n = years.reduce((s, y) => s + (y.ill[k.id] ?? 0), 0);
  console.log(
    `${k.id}: ${(n / years.length).toFixed(3)} a life-year, the record's ${(k.perYear / 100).toFixed(3)} (no days ill counted out)`,
  );
}
console.log(`hospital stays: ${years.reduce((s, y) => s + y.hospital, 0)}; ${(ms / lives).toFixed(0)} ms a life-year`);
