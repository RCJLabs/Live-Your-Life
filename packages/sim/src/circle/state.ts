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
  /** What you are to each other (D93): people you know, dating, or over. */
  status: Status;
  /** The day you last asked them out, or -1. */
  asked: number;
  /** A date planned, by its day and minute of the day and the third place it's at. */
  date: { day: number; minute: number; place: number } | null;
  /** The day you were last together. */
  seen: number;
  /** The hour you last talked, counted from the life's first midnight, or -1: once an hour. */
  talked: number;
}

export type Status = 'known' | 'dating' | 'ex';

/** A tie as one is first made. */
export const newTie = (person: number, together: number, day: number): Tie => ({
  person,
  together,
  regard: 50,
  met: day,
  status: 'known',
  asked: -1,
  date: null,
  seen: day,
  talked: -1,
});

export interface CircleSlice {
  ties: Tie[];
  /** The third place you are going out to, or -1. */
  out: number;
  /** Whom you are drawn to (D91), or null until you say: then it is drawn from the seed. */
  drawnTo: DrawnTo | null;
  /** The last day whose drift, missed dates and endings are settled. */
  settled: number;
}

export const noOne = (): CircleSlice => ({ ties: [], out: -1, drawnTo: null, settled: 0 });

/** Version 2 (M2.6 step 2): courting. Ties from before are people you know, never asked out. */
export function migrateCircle2(slice: unknown): CircleSlice {
  const old = slice as { ties: { person: number; together: number; regard: number; met: number }[] };
  return {
    ...(slice as CircleSlice),
    ties: old.ties.map((t) => ({ ...newTie(t.person, t.together, t.met), regard: t.regard })),
    settled: 0,
  };
}

/** Minutes together at or under which a full list lets a stranger take someone's place: met once. */
export const MET_ONCE = 60;
