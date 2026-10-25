/**
 * The tier-1 people (D10, M0.4's harness): N named people living their schedules off screen,
 * their needs settled by the player's own math (needs.ts) and their ties grown from the hours
 * they share a workplace or a third place. How often they are moved on is D30, from the
 * readings in docs/research/population.md.
 *
 * Two kinds of module. `people` holds who they are: the seed and the head count, from which
 * everything about them is derived (roster.ts). Shares hold what changes, each for a run of
 * people, as flat arrays of numbers: the kernel copies and freezes a module's whole slice in
 * every action that writes to it, so a share moved on alone costs only its own copy.
 */

import { type Beat, defineModule, type Module, type ModuleContext } from '@eb/core';
import { WEEKDAYS } from '../calendar.ts';
import { START_LEVELS } from '../dials.ts';
import { inWardYears } from '../lives/ward.ts';
import { type Activity, type Levels, NEEDS, PERCENT, settle } from '../needs.ts';
import { rosterWith } from './careers.ts';
import { HOURS, type HourKind } from './day.ts';
import { type HourPlan, planAt } from './gather.ts';
import { LINKED, type Roster, rosterOf } from './roster.ts';
import { meet, TIE_ROW } from './ties.ts';

/** Who the people are: everything else about them follows from these two. */
export interface City {
  readonly seed: number;
  readonly n: number;
}

/** A share of the people: persons `first` to `first + count - 1`. */
export interface PeopleSlice {
  readonly first: number;
  readonly count: number;
  /** The first hour not yet settled, counted from the start day's midnight: -1 before the first. */
  hour: number;
  /** Six levels a person, in NEEDS order. */
  levels: number[];
  /** `TIE_ROW` numbers a person: [other person, familiarity] pairs, other = -1 for none. */
  ties: number[];
}

const SIX = NEEDS.length;

/** An hour of one of the linked people (D70), from their own module; null for the roster's own. */
export type Linked = (i: number, hour: number) => HourKind | null;

/** Person i through some hours: needs settled once for each run of one activity, and their meetings. */
function live(slice: PeopleSlice, plans: readonly HourPlan[], i: number, first: number, linked?: Linked): void {
  const row = i - slice.first;
  let levels = {} as Levels;
  NEEDS.forEach((need, k) => {
    levels[need] = slice.levels[row * SIX + k] as number;
  });
  let doing: Activity | null = null;
  let minutes = 0;
  plans.forEach((plan, k) => {
    const kind = (linked && i < LINKED.count ? linked(i, first + k) : null) ?? (plan.kinds[i] as HourKind);
    for (const [activity, length] of kind.segments) {
      if (activity !== doing && doing !== null) {
        levels = settle(levels, doing, minutes);
        minutes = 0;
      }
      doing = activity;
      minutes += length;
    }
    for (let e = plan.start[i] as number; e < (plan.start[i + 1] as number); e++) {
      meet(slice.ties, row, plan.others[e] as number, 1);
    }
  });
  if (doing !== null) levels = settle(levels, doing, minutes);
  NEEDS.forEach((need, k) => {
    slice.levels[row * SIX + k] = levels[need];
  });
}

/**
 * Settles a share's hours from `from` to `to`, at most a day at a time, so a long span never
 * holds more than a day's plans. `weekday0` is the start day's weekday, 0 for Monday. Each person
 * comes out the same however the hours are split up and whichever share holds them; only the
 * cost differs.
 */
export function progress(
  city: City,
  slice: PeopleSlice,
  from: number,
  to: number,
  weekday0: number,
  linked?: Linked,
  roster: Roster = rosterOf(city.seed, city.n),
): void {
  for (let start = from; start < to; ) {
    const day = Math.floor(start / 24);
    const end = Math.min(to, (day + 1) * 24);
    const weekday = (weekday0 + day) % 7;
    const plans = Array.from({ length: end - start }, (_, k) => planAt(roster, city.seed, start + k, weekday));
    for (let i = slice.first; i < slice.first + slice.count; i++) live(slice, plans, i, start, linked);
    start = end;
  }
  slice.hour = Math.max(slice.hour, to);
}

/**
 * The coworker's, the fence's and the supplier's hours, as their modules give them (D70): at work
 * through their shift, or the fence's and the supplier's own hours; otherwise the roster's day. Only a life asks: the
 * harness has neither module.
 */
function linkedFrom(ctx: ModuleContext<PeopleSlice>): Linked {
  return (i, hour) => {
    const day = Math.floor(hour / 24);
    const minute = (hour % 24) * 60;
    if (i === LINKED.coworker) {
      const start = ctx.fact('ties.their-start', { day }) as number;
      const length = ctx.fact('ties.their-minutes', { day }) as number;
      return start >= 0 && minute >= start && minute < start + length ? HOURS.work : null;
    }
    const [from, to] =
      i === LINKED.supplier
        ? [ctx.fact('deal.supplier-from') as number, ctx.fact('deal.supplier-to') as number]
        : [ctx.fact('law.fence-from') as number, ctx.fact('law.fence-to') as number];
    return from >= 0 && hour % 24 >= from && hour % 24 < to ? HOURS.work : null;
  };
}

/** Share k of `of` (the whole roster when `of` is 1), as a new life starts it. */
export function newShare(n: number, k = 0, of = 1): PeopleSlice {
  const first = Math.floor((n * k) / of);
  const count = Math.floor((n * (k + 1)) / of) - first;
  const levels: number[] = [];
  for (let i = 0; i < count; i++) for (const need of NEEDS) levels.push(START_LEVELS[need]);
  const ties: number[] = [];
  for (let t = 0; t < (count * TIE_ROW) / 2; t++) ties.push(-1, 0);
  return { first, count, hour: -1, levels, ties };
}

/** Minutes since the start day's midnight. */
const minuteNow = (ctx: ModuleContext<unknown>): number =>
  (ctx.fact('time.day') as number) * 24 * 60 + (ctx.fact('time.of-day') as number);

/**
 * Time passing, cut at each midnight and passed on to the shares (M2.2). In one long passage, a
 * month asleep or a sentence, each share would settle the whole span alone, and the hours' plans,
 * kept only two days (gather.ts), would be built again for each of the 24: 17,280 plans for a
 * month's 720. A day at a time, every share settles a day while its plans are kept. Each event
 * raised here reaches every share before the next is raised (the kernel's order).
 */
const inDays = (ctx: ModuleContext<City>, event: Beat) => {
  const span = (event.to as number) - (event.from as number);
  if (span <= 0) return;
  const now = minuteNow(ctx);
  let from = now - span;
  // A ward's years (D108): passed on whole, once, for every share to step over.
  if (inWardYears(ctx)) {
    ctx.emit('passed', { from, to: now });
    return;
  }
  for (let midnight = (Math.floor(from / DAY) + 1) * DAY; midnight < now; midnight += DAY) {
    ctx.emit('passed', { from, to: midnight });
    from = midnight;
  }
  ctx.emit('passed', { from, to: now });
};
const DAY = 24 * 60;
const MINUTE = { type: 'int', min: 0 } as const;

/** Who the people are; in a life (`listen`), it also passes time on to the shares a day at a time. */
export const peopleModule = (n: number, listen = false): Module =>
  defineModule<City>({
    id: 'people',
    init: (ctx) => ({ seed: ctx.rng('people').int(0, 0x7fffffff), n }),
    events: {
      passed: { args: { from: MINUTE, to: MINUTE }, label: 'Time passes for the people, at most a day at a time' },
    },
    ...(listen ? { on: { 'time/passed': inDays } } : {}),
    facts: {
      seed: { read: ({ state }) => state.seed, domain: { type: 'int', min: 0 }, label: "the people's seed" },
      count: { read: ({ state }) => state.n, domain: { type: 'int', min: 0 }, label: 'people' },
    },
  });

/** The id of share k of `of`: `people-all` for the whole roster. */
export const shareId = (k: number, of: number): string => (of === 1 ? 'people-all' : `people-${k}`);

// Settles every whole hour from the share's first unsettled one to now. It writes only when there
// is an hour to settle, so the kernel copies the slice only then.
function moveOn(ctx: ModuleContext<PeopleSlice>, inLife = false, until?: number): void {
  const now = minuteNow(ctx);
  const day = Math.floor(now / DAY);
  const minute = until ?? now;
  const weekday = WEEKDAYS.indexOf(ctx.fact('time.weekday') as (typeof WEEKDAYS)[number]);
  const to = Math.floor(minute / 60);
  const settled = ctx.read().hour;
  const from = settled < 0 ? Math.floor((now - (ctx.fact('time.tick') as number)) / 60) : settled;
  if (to <= from) return;
  const city = { seed: ctx.fact('people.seed') as number, n: ctx.fact('people.count') as number };
  const holdsLinked = inLife && ctx.read().first < LINKED.count && ctx.read().count > 0;
  // In a life, people work their careers' shifts (M2.3); the harness's shares keep the templates.
  // With whoever has left or changed jobs since (people/work.ts).
  const roster = inLife
    ? rosterWith(
        ctx.content,
        city.seed,
        city.n,
        ctx.fact('people-work.moves') as number[],
        ctx.fact('people-work.version') as number,
      )
    : rosterOf(city.seed, city.n);
  progress(
    city,
    ctx.write(),
    from,
    to,
    (((weekday - day) % 7) + 7) % 7,
    holdsLinked ? linkedFrom(ctx) : undefined,
    roster,
  );
}

/**
 * Moves share k of `of` on when time passes its hour of the day (M2.2): each share settles a whole
 * day once a day, a twenty-fourth of the people each hour, as the harness's timers do (D30). A
 * life hears time pass, a day at a time from the people module, rather than keeping timers, so a
 * save from before the people starts them without a timer it never had.
 */
const onItsHour = (k: number, of: number) => (ctx: ModuleContext<PeopleSlice>, event: Beat) => {
  const from = event.from as number;
  const to = event.to as number;
  if (to <= from) return;
  // A ward's years (D108): the people aren't lived hour by hour for 18 years. They pick up where
  // they are, the hour settled moved to now; who holds each place is the seed's (lifespans.ts).
  if (inWardYears(ctx)) {
    ctx.write().hour = Math.floor(to / 60);
    return;
  }
  // The first hour after the passage began that is this share's, and whether it came.
  const startHour = Math.floor(from / 60) + 1;
  const due = startHour + ((((k - startHour) % of) + of) % of);
  if (due * 60 <= to) moveOn(ctx, true, to);
};

/** Share k of `of`, moved on by its effect, `<id>-progress`; in a life, by time passing its hour. */
export function shareModule(n: number, k = 0, of = 1, listen = false): Module {
  const id = shareId(k, of);
  return defineModule<PeopleSlice>({
    id,
    init: () => newShare(n, k, of),
    effects: { [`${id}-progress`]: (ctx) => moveOn(ctx) },
    ...(listen ? { on: { 'people/passed': onItsHour(k, of) } } : {}),
    facts: {
      mean: {
        args: { need: { type: 'enum', values: NEEDS } },
        domain: { type: 'int', min: 0, max: 100 },
        label: 'the mean of a need across the share',
        read: ({ state }, { need }) => {
          const k = NEEDS.indexOf(need as (typeof NEEDS)[number]);
          let sum = 0;
          for (let i = 0; i < state.count; i++) sum += state.levels[i * SIX + k] as number;
          return state.count === 0 ? 0 : Math.floor(sum / state.count / PERCENT);
        },
      },
      ties: {
        domain: { type: 'int', min: 0 },
        label: 'ties the share holds',
        read: ({ state }) => {
          let count = 0;
          for (let t = 0; t < state.ties.length; t += 2) if ((state.ties[t] as number) >= 0) count++;
          return count;
        },
      },
      settled: { read: ({ state }) => state.hour, domain: { type: 'int', min: -1 }, label: 'hours settled to' },
    },
  });
}
