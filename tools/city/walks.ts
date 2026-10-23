/**
 * `node tools/city/walks.ts [seeds] [pairs]`: the city's street network built from each plan, and
 * walks between doors of the walkable districts, chosen by the seed, timed (M2.1's fourth gate:
 * a route reaches any building in the walkable districts from any other).
 */
import { createRecordStore, Rng } from '@eb/core';
import { PACK } from '@lyl/content';
import {
  cityTemplates,
  districtOf,
  type FaceSide,
  inFront,
  planCity,
  planFace,
  streetsOf,
  walkBetween,
} from '@lyl/sim';

const seeds = Number(process.argv[2] ?? 10);
const pairs = Number(process.argv[3] ?? 200);
const store = createRecordStore(PACK.records);
const build: number[] = [];
const walk: number[] = [];
const metres: number[] = [];
let missed = 0;
let nodes = 0;
for (let s = 0; s < seeds; s++) {
  const city = planCity(store, `walks-${s}`);
  const records = city.districts.map((_, i) => districtOf(store, city, i));
  const ct = cityTemplates(store, city);
  const t0 = performance.now();
  const streets = streetsOf(city, records);
  build.push(performance.now() - t0);
  nodes = streets.count;
  const rng = Rng.create(`walks-${s}`);
  const walkable = Array.from({ length: city.blocks.count }, (_, b) => b).filter(
    (b) => ct.districts[city.blocks.district[b] as number]?.frontage,
  );
  const door = () => {
    for (;;) {
      const block = rng.pick(walkable);
      const side = rng.int(0, 1) as FaceSide;
      const b = planFace(ct, city, block, side).buildings;
      if (b.length > 0) return inFront(city, records, streets, block, side, rng.pick(b).door);
    }
  };
  for (let i = 0; i < pairs; i++) {
    const from = door();
    const to = door();
    const t1 = performance.now();
    const w = walkBetween(streets, from, to);
    walk.push(performance.now() - t1);
    if (w) metres.push(w.metres);
    else missed++;
  }
}
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] as number;
};
console.log(`Node ${process.version}, ${seeds} cities, ${pairs} walks each; ${nodes} street corners in the last`);
console.log(`streets built: median ${q(build, 0.5).toFixed(1)} ms, worst ${q(build, 1).toFixed(1)}`);
console.log(
  `a walk: median ${q(walk, 0.5).toFixed(2)} ms, 95th ${q(walk, 0.95).toFixed(2)}, worst ${q(walk, 1).toFixed(2)}`,
);
console.log(
  `metres: median ${q(metres, 0.5).toFixed(0)}, longest ${q(metres, 1).toFixed(0)}; no walk found: ${missed}`,
);
process.exitCode = missed === 0 ? 0 : 1;
