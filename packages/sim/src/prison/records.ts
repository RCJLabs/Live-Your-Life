/** The prison the module reads (packages/content/types/prison.json, D81): one, the state's. */
import type { RecordStore } from '@eb/core';

export const PRISON = 'state-prison';

export interface PrisonRecord {
  readonly name: string;
  /** Cents a day at the prison job. */
  readonly wage: number;
  readonly standing: { readonly start: number; readonly working: number; readonly idle: number };
  readonly letters: { readonly every: number; readonly company: number };
  readonly visit: { readonly regard: number; readonly company: number };
  readonly parole: { readonly base: number; readonly standing: number; readonly again: number; readonly term: number };
  readonly acts: { readonly inside: string; readonly letter: string; readonly silent: string };
}

export const prisonOf = (store: RecordStore): PrisonRecord => {
  const p = store.get<PrisonRecord>('prison', PRISON);
  if (!p) throw new Error(`prison "${PRISON}": no such record`);
  return p;
};
