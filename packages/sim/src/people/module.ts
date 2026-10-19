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
import { defineModule, type Module, type ModuleContext } from '@eb/core';
import { WEEKDAYS } from '../calendar.ts';
import { START_LEVELS } from '../dials.ts';
import { type Activity, type Levels, NEEDS, PERCENT, settle } from '../needs.ts';
import { type HourPlan, planAt } from './gather.ts';
import { rosterOf } from './roster.ts';
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

/** Person i through some hours: needs settled once for each run of one activity, and their meetings. */
function live(slice: PeopleSlice, plans: readonly HourPlan[], i: number): void {
  const row = i - slice.first;
  let levels = {} as Levels;
  NEEDS.forEach((need, k) => {
    levels[need] = slice.levels[row * SIX + k] as number;
  });
  let doing: Activity | null = null;
  let minutes = 0;
  for (const plan of plans) {
    for (const [activity, length] of (plan.kinds[i] as HourPlan['kinds'][number]).segments) {
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
  }
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
export function progress(city: City, slice: PeopleSlice, from: number, to: number, weekday0: number): void {
  const roster = rosterOf(city.seed, city.n);
  for (let start = from; start < to; ) {
    const day = Math.floor(start / 24);
    const end = Math.min(to, (day + 1) * 24);
    const weekday = (weekday0 + day) % 7;
    const plans = Array.from({ length: end - start }, (_, k) => planAt(roster, city.seed, start + k, weekday));
    for (let i = slice.first; i < slice.first + slice.count; i++) live(slice, plans, i);
    start = end;
  }
  slice.hour = Math.max(slice.hour, to);
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

export const peopleModule = (n: number): Module =>
  defineModule<City>({
    id: 'people',
    init: (ctx) => ({ seed: ctx.rng('people').int(0, 0x7fffffff), n }),
    facts: {
      seed: { read: ({ state }) => state.seed, domain: { type: 'int', min: 0 }, label: "the people's seed" },
      count: { read: ({ state }) => state.n, domain: { type: 'int', min: 0 }, label: 'people' },
    },
  });

/** The id of share k of `of`: `people-all` for the whole roster. */
export const shareId = (k: number, of: number): string => (of === 1 ? 'people-all' : `people-${k}`);

// Settles every whole hour from the share's first unsettled one to now. It writes only when there
// is an hour to settle, so the kernel copies the slice only then.
function moveOn(ctx: ModuleContext<PeopleSlice>): void {
  const day = ctx.fact('time.day') as number;
  const minute = day * 24 * 60 + (ctx.fact('time.of-day') as number);
  const weekday = WEEKDAYS.indexOf(ctx.fact('time.weekday') as (typeof WEEKDAYS)[number]);
  const to = Math.floor(minute / 60);
  const settled = ctx.read().hour;
  const from = settled < 0 ? Math.floor((minute - (ctx.fact('time.tick') as number)) / 60) : settled;
  if (to <= from) return;
  const city = { seed: ctx.fact('people.seed') as number, n: ctx.fact('people.count') as number };
  progress(city, ctx.write(), from, to, (((weekday - day) % 7) + 7) % 7);
}

/** Share k of `of`, moved on by its effect, `<id>-progress`. */
export function shareModule(n: number, k = 0, of = 1): Module {
  const id = shareId(k, of);
  return defineModule<PeopleSlice>({
    id,
    init: () => newShare(n, k, of),
    effects: { [`${id}-progress`]: moveOn },
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
