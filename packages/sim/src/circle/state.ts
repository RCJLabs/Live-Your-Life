/**
 * The circle's slice (M2.6, D89): the tier-1 people you know, by their number in the roster, and
 * what you have been to each other so far. Who they are is worked out from the seed (people/who.ts);
 * only what changes is kept.
 */
import type { DrawnTo } from '../people/who.ts';

export interface Tie {
  /** Their number in the roster. */
  readonly person: number;
  /** Minutes together, counted as Hall's hours are: time at work for less (CALIBRATION.md). */
  together: number;
  /** 0 to 100, from 50, as the coworker's (D43). */
  regard: number;
  /** The day you met. */
  readonly met: number;
}

export interface CircleSlice {
  ties: Tie[];
  /** The third place you are going out to, or -1. */
  out: number;
  /** Whom you are drawn to (D91), or null until you say: then it is drawn from the seed. */
  drawnTo: DrawnTo | null;
}

export const noOne = (): CircleSlice => ({ ties: [], out: -1, drawnTo: null });

/** Minutes together at or under which a full list lets a stranger take someone's place: met once. */
export const MET_ONCE = 60;
