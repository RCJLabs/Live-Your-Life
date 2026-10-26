/**
 * The season (M2.10 step 3): what the day's weather and the calendar ask of you. Snow slows a
 * walk and a bus that day and the morning after (D131); a holiday closes the court and the college
 * and puts the buses on Sunday's timetable (D132); the clocks changing costs or gives an hour's
 * sleep to whoever is asleep when they do (D133). The gas bill comes with the rent (home.ts, D130).
 * The days are worked out from the seed and the date (climate.ts); the slice holds only the last
 * day the journal was told about.
 */
import { type Beat, defineModule, type ModuleContext } from '@eb/core';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR, MONTHS, WEEKDAYS } from '../calendar.ts';
import { type ClimateRecord, climateIn, climateOf, clocksOn, holidayOn, snowOn } from './climate.ts';

export interface SeasonSlice {
  /** The last day told in the journal; -1 until the first day is heard. */
  told: number;
}

type Ctx = ModuleContext<SeasonSlice>;
type View = { readonly content: Ctx['content']; fact(id: string, args?: Readonly<Record<string, unknown>>): unknown };

/** The named timer for the next night the clocks change. */
export const CLOCKS_TIMER = 'clocks';

/** A day, `ago` days before today (after it, below zero), as the climate reads it. */
function dateAgo(v: View, ago: number): { year: number; month: number; day: number } {
  let year = v.fact('time.year') as number;
  let month = MONTHS.findIndex((m) => m.id === v.fact('time.month')) + 1;
  let day = (v.fact('time.day-of-month') as number) - ago;
  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += (MONTHS[month - 1] as (typeof MONTHS)[number]).days;
  }
  // Days ahead are days ago below zero.
  while (day > (MONTHS[month - 1] as (typeof MONTHS)[number]).days) {
    day -= (MONTHS[month - 1] as (typeof MONTHS)[number]).days;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { year, month, day };
}

const seedOf = (v: View): number => (v.fact('people.seed') as number | undefined) ?? 0;

function snowed(v: View, c: ClimateRecord, ago: number): boolean {
  const d = dateAgo(v, ago);
  return snowOn(c, seedOf(v), d.year, d.month, d.day);
}

/** Whether snow slows you now: on a snow day, and the morning after one until noon (D131). */
export function snowy(v: View): boolean {
  const c = climateIn(v.content);
  if (!c) return false;
  return snowed(v, c, 0) || (snowed(v, c, 1) && (v.fact('time.of-day') as number) < 12 * MINUTES_PER_HOUR);
}

/** The holiday kept today, or null. */
export function holidayToday(v: View): string | null {
  const c = climateIn(v.content);
  const d = dateAgo(v, 0);
  return c ? holidayOn(c, d.year, d.month, d.day) : null;
}

/** The first day from `day` (a game day, today or later) that isn't a holiday: when the court sits (D132). */
export function courtDay(v: View, day: number): number {
  const c = climateIn(v.content);
  const today = v.fact('time.day') as number;
  let at = Math.max(day, today);
  if (!c) return at;
  for (;;) {
    const d = dateAgo(v, today - at);
    if (!holidayOn(c, d.year, d.month, d.day)) return at;
    at += 1;
  }
}

/** Minutes to the next night the clocks change, from now, looking up to a year and a day ahead. */
function nextClocks(v: View, c: ClimateRecord): number | null {
  const now = v.fact('time.of-day') as number;
  const at = c.clocks.hour * MINUTES_PER_HOUR;
  for (let ahead = 0; ahead <= 366; ahead++) {
    const d = dateAgo(v, -ahead);
    if (ahead === 0 && now >= at) continue;
    if (clocksOn(c, d.year, d.month, d.day)) return ahead * MINUTES_PER_DAY + at - now;
  }
  return null;
}

function scheduleClocks(ctx: Ctx): void {
  const c = climateIn(ctx.content);
  const minutes = c ? nextClocks(ctx, c) : null;
  if (minutes === null) return;
  ctx.apply({ effect: 'schedule', timer: CLOCKS_TIMER, after: { minutes }, effects: [{ effect: 'clocks-change' }] });
}

/** The day time started passing from: today, or as many midnights back as it crossed. */
function dayFrom(ctx: Ctx, passed: Beat): number {
  const today = ctx.fact('time.day') as number;
  const before = (passed.to as number) - (passed.from as number) - (ctx.fact('time.of-day') as number);
  return before <= 0 ? today : today - Math.ceil(before / MINUTES_PER_DAY);
}

/** The days since the journal was last told: each holiday and each snow day gets its line. */
function tell(ctx: Ctx, passed: Beat): void {
  // A save from before the season has no clocks timer: it is set the first time time passes.
  if (ctx.fact('time.pending', { timer: CLOCKS_TIMER }) !== true) scheduleClocks(ctx);
  const today = ctx.fact('time.day') as number;
  let told = ctx.read().told;
  // The first time passes, the day it passed from is the one before the first told.
  if (told < 0) told = dayFrom(ctx, passed) - 1;
  // After a ward's years, nothing back-told.
  if (today - told > 31) told = today;
  if (told >= today) {
    if (ctx.read().told !== told) ctx.write().told = told;
    return;
  }
  const c = climateIn(ctx.content);
  if (!c) return;
  for (let day = told + 1; day <= today; day++) {
    const ago = today - day;
    const d = dateAgo(ctx, ago);
    const holiday = holidayOn(c, d.year, d.month, d.day);
    if (holiday) ctx.emit('holiday', { holiday, day });
    if (snowOn(c, seedOf(ctx), d.year, d.month, d.day)) ctx.emit('snow', { day });
  }
  ctx.write().told = today;
}

export const seasonModule = defineModule<SeasonSlice>({
  id: 'season',
  init: () => ({ told: -1 }),
  events: {
    holiday: { args: { holiday: { type: 'text' }, day: { type: 'int', min: 0 } }, label: 'A holiday' },
    snow: { args: { day: { type: 'int', min: 0 } }, label: 'It snowed' },
    clocks: {
      args: { way: { type: 'enum', values: ['forward', 'back'] }, slept: { type: 'bool' } },
      label: 'The clocks changed',
    },
  },
  effects: {
    // Due at the change's hour on its night; and a minute into a life (game.ts), to set the first.
    'clocks-change': (ctx) => {
      const c = climateIn(ctx.content);
      if (!c) return;
      const d = dateAgo(ctx, 0);
      const now = (ctx.fact('time.of-day') as number) === c.clocks.hour * MINUTES_PER_HOUR;
      const way = now ? clocksOn(c, d.year, d.month, d.day) : null;
      if (way) {
        const slept = ctx.fact('life.activity') === 'sleep' && ctx.modes.current.id === 'world';
        if (slept)
          ctx.apply({ effect: 'adjust-needs', needs: { rest: way === 'forward' ? -c.clocks.rest : c.clocks.rest } });
        ctx.emit('clocks', { way, slept });
      }
      scheduleClocks(ctx);
    },
  },
  on: { 'time/passed': (ctx, passed) => tell(ctx, passed) },
  facts: {
    snow: { read: (v) => snowy(v), domain: { type: 'bool' }, label: 'snow on the ground' },
    // A walk's minutes in hundredths of a clear day's, and a bus's minutes late: the page's walk and the bus read them.
    pace: {
      read: (v) => (snowy(v) ? climateOf(v.content).snow.pace : 100),
      domain: { type: 'int', min: 100, max: 300 },
      label: 'how slow a walk is',
    },
    late: {
      read: (v) => (snowy(v) ? climateOf(v.content).snow.late : 0),
      domain: { type: 'int', min: 0, max: 60 },
      label: 'minutes a bus is late',
    },
    holiday: { read: (v) => holidayToday(v) !== null, domain: { type: 'bool' }, label: 'a holiday' },
    // The buses keep Sunday's timetable on a holiday (D132).
    timetable: {
      read: (v) => (holidayToday(v) !== null ? 'sunday' : v.fact('time.weekday')),
      domain: { type: 'enum', values: WEEKDAYS },
      label: 'the day the buses run to',
    },
  },
});
