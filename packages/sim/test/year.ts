/**
 * The year in lives (M2.7 step 5): a life at a given age kept fed, washed and rested by a fixed
 * day, for a year, with the deaths and illnesses it met counted. The day is sent as actions straight
 * to the sim, not chosen from the options, so 1,000 lives take minutes, not the steady bot's
 * three-quarters of an hour; the steady bot's own year is a reading of its own (ROADMAP Readings).
 * Cash is set high, so hunger never stands in for a death: the tables are the measure here. No
 * test runner in here, as in slice.ts.
 */
import type { Action, Beat, GameState, SimContext } from '@eb/core';
import { mortalityOf, yearChance } from '../src/lives/records.ts';
import { sliceGame, sliceSim } from './slice.ts';

export const game = sliceGame();
const plain = sliceSim();

const doing = (activity: string, minutes: number): Action => ({ type: 'life/do', activity, minutes });
/** A day from 07:00, 24 hours of it. */
const DAY: readonly Action[] = [
  doing('eat', 30),
  doing('wash', 30),
  doing('relax', 240),
  doing('eat', 30),
  doing('socialize', 240),
  doing('relax', 180),
  doing('eat', 30),
  doing('relax', 150),
  doing('sleep', 480),
];

export interface Year {
  readonly age: number;
  readonly carries: boolean;
  /** Per 100,000: the table's chance of dying within the year at the starting age. */
  readonly expected: number;
  readonly died: boolean;
  /** Illnesses and injuries begun, by kind. */
  readonly ill: Readonly<Record<string, number>>;
  readonly hospital: number;
}

/** A life aged `age` on the first morning, kept for 365 days. */
export function lifeYear(seed: string, age: number, sim: SimContext = plain): Year {
  let s = game.init(seed, sim);
  // The age as an heir's would be (lives.born), and the cash for a year of meals and rent.
  s = {
    ...s,
    lives: { ...(s.lives as object), born: -age * 365 },
    economy: { ...(s.economy as object), amounts: { cash: 10_000_000 } },
  } as GameState;
  s = step(sim, s, { type: 'clock/wait-until', hour: 7, minute: 0 }).state;
  const carries = game.fact(s, 'circle.carries', {}, sim) as boolean;
  const ill: Record<string, number> = {};
  let hospital = 0;
  const hear = (beats: readonly Beat[]) => {
    for (const b of beats) {
      if (b.type === 'health/fell-ill') ill[String(b.kind)] = (ill[String(b.kind)] ?? 0) + 1;
      if (b.type === 'health/admitted') hospital++;
    }
  };
  const end = (game.fact(s, 'time.day', {}, sim) as number) + 365;
  while ((game.fact(s, 'time.day', {}, sim) as number) < end && s.lives && (s.lives as { died: number }).died < 0) {
    for (const a of DAY) {
      const mode = s.kernel.modes[s.kernel.modes.length - 1]?.id;
      if (mode === 'dead') break;
      // In hospital, the days are rested; the routine waits until you're out.
      const r = step(sim, s, mode === 'hospital' ? { type: 'health/rest' } : a);
      hear(r.beats);
      s = r.state;
    }
  }
  const expected = yearChance(mortalityOf(sim.content), age, carries);
  return { age, carries, expected, died: (s.lives as { died: number }).died >= 0, ill, hospital };
}

/** One action, refused or not: a refusal (a meal with the shop shut, say) passes no time, so a minute does. */
function step(sim: SimContext, s: GameState, a: Action): { state: GameState; beats: readonly Beat[] } {
  const r = game.reduce(s, a, sim);
  if (r.accepted) return { state: r.state, beats: r.beats };
  const w = game.reduce(s, { type: 'time/advance', minutes: a.minutes ?? 1 }, sim);
  return { state: w.state, beats: w.beats };
}
