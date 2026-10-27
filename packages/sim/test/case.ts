/**
 * A drug case brought to a point, for tests (M2.4): a life a sighting short of a case, hours on the
 * corner until the police are coming, the arrest and arraignment, and a court date reached in jail.
 */
import type { Game, GameState } from '@eb/core';
import { MINUTES_PER_DAY } from '../src/calendar.ts';
import { tradeOf } from '../src/deal/records.ts';
import type { DealSlice, Sighting } from '../src/deal/state.ts';
import type { LawSlice } from '../src/law/state.ts';
import { advance, play, sliceGame, sliceSim, withoutRivals } from './slice.ts';

export const sim = sliceSim(withoutRivals());
export const game = sliceGame();
export const trade = tradeOf(sim.content);
export const law = (s: GameState) => s.law as LawSlice;
export const deal = (s: GameState) => s.deal as DealSlice;
export const mode = (s: GameState) => game.allowedActions(s).join(',');
export const seenOnce: Sighting = { day: 0, hour: 22, grams: trade.sale.grams, passing: 0 };

/** A life a sighting short of a case, with `held` in hand, the heat high and `cash` (cents). */
export function nearly(seed: string, held: number, cash = 30_000, at: Game = game): GameState {
  const s = play(at, sim, at.init(seed, sim), { type: 'clock/wait-until', hour: 21, minute: 0 }).state;
  const seen = Array.from({ length: trade.police.enough - 1 }, () => seenOnce);
  return {
    ...s,
    deal: { ...deal(s), held, seen, heat: 100, asOf: 0 },
    economy: { ...(s.economy as object), amounts: { cash } },
  } as GameState;
}

/** Hours on the corner until a sale is seen and the police are coming; the beats on the way. */
export function untilCase(seed: string, held = 200, cash?: number, at: Game = game) {
  let s = nearly(seed, held, cash, at);
  for (let h = 0; h < 40; h++) {
    const r = play(at, sim, s, { type: 'deal/corner' });
    s = r.state;
    if (law(s).visits.some((v) => v.why === 'raid')) return { state: s, beats: r.beats };
    if (deal(s).held < trade.sale.grams) break;
  }
  throw new Error(`${seed}: no case in 40 hours`);
}

/** Time passed until the raid, and the morning after it, when bail is set. */
export function arraigned(seed: string, held = 200, cash?: number, at: Game = game) {
  const { state } = untilCase(seed, held, cash, at);
  let s = state;
  for (let i = 0; i < 12 && law(s).cases.length === 0; i++) s = play(at, sim, s, advance(MINUTES_PER_DAY)).state;
  const arrested = s;
  const modeAt = (x: GameState) => at.allowedActions(x).join(',');
  for (let i = 0; i < 4 && !modeAt(s).includes('law/remand'); i++) s = play(at, sim, s, { type: 'law/wait' }).state;
  return { arrested, bail: s };
}

/** Brought from jail to the court date, held without bail, to plead. */
export function inCourt(seed: string, held = 200, at: Game = game): GameState {
  const { bail } = arraigned(seed, held, 0, at);
  return play(at, sim, bail, { type: 'law/remand' }, { type: 'law/wait' }).state;
}
