/**
 * The year as the city lives it (M2.10 step 3, D130–D133): which days snow, which are holidays,
 * when the clocks change, and the month's gas bill. Worked out from the climate record, the seed
 * and the date, so nothing is saved and the page and the sim read the same answer.
 */
import type { RecordStore } from '@eb/core';
import { dayOfYearOf, MONTHS, WEEKDAYS, weekdayOfDate } from '../calendar.ts';
import { mix } from '../people/roster.ts';

export interface Holiday {
  readonly name: string;
  readonly month: number;
  readonly day?: number;
  readonly weekday?: (typeof WEEKDAYS)[number];
  readonly nth?: number;
}

export interface ClimateRecord {
  readonly name: string;
  readonly snowDays: readonly number[];
  readonly degreeDays: readonly number[];
  readonly gas: { readonly fixed: number; readonly perCcf: number; readonly heating: number; readonly base: number };
  readonly snow: { readonly pace: number; readonly late: number };
  readonly holidays: readonly Holiday[];
  readonly clocks: {
    readonly forward: { readonly month: number; readonly nth: number };
    readonly back: { readonly month: number; readonly nth: number };
    readonly hour: number;
    readonly rest: number;
  };
}

export const CLIMATE = 'michigan';

/** The climate record, or null in a pack from before it: a save replayed with its own content. */
export const climateIn = (content: RecordStore): ClimateRecord | null =>
  content.get<ClimateRecord>('climate', CLIMATE) ?? null;

export function climateOf(content: RecordStore): ClimateRecord {
  const c = climateIn(content);
  if (!c) throw new Error(`No climate record "${CLIMATE}"`);
  return c;
}

/** A date as days counted in 365-day years, so the day before 1 January is the last of December. */
const absolute = (year: number, month: number, day: number): number => year * 365 + dayOfYearOf(year, month, day);
const daysIn = (month: number): number => (MONTHS[month - 1] as (typeof MONTHS)[number]).days;

/** Whether `day` of `month` snows an inch or more: drawn from the seed at the month's normal (D131). */
export function snowOn(c: ClimateRecord, seed: number, year: number, month: number, day: number): boolean {
  const hundredths = c.snowDays[month - 1] ?? 0;
  return mix(seed, 83, year, month, day, 1) % (100 * daysIn(month)) < hundredths;
}

/** The day of `month` that is its `nth` `weekday` (from Monday, 0); a negative nth counts from the end. */
export function nthWeekday(year: number, month: number, weekday: number, nth: number): number {
  if (nth < 0) {
    const last = daysIn(month);
    return last - ((weekdayOfDate(year, month, last) - weekday + 7) % 7);
  }
  const first = 1 + ((weekday - weekdayOfDate(year, month, 1) + 7) % 7);
  return first + 7 * (nth - 1);
}

/** When a holiday is kept in `year`, as an absolute day: a fixed date on a weekend moves to the nearest weekday. */
function kept(h: Holiday, year: number): number {
  if (h.day === undefined) {
    const weekday = WEEKDAYS.indexOf(h.weekday ?? 'monday');
    return absolute(year, h.month, nthWeekday(year, h.month, weekday, h.nth ?? 1));
  }
  const at = absolute(year, h.month, h.day);
  const weekday = weekdayOfDate(year, h.month, h.day);
  return weekday === 5 ? at - 1 : weekday === 6 ? at + 1 : at;
}

/** The holiday kept on a date, or null (D132). New Year's Day on a Saturday is kept the year before. */
export function holidayOn(c: ClimateRecord, year: number, month: number, day: number): string | null {
  const at = absolute(year, month, day);
  for (const h of c.holidays) if (kept(h, year) === at || kept(h, year + 1) === at) return h.name;
  return null;
}

/** Whether the clocks go forward or back on the night of a date (D133), or neither. */
export function clocksOn(c: ClimateRecord, year: number, month: number, day: number): 'forward' | 'back' | null {
  const sunday = WEEKDAYS.indexOf('sunday');
  for (const way of ['forward', 'back'] as const) {
    const r = c.clocks[way];
    if (r.month === month && nthWeekday(year, month, sunday, r.nth) === day) return way;
  }
  return null;
}

/** The gas bill for a month (1 to 12), in cents (D130): the fixed charge and the gas its cold burns. */
export function gasBill(c: ClimateRecord, month: number): number {
  const total = c.degreeDays.reduce((a, b) => a + b, 0);
  const share = total > 0 ? Math.round((c.gas.heating * (c.degreeDays[month - 1] ?? 0)) / total) : 0;
  return c.gas.fixed + c.gas.perCcf * (c.gas.base + share);
}
