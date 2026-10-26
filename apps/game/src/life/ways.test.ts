import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { Life } from './session.ts';
import { startTrip, tripAction } from './trip.ts';
import { back, type Leg, wayItems, wayOrWalk, waysFor } from './ways.ts';
import { money } from './words.ts';

const withCash = (life: Life, cash: number): Life =>
  new Life({
    state: { ...life.state, economy: { ...(life.state.economy as object), amounts: { cash } } } as GameState,
    kept: [],
  });
const cash = (life: Life) => life.fact('economy.amount', { resource: 'cash' }) as number;

/** A weekday at `hour`, with cash in hand. */
function at(seed: string, hour: number, money = 100_000): Life {
  let life = withCash(new Life(seed), money);
  for (let i = 0; i < 8; i++) {
    life.act({ type: 'clock/wait-until', hour, minute: 0 });
    const day = life.fact('time.weekday');
    if (day !== 'saturday' && day !== 'sunday') break;
  }
  life = new Life({ state: life.state, kept: [] });
  return life;
}

/** Across the city, from near one arterial to near another: the walk an hour and a half. */
const FAR: Leg = { minutes: 95, from: { x: 820, y: 1620 }, to: { x: 6390, y: 8010 } };

describe('the ways across the city (M2.9 step 5, D118)', () => {
  it('lists walking, the bus and a ride, each with the minutes and price the sim previews', () => {
    const life = at('ways', 10);
    const ways = waysFor(life, FAR);
    expect(ways.map((w) => w.way)).toEqual(['walk', 'bus', 'ride']);
    const bus = life.peek<{ minutes: number; cents: number }>({ effect: 'bus-trip', from: FAR.from, to: FAR.to });
    const ride = life.peek<{ minutes: number; price: number }>({ effect: 'ride-trip', from: FAR.from, to: FAR.to });
    expect(ways[0]?.label).toBe('Walk, 95 minutes');
    expect(ways[1]?.label).toBe(`Bus, ${bus.minutes} minutes, ${money(bus.cents)}`);
    expect(ways[2]?.label).toBe(`Ride, ${ride.minutes} minutes, ${money(ride.price)}`);
    expect(ways[1]?.note).toMatch(/^Walk \d+ minutes? to the stop, wait \d+ minutes?, ride \d+ minutes?/);
  });

  it('charges and passes what it showed, for the bus and for a ride', () => {
    for (const way of ['bus', 'ride'] as const) {
      const life = at(`ways-${way}`, 10);
      const shown = waysFor(life, FAR).find((w) => w.way === way);
      const [item] = wayItems(life, FAR, { type: 'trip/work' }).filter((i) => i.action.way === way);
      expect(item?.label).toBe(shown?.label);
      const before = { tick: life.fact('time.tick') as number, cash: cash(life) };
      expect(life.act(wayOrWalk(life, way, FAR))).toBe(true);
      expect(life.fact('time.tick')).toBe(before.tick + (shown?.minutes as number));
      expect(cash(life)).toBe(before.cash - (shown?.cents as number));
    }
  });

  it('leaves out a ride you can’t pay for, and walks once the last bus has gone', () => {
    const poor = at('ways-poor', 10, 300);
    expect(waysFor(poor, FAR).map((w) => w.way)).toEqual(['walk', 'bus']);
    const late = at('ways-late', 23);
    late.act({ type: 'clock/wait-until', hour: 23, minute: 50 });
    expect(waysFor(late, FAR).map((w) => w.way)).not.toContain('bus');
    expect(wayOrWalk(late, 'bus', FAR)).toEqual({ type: 'time/advance', minutes: 95 });
  });

  it('goes to work the way chosen and comes home the same way while it still runs', () => {
    const life = at('ways-trip', 10);
    const trip = startTrip(FAR, 'bus');
    expect(tripAction(life, trip)).toMatchObject({ type: 'travel/bus', from: FAR.from, to: FAR.to });
    trip.step = 'back';
    expect(tripAction(life, trip)).toMatchObject({ type: 'travel/bus', from: FAR.to, to: FAR.from });
    expect(back(back(FAR))).toEqual(FAR);
  });
});
