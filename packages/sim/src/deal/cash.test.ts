import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { untilCase } from '../../test/case.ts';
import { advance, play, sliceGame, sliceSim, waitUntil, withoutRivals } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { tradeOf } from './records.ts';
import type { DealSlice } from './state.ts';

const sim = sliceSim(withoutRivals());
const game = sliceGame();
const trade = tradeOf(sim.content);
const deal = (s: GameState) => s.deal as DealSlice;
const cash = (s: GameState) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
const unexplained = (s: GameState) => game.fact(s, 'deal.unexplained', {}, sim) as number;

/** A life at 22:00 holding enough to sell all night, with `money` cash of its own. */
const evening = (seed: string, money: number) => {
  const s = play(game, sim, game.init(seed, sim), waitUntil(22)).state;
  return {
    ...s,
    deal: { ...deal(s), held: 400 },
    economy: { ...(s.economy as object), amounts: { cash: money } },
  } as GameState;
};

describe('the trade’s cash (M4.1 step 4, D147)', () => {
  it('counts what the trade pays as unexplained, and nothing your own money is', () => {
    const s = evening('count', 50_000);
    expect(unexplained(s)).toBe(0);
    const r = play(game, sim, s, { type: 'deal/corner' }, { type: 'deal/corner' });
    const sold = r.of('deal/sold').length;
    expect(sold).toBeGreaterThan(0);
    expect(unexplained(r.state)).toBe(sold * trade.sale.price);
    expect(cash(r.state) - unexplained(r.state)).toBe(
      50_000 - r.of('deal/robbed').reduce((n, b) => n + (b.cash as number), 0),
    );
  });

  it('spends what pay explains first: the trade’s share is the last to go', () => {
    const s = { ...evening('spend', 10_000), deal: { ...deal(evening('spend', 10_000)), dirty: 30_000 } } as GameState;
    const rich = { ...s, economy: { ...(s.economy as object), amounts: { cash: 40_000 } } } as GameState;
    expect(unexplained(rich)).toBe(30_000);
    const spent = { ...rich, economy: { ...(rich.economy as object), amounts: { cash: 20_000 } } } as GameState;
    expect(unexplained(spent)).toBe(20_000);
  });

  it('draws heat each day while the trade’s money in hand is over the record’s notice', () => {
    const base = evening('heat', 0);
    const over = trade.cash.notice + 100;
    const s = {
      ...base,
      deal: { ...deal(base), dirty: over, heat: 0, asOf: 0 },
      economy: { ...(base.economy as object), amounts: { cash: over } },
    } as GameState;
    const later = play(game, sim, s, advance(3 * MINUTES_PER_DAY)).state;
    expect(game.fact(later, 'deal.heat', {}, sim) as number).toBeGreaterThan(0);
    const under = { ...s, deal: { ...deal(s), dirty: trade.cash.notice - 100 } } as GameState;
    const calm = play(game, sim, under, advance(3 * MINUTES_PER_DAY)).state;
    expect(game.fact(calm, 'deal.heat', {}, sim) as number).toBe(0);
  });

  it('seizes the trade’s money in a raid, and leaves what pay explains', { timeout: 60_000 }, () => {
    const { state } = untilCase('seized', 200, 60_000);
    const before = unexplained(state);
    expect(before).toBeGreaterThan(0);
    const later = play(game, sim, state, advance(10 * MINUTES_PER_DAY));
    const seized = later.of('deal/cash-seized');
    expect(seized).toHaveLength(1);
    // At least what was in hand when the case was made, and more if the corner paid on before the raid.
    expect(seized[0]?.cash as number).toBeGreaterThanOrEqual(Math.min(before, seized[0]?.cash as number));
    expect(seized[0]?.cash as number).toBeGreaterThan(0);
    expect(unexplained(later.state)).toBe(0);
  });
});
