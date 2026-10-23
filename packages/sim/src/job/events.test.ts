import { type GameState, Rng } from '@eb/core';
import { describe, expect, it } from 'vitest';
import {
  advance,
  doing,
  play,
  refusal,
  signUp,
  sliceSim,
  TEST_COOK,
  testCook,
  tickOf,
  withCareer,
} from '../../test/slice.ts';
import { createLifeGame } from '../game.ts';
import { drawFrom, LEAST, MOST, oddsOf } from './events.ts';
import type { CareerRecord } from './records.ts';
import type { JobSlice } from './state.ts';

describe('the odds of a choice (D40)', () => {
  it('is the base, plus a share of the skill points, less a share of the tired points', () => {
    const odds = { base: 50, skill: 40, tired: 30 };
    expect(oddsOf(odds, 0, 100)).toBe(50);
    expect(oddsOf(odds, 50, 100)).toBe(70);
    expect(oddsOf(odds, 0, 0)).toBe(20);
    expect(oddsOf(odds, 25, 50)).toBe(45); // 50 + 10 − 15
  });

  it('is never certain either way', () => {
    expect(oddsOf({ base: 100, skill: 100, tired: 0 }, 100, 100)).toBe(MOST);
    expect(oddsOf({ base: 0, skill: 0, tired: 100 }, 0, 0)).toBe(LEAST);
    expect([LEAST, MOST]).toEqual([5, 95]);
  });
});

describe('the deck', () => {
  const pool = [
    ['a', 1],
    ['b', 5],
    ['c', 1],
    ['d', 3],
  ] as const;

  it('draws every event once before any comes up again', () => {
    const rng = Rng.create('deck');
    let drawn: string[] = [];
    for (let cycle = 0; cycle < 50; cycle++) {
      const seen: string[] = [];
      for (let i = 0; i < pool.length; i++) {
        const next = drawFrom(pool, drawn, rng);
        if (!next) throw new Error('nothing drawn');
        seen.push(next.id);
        drawn = next.drawn;
      }
      expect(seen.sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });

  it('draws the heavier first more often, by weight', () => {
    const rng = Rng.create('weights');
    let heavy = 0;
    for (let i = 0; i < 1000; i++)
      if (
        drawFrom(
          [
            ['x', 9],
            ['y', 1],
          ],
          [],
          rng,
        )?.id === 'x'
      )
        heavy++;
    expect(heavy).toBeGreaterThan(860);
    expect(heavy).toBeLessThan(940);
  });

  it('draws nothing from an empty pool, and shuffles when the rest are spent', () => {
    expect(drawFrom([], [], Rng.create('empty'))).toBeNull();
    expect(drawFrom([['a', 1]], ['a', 'gone'], Rng.create('again'))).toEqual({ id: 'a', drawn: ['a'] });
  });
});

describe('a shift event in play', () => {
  const eventful = (changes: Partial<CareerRecord> = {}) => {
    const game = createLifeGame({ people: 0, career: TEST_COOK });
    const sim = sliceSim(
      withCareer(testCook({ events: { tags: ['kitchen', 'food-service'], chance: 100 }, ...changes })),
    );
    return { game, sim };
  };
  const { game, sim } = eventful();
  const job = (state: GameState) => state.job as JobSlice;
  const to = (state: GameState, day: number, hour: number, minute = 0) =>
    advance(tickOf(day, hour, minute) - (state.time as { tick: number }).tick);

  /** At Tuesday's shift's start, signed up for it, with its event's minute. */
  function atShift(seed: string) {
    const signed = play(game, sim, game.init(seed, sim), signUp(1)).state;
    const event = job(signed).signed[0]?.event as number;
    return { state: play(game, sim, signed, to(signed, 1, 15)).state, event };
  }

  it('comes due between half an hour in and half an hour before the end, and work runs until it', () => {
    const minutes = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const { state, event } = atShift(`due-${i}`);
      expect(event).toBeGreaterThanOrEqual(30);
      expect(event).toBeLessThanOrEqual(450);
      expect(game.fact(state, 'job.shift-left', undefined, sim)).toBe(event);
      minutes.add(event);
    }
    expect(minutes.size).toBeGreaterThan(50);
  });

  it('stops the shift for a choice: only a choice is allowed, and the clock stops', () => {
    const { state, event } = atShift('stop');
    const working = play(game, sim, state, doing('work', event));
    const [beat] = working.of('job/event');
    expect(beat).toMatchObject({ type: 'job/event', day: 1 });
    const mode = working.state.kernel.modes.at(-1);
    expect(mode).toEqual({ id: 'shift-event', data: { event: beat?.event, day: 1 } });
    expect(new Set(game.options(working.state, sim).map((a) => a.type))).toEqual(new Set(['job/choose']));
    expect(refusal(game, sim, working.state, { type: 'time/elapse', ms: 500 })).toBe('mode');
    expect(refusal(game, sim, working.state, doing('eat', 30))).toBe('mode');
    expect(refusal(game, sim, working.state, { type: 'job/choose', choice: 'no-such' })).toBe('bad-choice');
  });

  it("doesn't come up for someone not at work when it comes due", () => {
    const { state, event } = atShift('away');
    const away = play(game, sim, state, doing('relax', event + 10));
    expect(away.of('job/event')).toEqual([]);
    expect(away.state.kernel.modes.at(-1)?.id).toBe('world');
  });

  it('does what its preview shows, and gives the shift back', () => {
    for (let i = 0; i < 40; i++) {
      const { state, event } = atShift(`choose-${i}`);
      const stopped = play(game, sim, state, doing('work', event)).state;
      const data = stopped.kernel.modes.at(-1)?.data as { event: string; day: number };
      const choices = game.options(stopped, sim);
      const pick = choices[i % choices.length] as { type: string; choice: string };
      const [preview] = game.preview(stopped, [{ effect: 'shift-choice', ...data, choice: pick.choice }], sim);
      const before = (id: string, args?: Record<string, unknown>) => game.fact(stopped, id, args, sim);
      const chose = play(game, sim, stopped, pick);
      const failed = chose.of('job/outcome')[0]?.failed === true;
      const rolled = chose.of('logic/rolled')[0];
      const chance =
        rolled === undefined ? 100 : rolled.outcome === 0 ? rolled.chance : 100 - (rolled.chance as number);
      expect(chance).toBe(preview?.chance);
      const stakes = preview?.[failed ? 'failure' : 'outcome'] as {
        standing: number;
        practice: number;
        home: boolean;
        needs: object;
      };
      expect((chose.fact('job.standing') as number) - (before('job.standing') as number)).toBe(stakes.standing);
      expect(job(chose.state).practice - job(stopped).practice).toBe(stakes.practice);
      for (const [need, by] of Object.entries(stakes.needs)) {
        const was = before('life.need', { need }) as number;
        expect(chose.fact('life.need', { need }), need).toBe(Math.min(100, Math.max(0, was + by)));
      }
      expect(chose.state.kernel.modes.at(-1)?.id).toBe('world');
      expect(chose.fact('job.on-shift')).toBe(!stakes.home);
    }
  });

  it('keeps each need between empty and full when an outcome moves it', () => {
    const swing = {
      name: 'A swing',
      tags: ['test'],
      weight: 1,
      prompt: 'A test.',
      choices: [
        { id: 'down', text: 'Down', outcome: { told: 'Down.', needs: { rest: -50, calm: 80 } } },
        { id: 'up', text: 'Up', outcome: { told: 'Up.', needs: { rest: 50, calm: -50 } } },
      ],
    };
    const only = sliceSim({
      ...withCareer(testCook({ events: { tags: ['test'], chance: 100 } })),
      'shift-event': { swing },
    });
    const signed = play(game, only, game.init('swing', only), signUp(1)).state;
    const event = job(signed).signed[0]?.event as number;
    // Up since Monday morning: no rest left by Tuesday afternoon, and calm over a fifth.
    const at = play(game, only, signed, to(signed, 1, 15), doing('work', event)).state;
    expect(game.fact(at, 'life.need', { need: 'rest' }, only)).toBe(0);
    expect(game.fact(at, 'life.need', { need: 'calm' }, only)).toBeGreaterThan(20);
    const down = play(game, only, at, { type: 'job/choose', choice: 'down' });
    expect([down.fact('life.need', { need: 'rest' }), down.fact('life.need', { need: 'calm' })]).toEqual([0, 100]);
    // Full, not past it: half an hour's work takes 2 points, at 4 an hour.
    const after = play(game, only, down.state, doing('work', 30));
    expect(after.fact('life.need', { need: 'calm' })).toBe(98);
  });

  it('sends you home without costing the rest of the shift', () => {
    // The flare-up's first choice: everyone out, and home.
    const flare = eventful({ events: { tags: ['flare'], chance: 100 } });
    const records = flare.sim.content;
    const fire = records.get('shift-event', 'flare-up') as object;
    const only = sliceSim({
      ...withCareer(testCook({ events: { tags: ['flare'], chance: 100 } })),
      'shift-event': { 'flare-up': { ...fire, tags: ['flare'] } },
    });
    const signed = play(flare.game, only, flare.game.init('home', only), signUp(1)).state;
    const event = job(signed).signed[0]?.event as number;
    const at = play(flare.game, only, signed, to(signed, 1, 15), doing('work', event)).state;
    const home = play(flare.game, only, at, { type: 'job/choose', choice: 'out' });
    expect(home.fact('job.on-shift')).toBe(false);
    const over = play(flare.game, only, home.state, to(home.state, 1, 23, 2));
    expect(over.of('job/shift-over')[0]).toMatchObject({ home: true, worked: event });
    expect(over.of('job/standing')).toEqual([]);
  });

  it('draws only events that share a tag with the career, and only while their condition holds', () => {
    const work = eventful({ events: { tags: ['work'], chance: 100 } });
    // The one "work" event, nodding off, needs rest under 25%: rested, nothing comes up.
    const rested = play(work.game, work.sim, work.game.init('rested', work.sim), signUp(1)).state;
    const event = job(rested).signed[0]?.event as number;
    const asleep = play(work.game, work.sim, rested, to(rested, 1, 5), doing('sleep', 480)).state;
    const slept = play(work.game, work.sim, asleep, to(asleep, 1, 15), doing('work', event));
    expect(slept.fact('life.need', { need: 'rest' })).toBeGreaterThan(25);
    expect(slept.of('job/event')).toEqual([]);
    // Up since Monday morning, it does.
    const tired = play(work.game, work.sim, rested, to(rested, 1, 15), doing('work', event));
    expect(tired.of('job/event').map((b) => b.event)).toEqual(['nodding-off']);
  });
});
