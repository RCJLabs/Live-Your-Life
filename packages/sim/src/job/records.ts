/**
 * The records the job reads (packages/content/types/career.json, shift-event.json, tax.json),
 * and the checks a type file can't carry: brackets in order, outcomes that match their odds,
 * certain choices first. A bad record throws when it is read, naming itself, as the block's
 * templates do (city/records.ts).
 */
import type { Condition, RecordStore } from '@eb/core';
import { MINUTES_PER_DAY } from '../calendar.ts';
import type { Need } from '../needs.ts';
import type { Crew } from '../ties/records.ts';

export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ShiftKind {
  readonly id: string;
  readonly hour: number;
  readonly minute: number;
  readonly minutes: number;
}

export interface StandingRules {
  readonly start: number;
  readonly shift: number;
  readonly lateAfter: number;
  readonly late: number;
  readonly missedAfter: number;
  readonly leftEarly: number;
  readonly noShow: number;
  readonly dropBefore: number;
  readonly drop: number;
}

/** Where a career's employers stand and how often their staff leave (D74). */
export interface Employers {
  readonly districts: readonly string[];
  readonly staff: number;
  /** Separations a month per thousand staff. */
  readonly turnover: number;
  /** Jobs per ten thousand in the city: how often a tier-1 workplace works it; 0 for a rank reached by promotion. */
  readonly share: number;
}

/** The odds an application is taken (D74): the base, less `record` with a conviction, ± `reputation`. */
export interface Hiring {
  readonly base: number;
  readonly record: number;
  readonly reputation: number;
}

export interface CareerRecord {
  readonly name: string;
  /** The building on your block it is worked in, when it is walkable there; otherwise off screen (D73). */
  readonly place?: string;
  /** Cents an hour, before tax. */
  readonly wage: number;
  readonly employers: Employers;
  readonly requires?: { readonly record?: 'none' | 'no-theft' | 'no-felony' };
  readonly hiring: Hiring;
  readonly shifts: readonly ShiftKind[];
  readonly open: readonly Weekday[];
  readonly posting: { readonly weekday: Weekday; readonly fewest: number; readonly most: number };
  readonly perWeek: number;
  readonly pay: { readonly weekday: Weekday; readonly hour: number; readonly minute: number };
  readonly withholding: readonly string[];
  readonly standing: StandingRules;
  readonly warnings: { readonly letGoAt: number; readonly lapse: number };
  readonly skill: { readonly half: number };
  /** Who works beside you (D41), when anyone does. */
  readonly crew?: Crew;
  readonly events: { readonly tags: readonly string[]; readonly chance: number };
  /** The rank it leads to, with the same employer, once practice and standing are enough (M2.4). */
  readonly ladder?: { readonly next: string; readonly practice: number; readonly standing: number };
}

export interface Outcome {
  readonly told: string;
  readonly standing?: number;
  readonly practice?: number;
  readonly home?: boolean;
  readonly needs?: Readonly<Partial<Record<Need, number>>>;
  /** What the person beside you remembers of it (D42). */
  readonly act?: string;
  /** An arrest made, charged as this offence (M2.4): the police career's work. */
  readonly arrest?: string;
}

export interface Odds {
  readonly base: number;
  readonly skill: number;
  readonly tired: number;
  /** For a choice that leans on the person beside you: added at their full regard, taken away at none (D43). */
  readonly regard?: number;
}

export interface Choice {
  readonly id: string;
  readonly text: string;
  readonly odds?: Odds;
  /** What follows: always, or when the odds come up. */
  readonly outcome: Outcome;
  /** What follows when they don't: exactly when there are odds. */
  readonly failure?: Outcome;
}

export interface ShiftEventRecord {
  readonly name: string;
  readonly tags: readonly string[];
  readonly weight: number;
  readonly when?: Condition;
  readonly prompt: string;
  readonly choices: readonly Choice[];
}

export interface TaxRecord {
  readonly name: string;
  /** Cents a year taken off pay before the brackets. */
  readonly deduction: number;
  /** From the lowest; `over` in cents a year, `rate` in hundredths of a percent. */
  readonly brackets: readonly { readonly over: number; readonly rate: number }[];
  /** The most pay taxed in a calendar year, in cents. */
  readonly cap?: number;
}

const fail = (what: string, problem: string): never => {
  throw new Error(`${what}: ${problem}`);
};

const unique = (ids: readonly string[]): boolean => new Set(ids).size === ids.length;

/** A career, checked: its shifts within a day, its counts in order, and its taxes there. */
export function careerOf(store: RecordStore, id: string): CareerRecord {
  const what = `career "${id}"`;
  const c = store.get<CareerRecord>('career', id) ?? fail(what, 'no such record');
  if (!unique(c.shifts.map((s) => s.id))) fail(what, 'two shifts have one id');
  for (const s of c.shifts) {
    if (s.hour * 60 + s.minute + s.minutes > MINUTES_PER_DAY) fail(what, `shift "${s.id}" runs past midnight`);
  }
  if (c.posting.fewest > c.posting.most) fail(what, 'posts more at its fewest than at its most');
  if (!unique(c.open)) fail(what, 'a day is open twice');
  for (const tax of c.withholding) taxOf(store, tax);
  return c;
}

/** A shift event, checked: its choices' ids, a failure exactly with odds, certain choices first. */
export function shiftEventOf(store: RecordStore, id: string): ShiftEventRecord {
  const what = `shift event "${id}"`;
  const e = store.get<ShiftEventRecord>('shift-event', id) ?? fail(what, 'no such record');
  if (!unique(e.choices.map((c) => c.id))) fail(what, 'two choices have one id');
  let chancy = false;
  for (const c of e.choices) {
    if ((c.odds === undefined) !== (c.failure === undefined)) {
      fail(what, `choice "${c.id}" needs a failure exactly when it has odds`);
    }
    if (c.odds === undefined && chancy) fail(what, `certain choice "${c.id}" comes after a chancy one`);
    chancy ||= c.odds !== undefined;
  }
  return e;
}

/** A tax, checked: brackets from 0, each starting above the last. */
export function taxOf(store: RecordStore, id: string): TaxRecord {
  const what = `tax "${id}"`;
  const t = store.get<TaxRecord>('tax', id) ?? fail(what, 'no such record');
  if (t.brackets[0]?.over !== 0) fail(what, 'the first bracket must start at 0');
  // withholding.ts taxes a capped tax's pay as it is, with no year's sums to deduct from.
  if (t.cap !== undefined && (t.deduction !== 0 || t.brackets.length !== 1)) {
    fail(what, 'a tax with a cap has one rate and no deduction');
  }
  t.brackets.forEach((b, i) => {
    if (i > 0 && b.over <= (t.brackets[i - 1] as { over: number }).over) fail(what, `bracket ${i} starts too low`);
  });
  return t;
}

/** The events a career draws: those sharing one of its tags, sorted by id. */
export function eventsFor(store: RecordStore, career: CareerRecord): [string, ShiftEventRecord][] {
  return store
    .ids('shift-event')
    .map((id): [string, ShiftEventRecord] => [id, shiftEventOf(store, id)])
    .filter(([, e]) => e.tags.some((tag) => career.events.tags.includes(tag)));
}
