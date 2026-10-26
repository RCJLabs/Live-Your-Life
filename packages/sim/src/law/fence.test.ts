import type { GameState, RecordStore } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceSim, tickOf } from '../../test/slice.ts';
import { START_CASH } from '../dials.ts';
import { createLifeGame } from '../game.ts';
import { paidFor } from './fence.ts';
import type { LawState } from './module.ts';
import { type CrimeRecord, crimeOf, fenceOf, offenceFor, SHOPLIFTING } from './records.ts';

const game = createLifeGame({ events: false, unlocked: true, people: 0 });
const sim = sliceSim();
const store = sim.content as RecordStore;
const tick = (state: GameState) => (state.time as { tick: number }).tick;
const to = (state: GameState, day: number, hour: number, minute = 0) =>
  advance(tickOf(day, hour, minute) - tick(state));
const chance = (rolled: Record<string, unknown> | undefined) =>
  rolled?.outcome === 0 ? (rolled.chance as number) : 100 - (rolled?.chance as number);

/** A life carrying `bag`, at `hour` on day 0. */
function carrying(seed: string, bag: Record<string, number>, hour = 22): GameState {
  const start = game.init(seed, sim);
  const there = play(game, sim, start, to(start, 0, hour)).state;
  return { ...there, inventory: { bag } };
}

describe('the fence (D48)', () => {
  it('is drawn from the seed and the name pool, the same for a seed', () => {
    const a = (game.init('fence', sim).law as LawState).fence;
    expect(a).toEqual((game.init('fence', sim).law as LawState).fence);
    expect(PACK.records['name-pool']?.['rust-belt']).toMatchObject({ last: expect.arrayContaining([a?.last]) });
  });

  it('buys what you carry, at their hours only, for a quarter of the price, rounded down', () => {
    const early = carrying('early', { razors: 1 }, 21);
    expect(game.options(early, sim).filter((a) => a.type === 'law/sell')).toEqual([]);
    expect(refusal(game, sim, early, { type: 'law/sell', item: 'razors' })).toBe('no-fence-now');
    const state = carrying('sell', { razors: 2, soda: 1 });
    expect(game.options(state, sim).filter((a) => a.type === 'law/sell')).toEqual([
      { type: 'law/sell', item: 'razors' },
      { type: 'law/sell', item: 'soda' },
    ]);
    expect([paidFor(store, 'razors'), paidFor(store, 'soda')]).toEqual([499, 62]);
    const sold = play(game, sim, state, { type: 'law/sell', item: 'razors' });
    expect(sold.fact('economy.amount', { resource: 'cash' })).toBe(START_CASH + 499);
    expect(sold.fact('inventory.count', { item: 'razors' })).toBe(1);
    expect(refusal(game, sim, state, { type: 'law/sell', item: 'charger' })).toBe('not-carried');
  });

  it('rolls the odds of trouble the preview shows, and trouble is a visit you are told of', () => {
    let seen = 0;
    for (let i = 0; i < 200; i++) {
      const state = carrying(`trouble-${i}`, { razors: 1 });
      const [preview] = game.preview(state, [{ effect: 'sale', item: 'razors' }], sim);
      expect(preview).toMatchObject({ paid: 499, trouble: 3 });
      const sold = play(game, sim, state, { type: 'law/sell', item: 'razors' });
      expect(chance(sold.of('logic/rolled')[0])).toBe(3);
      if (sold.of('law/notice').length === 0) continue;
      seen++;
      expect(sold.of('law/notice')[0]?.what).toBe('visit');
      const at = sold.of('law/notice')[0]?.tick as number;
      const came = play(game, sim, sold.state, advance(at - tick(sold.state)));
      // Selling is its own offence, with no shop's demand.
      expect(came.of('law/ticketed')[0]).toMatchObject({ offence: 'receiving-3', demand: 0 });
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('lets you eat what is food, and not what is not', () => {
    const state = carrying('eat', { bread: 1, razors: 1 }, 12);
    expect(game.options(state, sim).filter((a) => a.type === 'law/eat')).toEqual([{ type: 'law/eat', item: 'bread' }]);
    const before = game.fact(state, 'life.need', { need: 'food' }, sim) as number;
    const ate = play(game, sim, state, { type: 'law/eat', item: 'bread' });
    expect(ate.fact('life.need', { need: 'food' })).toBe(Math.min(100, before + 20));
    expect(refusal(game, sim, state, { type: 'law/eat', item: 'razors' })).toBe('nothing-to-eat');
  });
});

describe("the slice's law content", () => {
  const crime = crimeOf(store, SHOPLIFTING);
  const bad = (changes: Partial<CrimeRecord>) => () =>
    crimeOf(sliceSim({ ...PACK.records, crime: { [SHOPLIFTING]: { ...crime, ...changes } } }).content, SHOPLIFTING);

  it('charges a first theft under $200 as the third degree, and a later one as the second', () => {
    expect(offenceFor(store, crime.offences, 1999, 0)).toBe('retail-fraud-3');
    expect(offenceFor(store, crime.offences, 1999, 1)).toBe('retail-fraud-2');
    expect(offenceFor(store, crime.offences, 20000, 0)).toBe('retail-fraud-2');
    expect(offenceFor(store, fenceOf(store, 'back-lot').offences, 499, 0)).toBe('receiving-3');
  });

  it('throws for a crime whose ranges run backwards, or that reviews its footage while open', () => {
    expect(bad({ police: { min: 40, max: 20 } })).toThrow('police runs from 40 down to 20');
    expect(bad({ hearing: { from: 12, to: 8 } })).toThrow('hearing ends at 8, not after 12');
    expect(bad({ review: 12 })).toThrow('reviews its footage while it is open');
    expect(bad({ offences: ['nothing'] })).toThrow('offence "nothing": no such record');
    expect(bad({ demand: { times: 10, min: 300, max: 200 } })).toThrow('its demand runs from more to less');
  });
});
