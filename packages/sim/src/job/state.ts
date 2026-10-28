/**
 * The job's slice and the rules every part of it shares: the career it is for, skill from
 * practice, standing and what ends a job (D39), and finding a signed-up shift and its window.
 */
import type { FactView, ModuleContext, RecordStore } from '@eb/core';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { type Posting, shiftKind, startOf, type Today, tickAt, todayOf } from './days.ts';
import { type CareerRecord, careerOf } from './records.ts';

export interface SignUp {
  readonly day: number;
  readonly shift: string;
  /** Minutes into the shift its event is due, or null when it has none. */
  readonly event: number | null;
  /** The tick work on it first started, or null before then. */
  in: number | null;
  /** Minutes worked on it so far. */
  worked: number;
  /** Sent home by an event: the rest of the shift is excused. */
  home: boolean;
}

export interface JobSlice {
  /** The career record's id: the job held, or the last one. Null for someone never hired. */
  career: string | null;
  employed: boolean;
  /** 0 to 100 (D39). */
  standing: number;
  /** Minutes of practice at the career's work: what skill grows from. */
  practice: number;
  /** The shifts offered, from tomorrow on, one a day at most. */
  posted: Posting[];
  /** The shifts signed up for and not yet over. */
  signed: SignUp[];
  /** When each no-show was, in ticks, while it still counts as a warning. */
  warnings: number[];
  /** Minutes worked since the last payday. */
  unpaid: number;
  /** The calendar year `earned` is for, and the gross pay in it so far, in cents: Social Security's cap. */
  year: number;
  earned: number;
  /** The shift events drawn since every one the career can draw last came up. */
  drawn: string[];
  /** Minutes worked in each career, at any employer, kept across jobs: what hiring asks as experience (M2.5, D122). */
  experience: Record<string, number>;
  /** The days of shifts over, worked or not, in the last two weeks: the week's limit counts them (M2.5). */
  done: number[];
}

export type JobContext = ModuleContext<JobSlice>;

/** Someone with no job. */
export const jobless = (): JobSlice => ({
  career: null,
  employed: false,
  standing: 0,
  practice: 0,
  posted: [],
  signed: [],
  warnings: [],
  unpaid: 0,
  year: 0,
  earned: 0,
  drawn: [],
  experience: {},
  done: [],
});

// Each record is checked once: they are frozen, and a fact reads the career many times a turn.
const checked = new WeakMap<object, CareerRecord>();

/** The career a slice is for, checked. Throws for a slice with none. */
export function careerFor(content: RecordStore, slice: { readonly career: string | null }): CareerRecord {
  if (slice.career === null) throw new Error('job: no career');
  const record = content.get<CareerRecord>('career', slice.career);
  const known = record === undefined ? undefined : checked.get(record);
  if (known) return known;
  const career = careerOf(content, slice.career);
  checked.set(career, career);
  return career;
}

/** Skill, 0 to 100: it comes more slowly the more there is, so a week of shifts can't buy it. */
export const skillOf = (practice: number, half: number): number => Math.floor((100 * practice) / (practice + half));

/** The ticks a signed-up shift starts and ends. */
export function windowOf(career: CareerRecord, today: Today, s: { readonly day: number; readonly shift: string }) {
  const kind = shiftKind(career, s.shift);
  const start = tickAt(today, s.day, startOf(kind));
  return { start, end: start + kind.minutes };
}

/** Today's shift, while it runs and you haven't been sent home from it. */
export function shiftNow(view: FactView<JobSlice> | JobContext): { s: SignUp; start: number; end: number } | null {
  const slice = 'state' in view ? view.state : view.read();
  if (!slice.employed) return null;
  const today = todayOf(view);
  for (const s of slice.signed) {
    if (s.home) continue;
    const { start, end } = windowOf(careerFor(view.content, slice), today, s);
    if (start <= today.tick && today.tick < end) return { s: s as SignUp, start, end };
  }
  return null;
}

/** The named timers of a signed-up shift: its event, and its end. */
export const timerFor = (day: number, what: 'event' | 'over'): string => `shift-${day}-${what}`;

/** The warnings still counting: those given within the career's lapse. */
export const activeWarnings = (
  slice: { readonly warnings: readonly number[] },
  career: CareerRecord,
  tick: number,
): number[] => slice.warnings.filter((at) => tick - at < career.warnings.lapse * MINUTES_PER_DAY);

/** The job ends: every shift signed up for is dropped, and nothing more is posted. */
export function letGo(ctx: JobContext, reason: 'no-shows' | 'warnings' | 'standing' | 'prison' | 'record'): void {
  const slice = ctx.write();
  for (const s of slice.signed) {
    ctx.apply({ effect: 'cancel-timer', timer: timerFor(s.day, 'event') });
    ctx.apply({ effect: 'cancel-timer', timer: timerFor(s.day, 'over') });
  }
  slice.signed = [];
  slice.posted = [];
  slice.employed = false;
  ctx.emit('let-go', { reason });
}

/** Moves standing, kept from 0 to 100. At 0 the job ends (D39). */
export function moveStanding(ctx: JobContext, by: number, why: string): void {
  if (by === 0) return;
  const slice = ctx.write();
  slice.standing = Math.min(100, Math.max(0, slice.standing + by));
  ctx.emit('standing', { by, now: slice.standing, why });
  if (slice.standing === 0 && slice.employed) letGo(ctx, 'standing');
}
