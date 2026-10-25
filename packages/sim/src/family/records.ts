/** The pregnancy record (packages/content/types/pregnancy.json, M2.6 step 4): one, Michigan's. */
import type { RecordStore } from '@eb/core';

export const PREGNANCY = 'michigan';

export interface PregnancyRecord {
  readonly name: string;
  /** In ten thousand, a night without protection and with. */
  readonly night: { readonly none: number; readonly protected: number };
  readonly ages: readonly { readonly from: number; readonly share: number }[];
  readonly known: number;
  readonly loss: { readonly chance: number; readonly early: number };
  readonly end: {
    readonly pills: number;
    readonly pillCost: number;
    readonly limit: number;
    readonly clinicCost: number;
    readonly opens: number;
    readonly closes: number;
  };
  readonly partner: number;
  readonly term: { readonly week: number; readonly spread: number };
  readonly birth: number;
  readonly care: {
    readonly needs: readonly { readonly under: number; readonly minutes: number }[];
    readonly partner: number;
    readonly sitting: number;
    readonly daycare: { readonly under: number; readonly cost: number };
    readonly neglect: { readonly days: number; readonly window: number };
    readonly investigation: number;
  };
}

export function pregnancyOf(store: RecordStore): PregnancyRecord {
  const p = store.get<PregnancyRecord>('pregnancy', PREGNANCY);
  if (!p) throw new Error(`pregnancy "${PREGNANCY}": no such record`);
  return p;
}

/**
 * A night's chance in ten thousand, for a carrier of an age: the record's, by protection, times
 * the share left at that age, to a whole ten so it can be rolled as two percent rolls (night.ts).
 */
export function nightChance(p: PregnancyRecord, protect: boolean, age: number): number {
  const base = protect ? p.night.protected : p.night.none;
  const band = [...p.ages].reverse().find((a) => age >= a.from);
  return Math.floor((base * (band?.share ?? 0)) / 1000) * 10;
}
