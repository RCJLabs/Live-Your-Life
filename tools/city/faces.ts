/**
 * `node tools/city/faces.ts [seeds]`: every face of every block in the walkable districts, planned
 * and checked (M2.1's third gate: M1.1's and M1.2's rules, the city's lots, every door joined to the
 * street), and the time a face takes, for Readings: a face is planned only when it is needed.
 */
import { createRecordStore } from '@eb/core';
import { PACK } from '@lyl/content';
import { cityTemplates, type FaceSide, faceProblems, planCity, planFace } from '@lyl/sim';

const seeds = Number(process.argv[2] ?? 10);
const store = createRecordStore(PACK.records);
const ms: number[] = [];
const problems: string[] = [];
let faces = 0;
let buildings = 0;
for (let s = 0; s < seeds; s++) {
  const city = planCity(store, `faces-${s}`);
  const ct = cityTemplates(store, city);
  for (let block = 0; block < city.blocks.count; block++) {
    if (!ct.districts[city.blocks.district[block] as number]?.frontage) continue;
    for (const side of [0, 1] as FaceSide[]) {
      const t0 = performance.now();
      const plan = planFace(ct, city, block, side);
      ms.push(performance.now() - t0);
      faces++;
      buildings += plan.buildings.length;
      problems.push(...faceProblems(ct, city, block, side, plan));
    }
  }
}
ms.sort((a, b) => a - b);
const at = (q: number) => (ms[Math.min(ms.length - 1, Math.floor(q * ms.length))] as number).toFixed(3);
console.log(`Node ${process.version}, ${seeds} cities: ${faces} faces, ${buildings} buildings`);
console.log(`a face planned: median ${at(0.5)} ms, 95th ${at(0.95)}, worst ${at(1)}`);
console.log(
  problems.length === 0 ? 'no problems' : `${problems.length} problems:\n${problems.slice(0, 20).join('\n')}`,
);
process.exitCode = problems.length === 0 ? 0 : 1;
