/**
 * The city bench's measure (M2.1, D65): the whole city planned from each of `seeds` seeds, `rounds`
 * times, with what it made. The caller supplies the clock and the heap, Node's or the page's.
 */
import { createRecordStore } from '@eb/core';
import { PACK } from '@lyl/content';
import { type CityPlan, planCity } from '@lyl/sim';

export interface CityReading {
  readonly ms: number[];
  readonly blocks: number;
  readonly lots: number;
  readonly population: number;
  /** Bytes the plan's typed arrays hold. */
  readonly bytes: number;
  /** The heap's growth over the first plan kept, if the caller can read the heap. */
  readonly heap: number | null;
}

const arrayBytes = (plan: CityPlan): number =>
  [plan.cellDistrict, ...Object.values(plan.blocks), ...Object.values(plan.lots)]
    .filter((v): v is ArrayBufferView => ArrayBuffer.isView(v))
    .reduce((sum, a) => sum + a.byteLength, 0);

export async function measureCity(
  seeds: number,
  rounds: number,
  now: () => number,
  heap: () => number | null,
  between: () => Promise<void> = async () => undefined,
): Promise<CityReading> {
  const store = createRecordStore(PACK.records);
  const ms: number[] = [];
  const before = heap();
  const kept = planCity(store, 'kept');
  const after = heap();
  for (let r = 0; r < rounds; r++) {
    for (let s = 0; s < seeds; s++) {
      const t = now();
      planCity(store, `bench-${s}`);
      ms.push(now() - t);
      await between();
    }
  }
  return {
    ms,
    blocks: kept.blocks.count,
    lots: kept.lots.count,
    population: kept.population,
    bytes: arrayBytes(kept),
    heap: before === null || after === null ? null : after - before,
  };
}

export function formatCity(r: CityReading): string {
  const sorted = [...r.ms].sort((a, b) => a - b);
  const at = (q: number) => (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] as number).toFixed(1);
  const mb = (b: number) => (b / 1_048_576).toFixed(2);
  return [
    `${r.blocks} blocks, ${r.lots} lots, ${r.population} people`,
    `plan: median ${at(0.5)} ms, 95th ${at(0.95)} ms, worst ${at(1)} ms (N=${r.ms.length})`,
    `typed arrays ${mb(r.bytes)} MB; heap grew ${r.heap === null ? 'unread' : `${mb(r.heap)} MB`} keeping one plan`,
  ].join('\n');
}
