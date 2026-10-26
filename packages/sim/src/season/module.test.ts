import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { doing, play, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import type { LifeStart } from '../calendar.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { climateOf, gasBill } from './climate.ts';
import { courtDay } from './module.ts';

const sim = sliceSim();
const c = climateOf(sim.content);
const at = (year: number, month: number, day: number, hour: number): LifeStart => ({
  year,
  month,
  day,
  hour,
  minute: 0,
});

/** A life with no job, started at `start`. */
function life(start: LifeStart, seed = 'season') {
  const game = sliceGame({ start, career: undefined });
  const state = game.init(seed, sim);
  return { game, state, fact: (s: GameState, id: string) => game.fact(s, id, {}, sim) };
}

const rest = (g: ReturnType<typeof life>, s: GameState) => g.game.fact(s, 'life.need', { need: 'rest' }, sim) as number;

describe('the season (M2.10 step 3)', () => {
  it('costs an hour of sleep on the night the clocks go forward, and gives one when they go back (D133)', () => {
    const night = (start: LifeStart) => {
      const g = life(start);
      // Tired, so a night's sleep doesn't fill rest and the hour shows.
      const life0 = g.state.life as { levels: Record<string, number> };
      const tired = { ...g.state, life: { ...life0, levels: { ...life0.levels, rest: 0 } } } as GameState;
      const r = play(g.game, sim, tired, doing('sleep', 360));
      return { rest: rest(g, r.state), clocks: r.of('season/clocks') };
    };
    const plain = night(at(2026, 3, 14, 23));
    const forward = night(at(2026, 3, 7, 23));
    const back = night(at(2026, 10, 31, 23));
    expect(forward.clocks).toEqual([{ type: 'season/clocks', way: 'forward', slept: true }]);
    expect(back.clocks).toEqual([{ type: 'season/clocks', way: 'back', slept: true }]);
    expect(plain.clocks).toEqual([]);
    expect(forward.rest).toBe(Math.max(0, plain.rest - c.clocks.rest));
    expect(back.rest).toBe(plain.rest + c.clocks.rest);
  });

  it('leaves your sleep alone if you are awake when the clocks change', () => {
    const g = life(at(2026, 3, 7, 23));
    const r = play(g.game, sim, g.state, waitUntil(6));
    expect(r.of('season/clocks')).toEqual([{ type: 'season/clocks', way: 'forward', slept: false }]);
  });

  it('tells the journal of a holiday, and puts the buses on Sunday’s timetable (D132)', () => {
    const g = life(at(2025, 7, 3, 7));
    expect(g.fact(g.state, 'season.timetable')).toBe('thursday');
    const r = play(g.game, sim, g.state, waitUntil(7));
    const told = r.of('season/holiday');
    expect(told).toHaveLength(1);
    expect(lineFor(sim.content, told[0] as never, { you: 'Dana' }, DEFAULT_START)).toBe(
      "It was Independence Day. The court and the college were closed, and the buses ran on Sunday's timetable.",
    );
    expect(r.fact('season.holiday')).toBe(true);
    expect(r.fact('season.timetable')).toBe('sunday');
    // A bus at 07:00 on a holiday waits for Sunday's first, at 08:00.
    const peek = (s: GameState) =>
      g.game.preview(
        s,
        [{ effect: 'bus-trip', from: { x: 800, y: 1600 }, to: { x: 6400, y: 8000 } }],
        sim,
      )[0] as unknown as {
        wait: number;
      };
    expect(peek(r.state).wait).toBeGreaterThan(peek(g.state).wait);
  });

  it('sets a court date past a holiday', () => {
    const g = life(at(2025, 7, 3, 7));
    const today = g.fact(g.state, 'time.day') as number;
    const view = {
      content: sim.content,
      fact: (id: string, args?: Record<string, unknown>) => g.game.fact(g.state, id, args ?? {}, sim),
    };
    expect(courtDay(view, today + 1)).toBe(today + 2);
    expect(courtDay(view, today + 2)).toBe(today + 2);
  });

  it('slows walks and buses on a snow day and the morning after, and the alarm with them (D131)', () => {
    const g = life(at(2026, 1, 1, 7), 'snow');
    let s = g.state;
    let found = false;
    for (let i = 0; i < 31 && !found; i++) {
      if (g.fact(s, 'season.snow') === true && g.fact(s, 'time.of-day') === 7 * 60) found = true;
      else s = play(g.game, sim, s, waitUntil(7)).state;
    }
    expect(found).toBe(true);
    expect(g.fact(s, 'season.pace')).toBe(c.snow.pace);
    expect(g.fact(s, 'season.late')).toBe(c.snow.late);
    const commuted = play(g.game, sim, s, { type: 'you/commute', minutes: 40 });
    expect(commuted.fact('you.alarm')).toBe(
      Math.ceil((40 * c.snow.pace) / 100) +
        (play(g.game, sim, g.state, { type: 'you/commute', minutes: 40 }).fact('you.alarm') as number) -
        40,
    );
  });

  it('bills the month’s gas with the rent, and owes it if it can’t be paid (D130)', () => {
    const g = life(at(2025, 1, 31, 7));
    const r = play(g.game, sim, g.state, waitUntil(7));
    const gas = r.of('home/gas');
    expect(gas).toHaveLength(1);
    expect((gas[0] as unknown as { cents: number }).cents).toBe(gasBill(c, 1));
    expect(lineFor(sim.content, gas[0] as never, { you: 'Dana' }, DEFAULT_START)).toMatch(
      /^Dana (paid \$\d+\.\d\d for the month's gas\.|could not)|^The gas bill/,
    );
    const broke = { ...g.state, economy: { ...(g.state.economy as object), amounts: { cash: 0 } } } as GameState;
    const owed = play(g.game, sim, broke, waitUntil(7));
    expect(owed.of('home/gas')).toEqual([{ type: 'home/gas', cents: gasBill(c, 1), paid: false }]);
    // With the rent, and the month's other bills (D140).
    const others = owed.of('home/bill').reduce((n, b) => n + (b.cents as number), 0);
    expect(owed.fact('home.owed')).toBe(
      gasBill(c, 1) + (owed.of('home/rent')[0] as unknown as { cents: number }).cents + others,
    );
  });
});
