import type { Action, GameState } from '@eb/core';
import { seedsOf } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { play, refusal, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { LIFE_EVENT } from './module.ts';
import { lifeEventOf, lifeEventsOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame({ career: undefined, events: true });
const fact = (s: GameState, id: string, args: Record<string, unknown> = {}) => game.fact(s, id, args, sim);
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;

/** A life at 10:00 on its first day with `event` waiting, and cash to spend. */
function waitingWith(event: string, seed = 'event', cents = 100_000): GameState {
  const s = play(game, sim, game.init(seed, sim), waitUntil(10)).state;
  return {
    ...s,
    event: { ...(s.event as object), waiting: [event] },
    economy: { ...(s.economy as object), amounts: { cash: cents } },
  } as GameState;
}

const modeOf = (s: GameState) => s.kernel.modes.at(-1) as { id: string };
const asked = (s: GameState) => play(game, sim, s, { type: 'time/advance', minutes: 1 });

describe('life events (M2.10 step 4, D134, D135)', () => {
  it('has about 24 events, each with a free first choice, and a failure exactly when there are odds', () => {
    const events = lifeEventsOf(sim.content);
    expect(events.length).toBeGreaterThanOrEqual(22);
    for (const [id, e] of events) {
      expect(e.choices[0]?.cost ?? 0, id).toBe(0);
      for (const c of e.choices) expect(c.failure !== undefined, `${id}/${c.id}`).toBe(c.odds !== undefined);
    }
  });

  it('asks when you are free, with the choices you can pay for', () => {
    const r = asked(waitingWith('funeral'));
    expect(r.of('event/asked')).toEqual([{ type: 'event/asked', event: 'funeral' }]);
    expect(modeOf(r.state).id).toBe(LIFE_EVENT);
    expect(game.options(r.state, sim).map((a) => a.choice)).toEqual(['stay-away', 'flowers', 'go']);
    const broke = asked(waitingWith('funeral', 'broke', 1000));
    expect(game.options(broke.state, sim).map((a) => a.choice)).toEqual(['stay-away', 'go']);
    expect(refusal(game, sim, broke.state, { type: 'event/choose', choice: 'flowers' })).toBe('cannot-afford');
  });

  it('waits while you sleep and before eight, and asks after', () => {
    const late = play(game, sim, waitingWith('funeral'), waitUntil(22, 30)).state;
    // Asked already at 10:00 on the way to 22:30: put it back to wait.
    const s = {
      ...late,
      kernel: { ...late.kernel, modes: late.kernel.modes.slice(0, 1) },
      event: { ...(late.event as object), waiting: ['funeral'] },
    } as GameState;
    const slept = play(game, sim, s, { type: 'life/do', activity: 'sleep', minutes: 480 });
    expect(modeOf(slept.state).id).toBe('world');
    expect(fact(slept.state, 'event.waiting')).toBe(1);
    const morning = play(game, sim, slept.state, waitUntil(8));
    expect(morning.of('event/asked')).toHaveLength(1);
    expect(modeOf(morning.state).id).toBe(LIFE_EVENT);
  });

  it('charges the price, passes the time and writes the line', () => {
    const r = asked(waitingWith('funeral'));
    const before = cash(r.state);
    const tick = fact(r.state, 'time.tick') as number;
    const go = play(game, sim, r.state, { type: 'event/choose', choice: 'go' });
    expect(fact(go.state, 'time.tick')).toBe(tick + (lifeEventOf(sim.content, 'funeral').choices[2]?.minutes ?? 0));
    expect(modeOf(go.state).id).toBe('world');
    const flowers = play(game, sim, r.state, { type: 'event/choose', choice: 'flowers' });
    expect(cash(flowers.state)).toBe(before - (lifeEventOf(sim.content, 'funeral').choices[1]?.cost ?? 0));
    const told = flowers.of('event/happened')[0];
    expect(lineFor(sim.content, told as never, { you: 'Dana' }, DEFAULT_START)).toBe('Dana sent flowers to a funeral.');
  });

  it('rolls a choice at the odds it shows', () => {
    let kept = 0;
    const seeds = seedsOf(300, 'lend');
    for (const seed of seeds) {
      const r = asked(waitingWith('loan-asked', seed));
      const shown = game.preview(
        r.state,
        [{ effect: 'life-choice', event: 'loan-asked', choice: 'lend' }],
        sim,
      )[0] as unknown as {
        chance: number;
      };
      expect(shown.chance).toBe(lifeEventOf(sim.content, 'loan-asked').choices[1]?.odds);
      const lent = play(game, sim, r.state, { type: 'event/choose', choice: 'lend' });
      if ((lent.of('event/happened')[0] as unknown as { failed: boolean }).failed === false) kept++;
    }
    // 40 in 100 over 300 lives: within three standard deviations.
    expect(Math.abs(kept - 120)).toBeLessThan(3 * Math.sqrt(300 * 0.4 * 0.6));
  });

  it('draws events at their yearly rates: a year in 20 lives, within three standard deviations', {
    timeout: 300_000,
  }, () => {
    const all = lifeEventsOf(sim.content);
    let drawn = 0;
    let days = 0;
    for (const seed of seedsOf(20, 'year')) {
      let s = play(game, sim, game.init(seed, sim), waitUntil(12)).state;
      for (let d = 0; d < 365; d++) {
        // A life that never eats may die in the year (D103): only the days lived count.
        if (modeOf(s).id === 'dead') break;
        days++;
        s = play(game, sim, s, { type: 'time/advance', days: 1 } as Action).state;
        while (modeOf(s).id === LIFE_EVENT) {
          drawn++;
          s = play(game, sim, s, game.options(s, sim)[0] as Action).state;
        }
      }
    }
    // Events with a month or a condition come less than their rate; the rest, at it. The tax refund
    // needs a job, the overdraft little cash: neither comes to these jobless lives with savings.
    const expected =
      20 * all.filter(([id]) => id !== 'tax-refund' && id !== 'overdraft').reduce((n, [, e]) => n + e.rate / 1000, 0);
    expect(Math.abs(drawn - expected)).toBeLessThan(3 * Math.sqrt(expected) + 3);
  });
});
