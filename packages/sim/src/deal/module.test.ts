import { type GameState, Rng, turnFor } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { play, refusal, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { chargeFor, tradeOf } from './records.ts';
import type { DealSlice } from './state.ts';
import { MOST_HELD } from './trade.ts';

const sim = sliceSim();
const game = sliceGame();
const trade = tradeOf(sim.content);
const deal = (s: GameState) => s.deal as DealSlice;
const cash = (s: GameState) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
const buy = (lot: string) => ({ type: 'deal/buy', lot });
const CORNER = { type: 'deal/corner' };

/** What an hour on the corner would show now. */
interface Shown {
  readonly buyer: number;
  readonly seen: number;
  readonly passing: number;
  readonly price: number;
}
const shown = (s: GameState, at = game): Shown =>
  turnFor(at, sim, s, Rng.create('shown'), 0).preview([{ effect: 'corner-hour' }])[0] as unknown as Shown;

/** A life with `tenths` held, at `hour` of day 1. */
function holding(seed: string, tenths: number, hour: number, at = game): GameState {
  const s = play(at, sim, at.init(seed, sim), { type: 'time/advance', minutes: MINUTES_PER_DAY - 7 * 60 }).state;
  const held = { ...s, deal: { ...deal(s), held: tenths } } as GameState;
  return hour === 0 ? held : play(at, sim, held, waitUntil(hour)).state;
}

describe('the street trade (M2.4, D78, D82)', () => {
  it('sells at the supplier’s hours for cash in hand, and never past the most a seller holds', () => {
    const s = game.init('buy', sim);
    expect(refusal(game, sim, s, buy('eight-ball'))).toBe('no-supplier-now');
    const night = play(game, sim, s, waitUntil(trade.supplier.hours.from)).state;
    const before = cash(night);
    const r = play(game, sim, night, buy('eight-ball'));
    expect(deal(r.state).held).toBe(35);
    expect(cash(r.state)).toBe(before - 18_000);
    expect(r.of('deal/bought')).toEqual([{ type: 'deal/bought', lot: 'eight-ball', grams: 35, price: 18_000 }]);
    expect(refusal(game, sim, r.state, buy('ounce'))).toBe('short');
    const full = { ...r.state, deal: { ...deal(r.state), held: MOST_HELD - 10 } } as GameState;
    expect(refusal(game, sim, full, buy('eight-ball'))).toBe('holding-too-much');
  });

  it('rolls each ten minutes on the corner at the odds the hour showed, and sells what you hold', () => {
    const s = holding('corner', 35, 22);
    const odds = shown(s);
    expect(odds.buyer).toBe(trade.corner.buyers[22]);
    const r = play(game, sim, s, CORNER);
    // A roll for each ten minutes, and one for each sale: each at the odds shown.
    const sold = r.of('deal/sold').length;
    const rolls = r.of('logic/rolled');
    expect(rolls.length).toBe(6 + sold);
    // A beat carries the chance of the outcome that came up (law/week.test.ts).
    const first = (b: Record<string, unknown>) => (b.outcome === 0 ? b.chance : 100 - (b.chance as number));
    for (const b of rolls) expect([odds.buyer, odds.seen]).toContain(first(b));
    expect(deal(r.state).held).toBe(35 - sold * trade.sale.grams);
    expect(cash(r.state)).toBe(cash(s) + sold * trade.sale.price);
    expect(r.fact('clock.hour')).toBe(23);
  });

  it('comes up at the odds shown, over many hours', () => {
    let hours = 0;
    let sales = 0;
    let shownBuyer = 0;
    for (let i = 0; i < 200; i++) {
      const s = holding(`odds-${i}`, MOST_HELD, 21);
      shownBuyer += shown(s).buyer;
      sales += play(game, sim, s, CORNER).of('deal/sold').length;
      hours++;
    }
    // 1,200 ten minutes at 30%: within about five standard errors.
    const rate = sales / (hours * 6);
    expect(rate).toBeGreaterThan(shownBuyer / hours / 100 - 0.07);
    expect(rate).toBeLessThan(shownBuyer / hours / 100 + 0.07);
  });

  it('turns a buyer away once the last sale is gone, and refuses the corner with nothing to sell', () => {
    const s = holding('dry', trade.sale.grams, 22);
    expect(refusal(game, sim, holding('none', 0, 22), CORNER)).toBe('nothing-to-sell');
    for (let i = 0; i < 40; i++) {
      const r = play(game, sim, holding(`dry-${i}`, trade.sale.grams, 22), CORNER);
      if (r.of('deal/sold').length === 0) continue;
      expect(deal(r.state).held).toBe(0);
      if (r.of('deal/turned-away').length > 0) return;
    }
    expect(s).toBeDefined();
    throw new Error('no buyer turned away in 40 hours');
  });

  it('is seen more when people are on their way to work than at three in the morning', () => {
    const town = sliceGame({ people: 1000 });
    const day = Array.from({ length: 16 }, (_, k) => shown(holding('rush', 35, k + 4, town), town));
    const rush = day.reduce((a, b) => (b.passing > a.passing ? b : a));
    const late = shown(holding('rush', 35, 3, town), town);
    expect(rush.passing).toBeGreaterThan(late.passing);
    expect(rush.seen).toBeGreaterThan(late.seen);
    expect(late.seen).toBe(Math.max(1, trade.seen.base + Math.floor((late.passing * trade.seen.witness) / 10)));
  });

  it('keeps what was seen, and lets the heat on you fade by the day', () => {
    const s = holding('heat', MOST_HELD, 22);
    const hot = { ...s, deal: { ...deal(s), heat: 40, asOf: 1 } } as GameState;
    expect(game.fact(hot, 'deal.heat', undefined, sim)).toBe(40);
    const later = play(game, sim, hot, { type: 'time/advance', minutes: 2 * MINUTES_PER_DAY }).state;
    const keep = trade.heat.keep;
    expect(game.fact(later, 'deal.heat', undefined, sim)).toBe(
      Math.floor((Math.floor((40 * keep) / 10_000) * keep) / 10_000),
    );
    for (let i = 0; i < 60; i++) {
      const r = play(game, sim, holding(`seen-${i}`, MOST_HELD, 22), CORNER);
      if (r.of('deal/seen').length === 0) continue;
      expect(deal(r.state).seen.length).toBe(r.of('deal/seen').length);
      expect(deal(r.state).seen[0]).toMatchObject({ day: 1, hour: 22, grams: trade.sale.grams });
      return;
    }
    throw new Error('no sale seen in 60 hours');
  });

  it('charges by weight, under Michigan’s tiers, the last covering the rest', () => {
    expect(chargeFor(sim.content, trade.possession, 35, 0)).toBe('possession-cocaine-25');
    expect(chargeFor(sim.content, trade.possession, 250, 0)).toBe('possession-cocaine-50');
    expect(chargeFor(sim.content, trade.delivery, 5, 0)).toBe('delivery-cocaine-50');
  });

  it('refuses a trade whose charges are out of order of weight', () => {
    const bad = sliceSim({
      ...PACK.records,
      trade: { cocaine: { ...trade, possession: ['possession-cocaine-50', 'possession-cocaine-25'] } },
    });
    expect(() => tradeOf(bad.content)).toThrow(/covers no more/);
  });
});
