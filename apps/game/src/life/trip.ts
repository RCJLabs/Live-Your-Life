/**
 * Going to work off screen (M2.3, D73): a job away from your block is reached from the panel. The
 * walk there takes the real walk along the streets (city/workplace.ts); if you're early you wait
 * for the shift; the shift is worked as at the griddle, its events stopping it for a choice; then
 * the way home, and you are at your door. Each step is an action the sim takes as any other: the
 * page only says how long the walk is, as it says how long the walk to the diner is (D61). Since
 * M2.9 the way there is yours to choose, on foot, by bus or by a ride (ways.ts); home goes the same
 * way if it still can, or on foot once the last bus has gone or the ride is more than you have.
 * Since M4.4 a shift's breaks are taken in their place (D164): a meal halfway, and on a 24-hour
 * shift the crew's sleep at the station for the last of its hours.
 */
import type { Action } from '@eb/core';
import type { Life } from './session.ts';
import { back, type Leg, type Way, wayOrWalk } from './ways.ts';

/** What the panel's "Go to work" sends: the page's, never the sim's. */
export const GO_TO_WORK = 'trip/work';

export interface Trip {
  step: 'there' | 'wait' | 'work' | 'back' | 'done';
  /** From your door to work's, and the walk's minutes. */
  readonly leg: Leg;
  readonly way: Way;
  /** The shift's meal break taken. Its sleep needs no mark: it runs to the shift's end. */
  ate?: boolean;
}

/** Breaks this long or longer hold a night's sleep at the station besides the meal (tune). */
export const SLEEP_BREAK = 4 * 60;
/** A meal break's minutes, taken halfway through the shift (tune). */
export const MEAL = 30;

/** Work until the shift has `at` minutes left, or the break itself once it has. */
const until = (life: Life, at: number): Action | null => {
  const endsIn = life.fact('job.shift-ends-in') as number;
  if (endsIn <= at) return null;
  const left = life.fact('job.shift-left') as number;
  return { type: 'life/do', activity: 'work', minutes: Math.min(left, endsIn - at) };
};

/** The shift's breaks, each in its place: a meal halfway if one can be paid for, else a rest; then sleep at the end. */
function takeBreak(life: Life, trip: Trip): Action | null {
  const breaks = life.fact('job.shift-breaks') as number;
  const sleep = breaks >= SLEEP_BREAK ? breaks - MEAL : 0;
  const meal = Math.min(MEAL, breaks - sleep);
  if (!trip.ate && meal > 0) {
    const work = until(life, Math.floor((life.fact('job.shift-minutes') as number) / 2));
    if (work) return work;
    trip.ate = true;
    const eat = life.options().some((a) => a.type === 'life/do' && a.activity === 'eat');
    return { type: 'life/do', activity: eat ? 'eat' : 'relax', minutes: meal };
  }
  if (sleep > 0) {
    const work = until(life, sleep);
    if (work) return work;
    return { type: 'life/do', activity: 'sleep', minutes: Math.max(1, life.fact('job.shift-ends-in') as number) };
  }
  return null;
}

export const startTrip = (leg: Leg, way: Way): Trip => ({ step: 'there', leg, way });

/** Minutes before a shift that going to work is offered, beyond the walk (tune). */
export const EARLY = 60;

/** Whether "Go to work" is offered now: a job away from your block, its shift under way or soon. */
export function canGo(life: Life, walk: number | null): boolean {
  if (walk === null || life.fact('market.at-diner') !== false || life.fact('job.employed') !== true) return false;
  if (life.fact('job.on-shift') === true) return true;
  const next = life.fact('job.next-shift-in') as number | undefined;
  return next !== undefined && next <= walk + EARLY;
}

/** The trip's next action, or null once you're home; moves `trip.step` on. */
export function tripAction(life: Life, trip: Trip): Action | null {
  switch (trip.step) {
    case 'there':
      trip.step = 'wait';
      return wayOrWalk(life, trip.way, trip.leg);
    case 'wait': {
      trip.step = 'work';
      const next = life.fact('job.next-shift-in') as number | undefined;
      if (life.fact('job.on-shift') !== true && next !== undefined) return { type: 'time/advance', minutes: next };
      return tripAction(life, trip);
    }
    case 'work': {
      // Worked to the end, its break in its place and a shift event's choice in between; then home.
      const left = life.fact('job.shift-left') as number;
      if (life.fact('job.on-shift') === true && left > 0)
        return takeBreak(life, trip) ?? { type: 'life/do', activity: 'work', minutes: left };
      trip.step = 'back';
      return tripAction(life, trip);
    }
    case 'back':
      trip.step = 'done';
      return wayOrWalk(life, trip.way, back(trip.leg));
    default:
      return null;
  }
}
