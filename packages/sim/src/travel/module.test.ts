import { type GameState, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { type Transit, transitOf } from './bus.ts';

const sim = sliceSim();
const game = sliceGame();
const t = transitOf(sim.content) as Transit;
const fact = (s: GameState, id: string, args: Record<string, unknown> = {}) => game.fact(s, id, args, sim);
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const peek = (s: GameState, effect: string, from: object, to: object) =>
  turnFor(game, sim, s, Rng.create('shown'), 0).preview([{ effect, from, to }])[0] as unknown as Record<string, number>;

/** A weekday at 10:00 with cash in hand. */
function morning(seed: string): GameState {
  let s = game.init(seed, sim);
  s = { ...s, economy: { ...(s.economy as object), amounts: { cash: 100_000 } } } as GameState;
  for (let i = 0; i < 8; i++) {
    s = play(game, sim, s, { type: 'clock/wait-until', hour: 10, minute: 0 }).state;
    const day = fact(s, 'time.weekday');
    if (day !== 'saturday' && day !== 'sunday') break;
  }
  return s;
}

const A = { x: 800, y: 1600 };
const B = { x: 6400, y: 8000 };

describe('going by bus or a ride (M2.9 step 4, D118)', () => {
  it('takes the bus for the minutes and the fare it showed', () => {
    const s = morning('bus');
    const shown = peek(s, 'bus-trip', A, B);
    const r = play(game, sim, s, { type: 'travel/bus', from: A, to: B });
    expect(r.of('travel/rode-bus')).toEqual([{ type: 'travel/rode-bus', minutes: shown.minutes, cents: shown.cents }]);
    expect(shown.cents).toBe(t.fare);
    expect(cash(r.state)).toBe(cash(s) - t.fare);
    expect(fact(r.state, 'time.tick')).toBe((fact(s, 'time.tick') as number) + (shown.minutes as number));
    expect(lineFor(sim.content, r.of('travel/rode-bus')[0] as never, { you: 'Dana' }, DEFAULT_START)).toMatch(
      /^Dana took the bus, \d+ minutes for \$1\.75\.$/,
    );
  });

  it('stops charging fares at the day’s cap', () => {
    let s = morning('cap');
    const paid: number[] = [];
    for (let i = 0; i < 4; i++) {
      const from = i % 2 === 0 ? A : B;
      const to = i % 2 === 0 ? B : A;
      const before = cash(s);
      s = play(game, sim, s, { type: 'travel/bus', from, to }).state;
      paid.push(before - cash(s));
    }
    expect(paid).toEqual([t.fare, t.fare, t.fare, t.dayCap - 3 * t.fare]);
  });

  it('takes a ride for the minutes and price it showed', () => {
    const s = morning('ride');
    const shown = peek(s, 'ride-trip', A, B);
    const r = play(game, sim, s, { type: 'travel/ride', from: A, to: B });
    expect(r.of('travel/rode')).toEqual([{ type: 'travel/rode', minutes: shown.minutes, cents: shown.price }]);
    expect(cash(r.state)).toBe(cash(s) - (shown.price as number));
  });

  it('refuses without two points, with no bus running, or without the price of a ride', () => {
    const s = morning('refuse');
    expect(refusal(game, sim, s, { type: 'travel/bus', from: A })).toBe('no-points');
    const late = play(game, sim, s, { type: 'clock/wait-until', hour: 23, minute: 50 }).state;
    expect(refusal(game, sim, late, { type: 'travel/bus', from: A, to: B })).toBe('no-bus');
    const broke = { ...s, economy: { ...(s.economy as object), amounts: { cash: 100 } } } as GameState;
    expect(refusal(game, sim, broke, { type: 'travel/ride', from: A, to: B })).toBeDefined();
  });
});
