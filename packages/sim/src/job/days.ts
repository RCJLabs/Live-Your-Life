/**
 * Days and weeks for the job: which weekday a game day is, when a shift on it starts in ticks,
 * which Monday-to-Sunday week it falls in, and the shifts an employer posts for some days. All
 * of it is worked out from today, read off the time module's facts, so nothing here needs the
 * calendar itself.
 */
import type { Rng } from '@eb/core';
import { MINUTES_PER_DAY, WEEKDAYS } from '../calendar.ts';
import type { CareerRecord, ShiftKind, Weekday } from './records.ts';

/** Today, as the time module reads it: a day from the start, a weekday from Monday (0), and the time. */
export interface Today {
  readonly day: number;
  readonly weekday: number;
  readonly tick: number;
  /** Minutes into the day. */
  readonly minute: number;
}

export const todayOf = (reader: { fact(id: string): unknown }): Today => ({
  day: reader.fact('time.day') as number,
  weekday: WEEKDAYS.indexOf(reader.fact('time.weekday') as Weekday),
  tick: reader.fact('time.tick') as number,
  minute: reader.fact('time.of-day') as number,
});

const modulo = (n: number, m: number): number => ((n % m) + m) % m;

/** a ÷ b to the nearest whole number, half up, for b > 0 and a ≥ 0. */
export const nearest = (a: number, b: number): number => Math.floor((2 * a + b) / (2 * b));

export const weekdayOn = (today: Today, day: number): number => modulo(today.weekday + day - today.day, 7);

/** The Monday-to-Sunday week a day falls in, counted from this one (0). */
export const weekOf = (today: Today, day: number): number => Math.floor((day - today.day + today.weekday) / 7);

/** The tick a minute of a day comes at. */
export const tickAt = (today: Today, day: number, minute: number): number =>
  today.tick - today.minute + (day - today.day) * MINUTES_PER_DAY + minute;

export const startOf = (shift: ShiftKind): number => shift.hour * 60 + shift.minute;

export const shiftKind = (career: CareerRecord, id: string): ShiftKind =>
  career.shifts.find((s) => s.id === id) as ShiftKind;

export interface Posting {
  readonly day: number;
  readonly shift: string;
}

/** How many shifts a week the employer offers at a standing: from its fewest at 0 to its most at 100. */
export const weeklyCount = (career: CareerRecord, standing: number): number =>
  career.posting.fewest + nearest((career.posting.most - career.posting.fewest) * standing, 100);

/**
 * The shifts posted for some days: of the days the place is open, a share of the week's count
 * as large as their share of its open days, each day a shift drawn from its kinds.
 */
export function post(career: CareerRecord, rng: Rng, today: Today, days: readonly number[], standing: number) {
  const open = days.filter((day) => career.open.includes(WEEKDAYS[weekdayOn(today, day)] as Weekday));
  const count = Math.min(open.length, nearest(weeklyCount(career, standing) * open.length, career.open.length));
  const chosen = rng
    .shuffle(open)
    .slice(0, count)
    .sort((a, b) => a - b);
  return chosen.map((day): Posting => ({ day, shift: (rng.pick(career.shifts) as ShiftKind).id }));
}

/** The days from `from` to `to`, both counted. */
export const daysFrom = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/** Next week's days, Monday to Sunday: what goes up on the posting day. */
export const nextWeek = (today: Today): number[] =>
  daysFrom(today.day + 7 - today.weekday, today.day + 13 - today.weekday);

/**
 * What is posted when someone is hired: the rest of this week from tomorrow, and next week too
 * if its shifts have already gone up.
 */
export function daysAtHire(career: CareerRecord, today: Today): number[] {
  const rest = daysFrom(today.day + 1, today.day + 6 - today.weekday);
  const posted = today.weekday >= WEEKDAYS.indexOf(career.posting.weekday);
  return posted ? [...rest, ...nextWeek(today)] : rest;
}
