import { type Action, type Beat, type GameState, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import { steadyPolicy } from '../bot.ts';
import type { LifeStart } from '../calendar.ts';
import { lifeEventsOf } from './records.ts';

const sim = sliceSim();
const MAX_TURNS = 3000;

/** The game for a life that starts on `day` of `month`, at 07:00, with life events drawn. */
const gameFor = (month: number, day = 1) => {
  const start: LifeStart = { year: 2025, month, day, hour: 7, minute: 0 };
  return sliceGame({ start, events: true });
};

/** A week by the steady bot from `state`, every beat kept, and the offers refused. */
function week(game: ReturnType<typeof sliceGame>, state: GameState, seed: string) {
  const policy = steadyPolicy;
  const rng = Rng.create(seed).fork('bot');
  const beats: Beat[] = [];
  let refused = 0;
  let s = state;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const action = policy.choose(turnFor(game, sim, s, rng, turn)) as Action | null;
    if (!action) return { beats, refused, ended: true, state: s };
    const step = game.reduce(s, action, sim);
    if (!step.accepted) refused++;
    beats.push(...step.beats);
    s = step.state;
  }
  return { beats, refused, ended: false, state: s };
}

// M2.10's gate (step 5): the steady bot plays 500 seeded weeks, started on every day of every month,
// with the season and life events on, and the game refuses nothing it offered.
describe('the year, headless (M2.10 step 5)', () => {
  it('plays 500 weeks across the seasons, nothing refused, with snow, holidays, gas and life events', {
    timeout: 900_000,
  }, () => {
    const seen = new Map<string, number>();
    const asked = new Map<string, number>();
    let refused = 0;
    let ended = 0;
    const seeds = seedsOf(500, 'seasons');
    for (const [i, seed] of seeds.entries()) {
      const game = gameFor(1 + (i % 12), 1 + (Math.floor(i / 12) % 28));
      const r = week(game, game.init(seed, sim), seed);
      refused += r.refused;
      if (r.ended) ended++;
      for (const b of r.beats) {
        seen.set(b.type, (seen.get(b.type) ?? 0) + 1);
        if (b.type === 'event/asked') asked.set(b.event as string, (asked.get(b.event as string) ?? 0) + 1);
      }
    }
    expect(ended).toBe(500);
    expect(refused).toBe(0);
    for (const type of ['season/snow', 'season/holiday', 'season/clocks', 'home/gas', 'event/asked', 'event/happened'])
      expect(seen.get(type) ?? 0, type).toBeGreaterThan(0);
    // About a dozen events a year: 500 weeks is about 9.6 years of life, so 60 to 180 asked.
    const total = [...asked.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(60);
    expect(total).toBeLessThan(180);
    console.log(`life events in 500 weeks: ${total}; ${asked.size} of 24 kinds`, Object.fromEntries(asked));
  });

  it('plays every life event through in a bot’s week in its own season', { timeout: 300_000 }, () => {
    for (const [id, e] of lifeEventsOf(sim.content)) {
      const game = gameFor(e.months?.[0] ?? 6);
      const s0 = game.init(`forced-${id}`, sim);
      const s = { ...s0, event: { ...(s0.event as object), waiting: [id] } } as GameState;
      const r = week(game, s, `forced-${id}`);
      expect(r.refused, id).toBe(0);
      expect(
        r.beats.some((b) => b.type === 'event/happened' && b.event === id),
        id,
      ).toBe(true);
    }
  });
});
