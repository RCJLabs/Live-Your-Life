/**
 * Life events as records (M2.10 step 4, D135): what happens, how often a year, the choices with
 * their costs and odds, and what follows, told to you and written in the journal.
 */
import type { Condition, RecordStore } from '@eb/core';
import { MONTHS } from '../calendar.ts';
import type { Need } from '../needs.ts';

export interface LifeOutcome {
  readonly told: string;
  /** The journal's line, with {you} for the name. */
  readonly line: string;
  /** Cents gained, or lost up to the cash on hand. */
  readonly cash?: number;
  readonly needs?: Readonly<Partial<Record<Need, number>>>;
}

export interface LifeChoice {
  readonly id: string;
  readonly text: string;
  readonly cost?: number;
  readonly minutes?: number;
  /** Percent; the failure follows otherwise. */
  readonly odds?: number;
  readonly outcome: LifeOutcome;
  readonly failure?: LifeOutcome;
}

export interface LifeEventRecord {
  readonly name: string;
  /** Times a year in 1,000 people. */
  readonly rate: number;
  readonly months?: readonly number[];
  readonly when?: Condition;
  readonly prompt: string;
  readonly choices: readonly LifeChoice[];
}

export const lifeEventsOf = (content: RecordStore): [string, LifeEventRecord][] =>
  content.ids('life-event').map((id) => [id, content.get<LifeEventRecord>('life-event', id) as LifeEventRecord]);

export function lifeEventOf(content: RecordStore, id: string): LifeEventRecord {
  const e = content.get<LifeEventRecord>('life-event', id);
  if (!e) throw new Error(`No life event "${id}"`);
  return e;
}

export function choiceOf(content: RecordStore, event: string, choice: unknown): LifeChoice {
  const c = lifeEventOf(content, event).choices.find((x) => x.id === choice);
  if (!c) throw new Error(`Life event "${event}" has no choice "${String(choice)}"`);
  return c;
}

/** Days a year it can come on: its months', or all 365. */
export const daysOf = (e: LifeEventRecord): number =>
  e.months ? e.months.reduce((n, m) => n + (MONTHS[m - 1] as (typeof MONTHS)[number]).days, 0) : 365;

/** A day's chance per 100,000 on a day it can come: the year's rate shared over its days. */
export const dayChance = (e: LifeEventRecord): number => (e.rate * 100) / daysOf(e);
