/**
 * The game's calendar (docs/DESIGN.md, Time): one tick is one game minute, read through the
 * engine's calendars (engine/docs/specs/time.md).
 *
 * The engine's calendars have no leap years, on purpose: whole-number arithmetic, the same on
 * every device. So every in-game year has 365 days. Weekdays match the real ones from 2025
 * until the first 29 February the game skips (2028), then run a day early for each one skipped.
 * Nothing in the game needs 29 February (decisions.md, D26).
 */
import type { CalendarDef } from '@eb/core';

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export const MONTHS = [
  { id: 'january', days: 31 },
  { id: 'february', days: 28 },
  { id: 'march', days: 31 },
  { id: 'april', days: 30 },
  { id: 'may', days: 31 },
  { id: 'june', days: 30 },
  { id: 'july', days: 31 },
  { id: 'august', days: 31 },
  { id: 'september', days: 30 },
  { id: 'october', days: 31 },
  { id: 'november', days: 30 },
  { id: 'december', days: 31 },
] as const;

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** Parts of the day by the minute they start. The last runs past midnight: night is 22:00 to 06:00. */
export const PHASES = [
  { id: 'morning', from: 6 * MINUTES_PER_HOUR },
  { id: 'afternoon', from: 12 * MINUTES_PER_HOUR },
  { id: 'evening', from: 18 * MINUTES_PER_HOUR },
  { id: 'night', from: 22 * MINUTES_PER_HOUR },
] as const;

/**
 * Meteorological seasons, the ones weather follows: winter is December to February. The
 * body model reads the cold from these, not from the solstices.
 */
export const SEASONS = [
  { id: 'spring', from: { month: 'march' } },
  { id: 'summer', from: { month: 'june' } },
  { id: 'fall', from: { month: 'september' } },
  { id: 'winter', from: { month: 'december' } },
] as const;

/** The year the game's money is counted in (docs/CALIBRATION.md). Its 1 January was a Wednesday. */
export const BASE_YEAR = 2025;
const BASE_YEAR_WEEKDAY = 2;

/** When a life starts, in the game's own calendar. */
export interface LifeStart {
  /** From 1. */
  readonly year: number;
  /** 1 to 12. */
  readonly month: number;
  /** From 1. */
  readonly day: number;
  /** 0 to 23. */
  readonly hour: number;
  /** 0 to 59. */
  readonly minute: number;
}

/** Monday 2 June 2025 at 07:00: the first weekday after a school year ends (tune). */
export const DEFAULT_START: LifeStart = { year: 2025, month: 6, day: 2, hour: 7, minute: 0 };

/** The game's calendar for a life that starts at `start`. Throws on a time the calendar doesn't have. */
export function lifeCalendar(start: LifeStart = DEFAULT_START): CalendarDef {
  const day = dayOfYear(start);
  return {
    ticksPerDay: MINUTES_PER_DAY,
    units: { minutes: 1, hours: MINUTES_PER_HOUR, weeks: 7 * MINUTES_PER_DAY },
    phases: PHASES,
    // The engine starts a game on its first weekday, so the list begins on the start's.
    weekdays: rotate(WEEKDAYS, weekdayIndex(start.year, day)),
    months: MONTHS,
    seasons: SEASONS,
    start: { year: start.year, day, tick: minuteOfDay(start) },
  };
}

/** The weekday a start falls on, from Monday (0). */
export const weekdayOf = (start: LifeStart): number => weekdayIndex(start.year, dayOfYear(start));

/** Minutes from a start to the next midnight. */
export const minutesToMidnight = (start: LifeStart): number => MINUTES_PER_DAY - minuteOfDay(start);

/** Days from a day of a month to the 1st of the next: 29 from 2 June. */
export function daysToNextMonth(month: string, dayOfMonth: number): number {
  const found = MONTHS.find((m) => m.id === month);
  if (found === undefined) throw new Error(`No month "${month}"`);
  return found.days - dayOfMonth + 1;
}

/** Minutes from a start to midnight on the 1st of the next month. The month a life starts in is paid for. */
export function minutesToNextMonth(start: LifeStart): number {
  dayOfYear(start);
  const month = MONTHS[start.month - 1] as (typeof MONTHS)[number];
  return daysToNextMonth(month.id, start.day) * MINUTES_PER_DAY - minuteOfDay(start);
}

/** The day of the year a start falls on, from 0. */
function dayOfYear(start: LifeStart): number {
  whole(start.year, 1, Number.MAX_SAFE_INTEGER, 'year');
  whole(start.month, 1, MONTHS.length, 'month');
  const month = MONTHS[start.month - 1] as (typeof MONTHS)[number];
  whole(start.day, 1, month.days, `day of ${month.id}`);
  let before = 0;
  for (const earlier of MONTHS.slice(0, start.month - 1)) before += earlier.days;
  return before + start.day - 1;
}

function minuteOfDay(start: LifeStart): number {
  whole(start.hour, 0, 23, 'hour');
  whole(start.minute, 0, MINUTES_PER_HOUR - 1, 'minute');
  return start.hour * MINUTES_PER_HOUR + start.minute;
}

/** The weekday of a day of a year, counted in 365-day years from 1 January 2025. */
function weekdayIndex(year: number, day: number): number {
  const days = (year - BASE_YEAR) * 365 + day;
  return modulo(BASE_YEAR_WEEKDAY + days, WEEKDAYS.length);
}

const modulo = (n: number, m: number): number => ((n % m) + m) % m;

const rotate = <T>(list: readonly T[], first: number): T[] => [...list.slice(first), ...list.slice(0, first)];

function whole(n: number, min: number, max: number, what: string): void {
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new Error(`LifeStart: the ${what} must be a whole number from ${min} to ${max}, not ${n}`);
  }
}
