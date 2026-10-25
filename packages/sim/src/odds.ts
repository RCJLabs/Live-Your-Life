/**
 * Chances under one in a hundred, rolled exactly as shown (CLAUDE.md: odds on screen are the odds
 * rolled). The engine's roll takes whole percents, so a chance per 100,000 is rolled as nested
 * percent rolls: 10%, then 1%, then the rest; a large one is rounded to what the rolls can hold,
 * and the rounded chance is the one shown.
 */
import type { Effect } from '@eb/core';

/** A chance per 100,000, rounded to what nested whole-percent rolls can hold exactly. */
export function rollable(per100k: number): number {
  const c = Math.max(0, Math.min(100_000, Math.round(per100k)));
  if (c <= 100) return c;
  if (c <= 1000) return Math.round(c / 10) * 10;
  if (c <= 10_000) return Math.round(c / 100) * 100;
  return Math.round(c / 1000) * 1000;
}

const outcomes = (chance: number, yes: readonly Effect[]): Effect[] =>
  [
    ...(chance > 0 ? [{ chance, effects: yes }] : []),
    ...(chance < 100 ? [{ chance: 100 - chance, effects: [] }] : []),
  ] as unknown as Effect[];

/** The roll effect for a chance per 100,000 (rounded by `rollable`), with `yes` on a hit. */
export function smallRoll(per100k: number, yes: readonly Effect[]): Effect {
  const c = rollable(per100k);
  const roll = (chance: number, then: readonly Effect[]): Effect => ({
    effect: 'roll',
    outcomes: outcomes(chance, then),
  });
  if (c > 10_000) return roll(c / 1000, yes);
  if (c > 1000) return roll(10, [roll(c / 100, yes)]);
  if (c > 100) return roll(10, [roll(10, [roll(c / 10, yes)])]);
  return roll(10, [roll(10, [roll(10, [roll(c, yes)])])]);
}
