/**
 * The records the ties module reads (packages/content/types/name-pool.json, act.json,
 * favour.json, and the career's crew), with the checks a type file can't carry. A bad record
 * throws when it is read, naming itself, as the job's do (job/records.ts).
 */
import type { RecordStore } from '@eb/core';

export type Pronouns = 'she' | 'he' | 'they';

export interface NamePool {
  readonly name: string;
  readonly first: readonly { readonly name: string; readonly pronouns: Pronouns }[];
  readonly last: readonly string[];
}

export interface ActRecord {
  readonly name: string;
  /** Points of regard it moves, every time. */
  readonly regard: number;
  /** The line they remember it by, said to you: {name}, {them} and {their} are filled in. */
  readonly says: string;
}

export interface FavourRecord {
  readonly name: string;
  readonly asks: string;
  readonly yes: { readonly text: string; readonly told: string };
  readonly no: { readonly text: string; readonly told: string };
}

/** What they remember of what you do around them, act by act (D42). */
export interface CrewActs {
  readonly late: string;
  readonly noShow: string;
  readonly covered: string;
  readonly refused: string;
  readonly ignored: string;
  readonly asked: string;
}

/** Who works beside you (D41): the career record's `crew`. */
export interface Crew {
  readonly names: string;
  readonly ages: { readonly min: number; readonly max: number };
  readonly days: number;
  readonly asks: number;
  readonly favour: string;
  readonly cover: { readonly base: number; readonly regard: number };
  readonly half: number;
  readonly acts: CrewActs;
}

const fail = (what: string, problem: string): never => {
  throw new Error(`${what}: ${problem}`);
};

export const actOf = (store: RecordStore, id: string): ActRecord =>
  store.get<ActRecord>('act', id) ?? fail(`act "${id}"`, 'no such record');

export const favourOf = (store: RecordStore, id: string): FavourRecord =>
  store.get<FavourRecord>('favour', id) ?? fail(`favour "${id}"`, 'no such record');

export const namePoolOf = (store: RecordStore, id: string): NamePool =>
  store.get<NamePool>('name-pool', id) ?? fail(`name pool "${id}"`, 'no such record');

/** A crew, checked: its ages in order, and every record it names there. */
export function crewOf(store: RecordStore, career: string, crew: Crew): Crew {
  const what = `the crew of career "${career}"`;
  if (crew.ages.min > crew.ages.max) fail(what, 'is older at its youngest than at its oldest');
  namePoolOf(store, crew.names);
  favourOf(store, crew.favour);
  for (const act of Object.values(crew.acts)) actOf(store, act);
  return crew;
}
