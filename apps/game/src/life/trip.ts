/**
 * Going to work off screen (M2.3, D73): a job away from your block is reached from the panel. The
 * walk there takes the real walk along the streets (city/workplace.ts); if you're early you wait
 * for the shift; the shift is worked as at the griddle, its events stopping it for a choice; then
 * the way home, and you are at your door. Each step is an action the sim takes as any other: the
 * page only says how long the walk is, as it says how long the walk to the diner is (D61). Since
 * M2.9 the way there is yours to choose, on foot, by bus or by a ride (ways.ts); home goes the same
 * way if it still can, or on foot once the last bus has gone or the ride is more than you have.
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
      // Worked to the end, a shift event's choice in between; then home.
      const left = life.fact('job.shift-left') as number;
      if (life.fact('job.on-shift') === true && left > 0) return { type: 'life/do', activity: 'work', minutes: left };
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
