import type { Beat, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { tradeOf } from './records.ts';
import type { DealSlice } from './state.ts';

const sim = sliceSim();
const game = sliceGame();
const trade = tradeOf(sim.content);
const crew = trade.crew;
const deal = (s: GameState) => s.deal as DealSlice;
const cash = (s: GameState) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
const at = (s: GameState, changes: Partial<DealSlice>, money?: number, ties?: object) =>
  ({
    ...s,
    deal: { ...deal(s), ...changes },
    ...(money === undefined ? {} : { economy: { ...(s.economy as object), amounts: { cash: money } } }),
    ...(ties ? { ties: { ...(s.ties as object), ...ties } } : {}),
  }) as GameState;
const offered = (s: GameState, type: string) => game.options(s, sim).some((a) => a.type === type);

/** A life at the supplier's hour on day 0. */
const evening = (seed: string) => play(game, sim, game.init(seed, sim), waitUntil(trade.supplier.hours.from)).state;

/** Days passed a day at a time, with the beats. */
function days(s: GameState, n: number) {
  const beats: Beat[] = [];
  let now = s;
  for (let d = 0; d < n; d++) {
    const r = play(game, sim, now, advance(MINUTES_PER_DAY));
    beats.push(...r.beats);
    now = r.state;
  }
  return { state: now, of: (t: string) => beats.filter((b) => b.type === t) };
}

describe('the crew (M2.4, D79, D84–D86)', () => {
  it('brings you in once you have bought from them enough, and not while you are hot', () => {
    const s = at(evening('join'), {}, 2_000_000);
    expect(refusal(game, sim, s, { type: 'deal/join' })).toBe('not-trusted');
    let r = s;
    for (let k = 0; k < crew.trust; k++) r = play(game, sim, r, { type: 'deal/buy', lot: 'eight-ball' }).state;
    expect(deal(r).trust).toBe(crew.trust);
    expect(refusal(game, sim, at(r, { heat: crew.heat + 1, asOf: 0 }), { type: 'deal/join' })).toBe('too-hot');
    const joined = play(game, sim, r, { type: 'deal/join' });
    expect(joined.of('deal/joined').length).toBe(1);
    expect(deal(joined.state).crew).toBe(true);
  });

  it('fronts an ounce at the crew’s price, owed by a due date, and takes repayment as trust', () => {
    const s = at(evening('front'), { crew: true, trust: crew.trust }, 0);
    const ounce = trade.supplier.sells.find((l) => l.id === crew.front.lot);
    const r = play(game, sim, s, { type: 'deal/front' });
    expect(deal(r.state).held).toBe(ounce?.grams);
    expect(deal(r.state).owed).toBe(crew.front.price);
    expect(deal(r.state).due).toBe(crew.front.days);
    expect(cash(r.state)).toBe(0);
    expect(refusal(game, sim, r.state, { type: 'deal/front' })).toBe('still-owed');
    expect(refusal(game, sim, r.state, { type: 'deal/pay-back' })).toBe('short');
    const paid = play(game, sim, at(r.state, {}, crew.front.price + 500), { type: 'deal/pay-back' });
    expect(deal(paid.state).owed).toBe(0);
    expect(deal(paid.state).trust).toBe(crew.trust + 1);
    expect(cash(paid.state)).toBe(500);
  });

  it('cuts you off when a front goes unpaid past its day, and the debt still stands', () => {
    const s = at(evening('unpaid'), { crew: true, trust: crew.trust }, 0);
    const r = play(game, sim, s, { type: 'deal/front' }).state;
    const late = days(r, crew.front.days + 1);
    expect(late.of('deal/cut-off')).toEqual([{ type: 'deal/cut-off', owed: crew.front.price }]);
    expect(deal(late.state).cutOff).toBe(true);
    expect(deal(late.state).trust).toBe(Math.max(0, crew.trust - crew.unpaid));
    expect(deal(late.state).owed).toBe(crew.front.price);
    const evening2 = play(game, sim, late.state, waitUntil(trade.supplier.hours.from)).state;
    expect(offered(evening2, 'deal/front')).toBe(false);
  });

  it('brings the coworker in only when they know you well and think well of you', () => {
    const s = at(evening('recruit'), { crew: true }, undefined, { together: 0, regard: 90 });
    expect(refusal(game, sim, s, { type: 'deal/recruit' })).toBe('not-close-enough');
    const cold = at(s, {}, undefined, { together: 40_000, regard: crew.recruit.regard - 1 });
    expect(refusal(game, sim, cold, { type: 'deal/recruit' })).toBe('not-enough-regard');
    const warm = at(s, {}, undefined, { together: 40_000, regard: crew.recruit.regard + 10 });
    const r = play(game, sim, warm, { type: 'deal/recruit' });
    expect(deal(r.state).recruit).toBe(0);
    expect(r.of('ties/remembered').map((b) => b.act)).toEqual([crew.recruit.act]);
  });

  it('lets the coworker sell on their nights from what you hold, for your share', () => {
    const s = at(evening('nights'), { crew: true, recruit: 0, held: 499 }, 0, { together: 40_000, regard: 100 });
    const week = days(s, 7);
    const sold = week.of('deal/recruit-sold');
    const arrested = week.of('deal/recruit-arrested');
    expect(sold.length + arrested.length).toBe(crew.recruit.nights);
    const sales = sold.reduce((n, b) => n + (b.sales as number), 0);
    const yours = sold.reduce((n, b) => n + (b.yours as number), 0);
    expect(cash(week.state)).toBe(yours);
    for (const b of sold) {
      const takings = (b.sales as number) * trade.sale.price;
      expect(b.yours).toBe(takings - Math.floor((takings * crew.recruit.share) / 100));
    }
    if (arrested.length === 0) expect(deal(week.state).held).toBe(499 - sales * trade.sale.grams);
  });

  it('names you once arrested, less often the more they think of you', () => {
    const named = (regard: number) => {
      let n = 0;
      let arrests = 0;
      for (let i = 0; i < 300 && arrests < 60; i++) {
        const s = at(evening(`named-${regard}-${i}`), { crew: true, recruit: 0, held: 499 }, 0, {
          together: 40_000,
          regard,
        });
        for (const b of days(s, 7).of('deal/recruit-arrested')) {
          arrests++;
          if (b.named) n++;
        }
      }
      return n / arrests;
    };
    const cold = named(0);
    const warm = named(60);
    expect(cold).toBeGreaterThan((crew.recruit.named - 0) / 100 - 0.2);
    expect(warm).toBeLessThan(cold);
    expect(warm).toBeLessThan((crew.recruit.named - 60) / 100 + 0.2);
  });
});
