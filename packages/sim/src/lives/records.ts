/** The mortality record (packages/content/types/mortality.json, M2.7, D103): one, the US table's. */
import type { RecordStore } from '@eb/core';

export const MORTALITY = 'united-states';

export interface MortalityRecord {
  readonly name: string;
  /** Per 100,000, the chance of dying within a year at each row's age, by body. */
  readonly table: readonly { readonly age: number; readonly carries: number; readonly not: number }[];
  readonly health: { readonly below: number; readonly times: number };
}

export function mortalityOf(store: RecordStore): MortalityRecord {
  const m = store.get<MortalityRecord>('mortality', MORTALITY);
  if (!m) throw new Error(`mortality "${MORTALITY}": no such record`);
  return m;
}

/** A year's chance of dying at `age`, per 100,000: the table's, a straight line between its rows. */
export function yearChance(m: MortalityRecord, age: number, carries: boolean): number {
  const at = (r: MortalityRecord['table'][number]) => (carries ? r.carries : r.not);
  const rows = m.table;
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return 0;
  if (age <= first.age) return at(first);
  if (age >= last.age) return at(last);
  const i = rows.findIndex((r) => r.age > age);
  const lo = rows[i - 1] as MortalityRecord['table'][number];
  const hi = rows[i] as MortalityRecord['table'][number];
  return at(lo) + Math.floor(((at(hi) - at(lo)) * (age - lo.age)) / (hi.age - lo.age));
}
