/**
 * Needs (docs/DESIGN.md, Needs and mood): six levels that fall and recover with what a person is
 * doing. Whole numbers, so a save or a hash never carries a rounding error: a level runs from 0
 * to FULL, which is 100 percent of 60,000 units, so a rate of one percent an hour is exactly
 * 1,000 units a minute.
 *
 * Levels are settled, never ticked. Between two changes of activity every need moves at a fixed
 * rate, so its level at any minute is worked out from the last settled level and the minutes
 * since. Time passing costs nothing, which is what will let hundreds of people keep their needs
 * (M0.4). Landnam's needs.ts keeps four needs as 0 to 1 levels moved once a day; these are exact
 * to the minute.
 */

/** Every level is "how much of it you have": a full bar is a met need, and full calm is no stress. */
export const NEEDS = ['rest', 'food', 'hygiene', 'company', 'calm', 'health'] as const;
export type Need = (typeof NEEDS)[number];
export type Levels = Record<Need, number>;

export const PERCENT = 60_000;
export const FULL = 100 * PERCENT;

/** What a person can be doing. Between activities a person is awake, at awake's rates. */
export const ACTIVITIES = ['awake', 'sleep', 'eat', 'wash', 'relax', 'socialize', 'work'] as const;
export type Activity = (typeof ACTIVITIES)[number];

/** The needs that move by an activity's own rate. Health moves by the others' state instead. */
const MOVING = ['rest', 'food', 'hygiene', 'company', 'calm'] as const;
type Moving = (typeof MOVING)[number];

/**
 * How each need moves while doing each thing, in percent an hour (tune). Checked against a working
 * day: 8 hours awake, an 8-hour shift and 8 hours asleep leave rest at 8%, cost 130% of food
 * (three meals give 150%), 88% of hygiene (one wash gives 100%), and leave company and calm where
 * they were. The figures are proposals; docs/DESIGN.md keeps the table.
 */
export const RATES: Readonly<Record<Activity, Readonly<Record<Moving, number>>>> = {
  awake: { rest: -5, food: -6.25, hygiene: -4, company: -2, calm: 0 },
  sleep: { rest: 12.5, food: -2, hygiene: -1, company: 0, calm: 4 },
  eat: { rest: -5, food: 100, hygiene: -4, company: -2, calm: 2 },
  wash: { rest: -5, food: -6.25, hygiene: 400, company: -2, calm: 2 },
  relax: { rest: -4, food: -6.25, hygiene: -4, company: -2, calm: 10 },
  socialize: { rest: -5, food: -6.25, hygiene: -4, company: 40, calm: 4 },
  work: { rest: -6.5, food: -8, hygiene: -6, company: 2, calm: -4 },
};

/** Health recovers this much an hour while neither food nor rest is at zero (tune). */
export const HEALTH_RECOVERY = 0.5;
/** And falls this much an hour for each of food and rest that is at zero (tune). */
export const HEALTH_PENALTY = 4;
/** Running out of these hurts health; the others only hurt mood, which is later. */
export const VITAL = ['food', 'rest'] as const;

/** A rate in percent an hour, as whole units a minute. Throws on a rate finer than a unit. */
export function unitsPerMinute(percentPerHour: number): number {
  const units = Math.round(percentPerHour * 1000);
  if (Math.abs(units - percentPerHour * 1000) > 1e-6) {
    throw new Error(`needs: ${percentPerHour}% an hour is finer than the units can hold`);
  }
  return units;
}

const UNIT_RATES = Object.fromEntries(
  ACTIVITIES.map((activity) => [
    activity,
    Object.fromEntries(MOVING.map((need) => [need, unitsPerMinute(RATES[activity][need])])),
  ]),
) as Record<Activity, Record<Moving, number>>;
const RECOVERY = unitsPerMinute(HEALTH_RECOVERY);
const PENALTY = unitsPerMinute(HEALTH_PENALTY);

const clamp = (level: number): number => Math.min(FULL, Math.max(0, level));

/** The levels after `minutes` of `activity`. */
export function settle(levels: Readonly<Levels>, activity: Activity, minutes: number): Levels {
  if (!Number.isSafeInteger(minutes) || minutes < 0) throw new Error(`needs: can't settle ${minutes} minutes`);
  const rates = UNIT_RATES[activity];
  // Written out need by need rather than looped, so the engine builds one shape of object.
  return {
    rest: clamp(levels.rest + rates.rest * minutes),
    food: clamp(levels.food + rates.food * minutes),
    hygiene: clamp(levels.hygiene + rates.hygiene * minutes),
    company: clamp(levels.company + rates.company * minutes),
    calm: clamp(levels.calm + rates.calm * minutes),
    health: settleHealth(levels, rates, minutes),
  };
}

/** Minutes until a need at `level`, moving at `rate` a minute, is at zero: 0 if it already is, never if it isn't falling. */
function emptyAfter(level: number, rate: number): number {
  if (level <= 0 && rate <= 0) return 0;
  if (rate >= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil(level / -rate);
}

// Health is piecewise: it recovers while nothing vital is empty, then falls faster for each vital
// need that runs out. The minute each runs out is worked out from its rate, so the fall starts
// when it would have, not at the next settle. It walks from one such minute to the next without
// building a list, because tier-1 people settle thousands of times a game hour (M0.4). There are
// at most as many stretches as vital needs and one more, and the walk stops there: a slip in it
// gives wrong levels, which the tests see, rather than a loop that never ends.
function settleHealth(levels: Readonly<Levels>, rates: Readonly<Record<Moving, number>>, minutes: number): number {
  let health = levels.health;
  let from = 0;
  for (let stretch = 0; stretch <= VITAL.length; stretch++) {
    let out = 0;
    let to = minutes;
    for (const need of VITAL) {
      const empty = emptyAfter(levels[need], rates[need]);
      if (empty <= from) out++;
      else if (empty < to) to = empty;
    }
    health = clamp(health + (out === 0 ? RECOVERY : -PENALTY * out) * (to - from));
    if (to >= minutes) break;
    from = to;
  }
  return health;
}

/** A level as a whole percent, rounded down: what conditions and the HUD read. */
export const percentOf = (level: number): number => Math.floor(level / PERCENT);

/** The need with the lowest level; on a tie, the first in NEEDS. */
export function lowest(levels: Readonly<Levels>): Need {
  let found: Need = NEEDS[0];
  for (const need of NEEDS) if (levels[need] < levels[found]) found = need;
  return found;
}

export const isActivity = (value: unknown): value is Activity =>
  typeof value === 'string' && (ACTIVITIES as readonly string[]).includes(value);
