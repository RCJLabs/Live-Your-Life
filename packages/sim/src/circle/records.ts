/** The population record (packages/content/types/population.json, M2.6): one, the city's. */
import type { RecordStore } from '@eb/core';

export const POPULATION = 'ridgefield';

export interface Band {
  readonly from: number;
  readonly to: number;
}

export interface PopulationRecord {
  readonly name: string;
  readonly names: string;
  readonly ages: readonly (Band & { readonly share: number })[];
  readonly drawn: readonly (Band & { readonly same: number; readonly both: number })[];
  readonly chemistry: { readonly free: number; readonly per: number };
  readonly ties: {
    readonly kept: number;
    readonly perHour: number;
    readonly half: number;
    readonly atWork: number;
    readonly haunts: number;
  };
}

const fail = (problem: string): never => {
  throw new Error(`population "${POPULATION}": ${problem}`);
};

/** Bands that run from 18 up without a gap or an overlap. */
function checkBands(what: string, bands: readonly Band[]): void {
  let next = 18;
  for (const b of bands) {
    if (b.from !== next || b.to < b.from) fail(`${what} band ${b.from}–${b.to} should start at ${next}`);
    next = b.to + 1;
  }
}

const checked = new WeakMap<object, PopulationRecord>();

/** The record, checked once: the age shares make a thousand, and nobody is drawn as under 18 (D89). */
export function populationOf(store: RecordStore): PopulationRecord {
  const p = store.get<PopulationRecord>('population', POPULATION) ?? fail('no such record');
  if (checked.has(p)) return p;
  checkBands('age', p.ages);
  checkBands('drawn', p.drawn);
  const total = p.ages.reduce((s, a) => s + a.share, 0);
  if (total !== 1000) fail(`age shares make ${total}, not 1000`);
  const oldest = (p.ages[p.ages.length - 1] as Band).to;
  if ((p.drawn[p.drawn.length - 1] as Band).to < oldest) fail(`drawn bands stop before ${oldest}`);
  for (const d of p.drawn) if (d.same + d.both > 1000) fail(`drawn ${d.from}–${d.to} is over a thousand`);
  checked.set(p, p);
  return p;
}
