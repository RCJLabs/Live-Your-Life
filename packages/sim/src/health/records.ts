/** The illness record (packages/content/types/illness.json, M2.7 step 2, D104, D105): one, Michigan's. */
import type { RecordStore } from '@eb/core';

export const ILLNESS = 'michigan';

export interface Kind {
  readonly id: string;
  readonly name: string;
  readonly perYear: number;
  readonly work: boolean;
  readonly days: number;
  readonly off: number;
  readonly health: number;
  readonly visit: number;
}

export interface IllnessRecord {
  readonly name: string;
  readonly kinds: readonly Kind[];
  readonly visit: {
    readonly none: number;
    readonly medicaid: number;
    readonly minutes: number;
    readonly opens: number;
    readonly closes: number;
  };
  readonly hospital: {
    readonly days: number;
    readonly none: number;
    readonly medicaid: number;
    readonly health: number;
  };
  readonly medicaid: { readonly one: number; readonly each: number; readonly hours: number };
}

/** The record, or null in a replay by a pack from before it: then nobody falls ill. */
export const illnessOf = (store: RecordStore): IllnessRecord | null =>
  store.get<IllnessRecord>('illness', ILLNESS) ?? null;

export const kindOf = (r: IllnessRecord, id: string): Kind => {
  const k = r.kinds.find((x) => x.id === id);
  if (!k) throw new Error(`illness "${id}": no such kind`);
  return k;
};

/** A day's chance of catching a kind, per 100,000: its yearly cases per 100 adults over the days. */
export const dayChance = (k: Kind): number => Math.round((k.perYear * 1000) / 365);

/** A shift's chance of a work injury, per 100,000: its yearly cases per 100 full-time workers, a year being 2,000 hours. */
export const shiftChance = (k: Kind, minutes: number): number => Math.round((k.perYear * 1000 * minutes) / (2000 * 60));
