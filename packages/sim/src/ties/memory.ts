/**
 * What they make of you (D44, from Ludus's `remember()`): each act moves regard by its weight,
 * every time, and is remembered by its kind: the day it last happened and how many times. A
 * repeat moves to the end rather than piling up, and the last 8 kinds are kept.
 */

export interface Memory {
  readonly act: string;
  /** The day it last happened. */
  readonly day: number;
  readonly times: number;
}

/** Kinds of act kept. */
export const KEPT = 8;
/** Where regard starts: they take you as they find you. */
export const NEUTRAL = 50;

export function remember(slice: { regard: number; memory: Memory[] }, act: string, weight: number, day: number): void {
  slice.regard = Math.min(100, Math.max(0, slice.regard + weight));
  const before = slice.memory.find((m) => m.act === act);
  const rest = slice.memory.filter((m) => m.act !== act);
  slice.memory = [...rest, { act, day, times: (before?.times ?? 0) + 1 }].slice(-KEPT);
}

/** Familiarity, 0 to 100, from minutes beside them: it comes more slowly the more there is. */
export const familiarityOf = (minutes: number, half: number): number => Math.floor((100 * minutes) / (minutes + half));
