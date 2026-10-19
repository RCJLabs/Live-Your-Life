/**
 * The law module's slice (M1.5): what the shop remembers of you, the cases against you, your
 * record, probation, what you owe, and the police's visits to come. And the rules its parts
 * share: today, a timer that tells the player when it is set (D46: no ambush), and convicting.
 */
import type { DeepReadonly, FactView, ModuleContext, Rng } from '@eb/core';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { type Today, tickAt, todayOf } from '../job/days.ts';
import { crimeOf, offenceOf, SHOPLIFTING } from './records.ts';

export type Evidence = 'held' | 'camera' | 'sale';

export interface Case {
  readonly id: number;
  readonly offence: string;
  /** What was taken or sold, in cents. */
  readonly value: number;
  readonly evidence: Evidence;
  /** The day of its hearing. */
  readonly court: number;
  /** Set when the court date was missed. */
  readonly warrant: boolean;
}

/** The police coming at a time the player has been told (D46). */
export interface Visit {
  readonly id: number;
  readonly why: 'camera' | 'sale' | 'warrant';
  readonly item: string;
  /** The case a warrant is for; 0 otherwise. */
  readonly case: number;
}

/** The held mode's data: held by the clerk until the police come, or in the cells until the hearing. */
export interface Hold {
  readonly why: 'clerk' | 'jail';
  readonly until: number;
  readonly case?: number;
}

export interface LawSlice {
  /** The block the corner shop stands on, drawn at the start (M1.6 joins it to the page's). */
  block: string;
  /** What the shop remembers of you (D46), as of the last midnight and since. */
  heat: number;
  /** Thefts the camera caught today, reviewed at close. */
  filmed: { item: string; value: number }[];
  visits: Visit[];
  cases: Case[];
  /** The next case's and visit's id. */
  next: number;
  convictions: number;
  hyta: 'none' | 'on' | 'done' | 'revoked';
  probation: { until: number; next: number; offence: string } | null;
  owed: { demand: number; court: number };
  /** Barred from the shop, by a trespass notice after being caught there (tune). */
  barred: boolean;
}

export type LawContext = ModuleContext<LawSlice>;
export type LawView = FactView<LawSlice>;

export const freshLaw = (rng: Rng): LawSlice => ({
  block: `block-${rng.int(0, 0x7fffffff)}`,
  heat: 0,
  filmed: [],
  visits: [],
  cases: [],
  next: 1,
  convictions: 0,
  hyta: 'none',
  probation: null,
  owed: { demand: 0, court: 0 },
  barred: false,
});

export const sliceOf = (view: LawView | LawContext): DeepReadonly<LawSlice> =>
  'state' in view ? view.state : view.read();

export const crime = (view: { content: LawContext['content'] }) => crimeOf(view.content, SHOPLIFTING);

/** A whole number from `min` to `max` from the law's own stream. */
export const between = (ctx: LawContext, min: number, max: number): number => ctx.rng('law').int(min, max);

/**
 * Sets a timer the player is told of when it is set: what is coming, and when (D46). Every timer
 * the law sets goes through here, so none comes as an ambush.
 */
export function setTimer(ctx: LawContext, timer: string, at: number, effects: object[], what: string): void {
  const now = todayOf(ctx).tick;
  const minutes = Math.max(1, at - now);
  ctx.apply({ effect: 'schedule', timer, after: { minutes }, effects });
  ctx.emit('notice', { what, timer, tick: now + minutes });
}

/** The tick of a minute of a day. */
export const tickOf = (today: Today, day: number, minute: number): number => tickAt(today, day, minute);

/** A conviction on the record: its fine and costs owed (D47). */
export function convict(ctx: LawContext, offence: string, why: string): void {
  const o = offenceOf(ctx.content, offence);
  const w = ctx.write();
  w.convictions += 1;
  w.owed.court += o.fine + o.costs;
  ctx.emit('convicted', { offence, why, owed: o.fine + o.costs });
}

/** Age in whole years, from 18 at the start (D20). */
export const ageOn = (day: number): number => 18 + Math.floor(day / 365);

export const DAY = MINUTES_PER_DAY;
