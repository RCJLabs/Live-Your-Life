import type { GameState, SimContext } from '@eb/core';
import { describe, expect, it } from 'vitest';
import {
  advance,
  doing,
  lineCook,
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
import { daysFrom, todayOf } from '../job/days.ts';
import type { JobSlice } from '../job/state.ts';
import { works } from './person.ts';
import type { Crew } from './records.ts';
import type { TiesSlice } from './state.ts';

// Monday 2 June 2025, 07:00, is tick 0. The test cook is offered every day's one shift, 15:00 to 23:00.
const game = createLifeGame({ people: 0, career: TEST_COOK });
const crew = lineCook().crew as Crew;
const simWith = (changes: Partial<Crew>): SimContext =>
  sliceSim(withCareer(testCook({ crew: { ...crew, ...changes } })));
const sim = sliceSim(withCareer(testCook()));
const asking = simWith({ asks: 100 });

const ties = (state: GameState) => state.ties as TiesSlice;
const job = (state: GameState) => state.job as JobSlice;
const tick = (state: GameState) => (state.time as { tick: number }).tick;
const at = (state: GameState, day: number, hour: number, minute = 0) =>
  advance(tickOf(day, hour, minute) - tick(state));
const today = (state: GameState, on: SimContext) => todayOf({ fact: (id) => game.fact(state, id, undefined, on) });

/** The days from `from` to `to` they work by their week, before any favour. */
function theirDays(state: GameState, on: SimContext, from: number, to: number, working = true): number[] {
  const who = ties(state).coworker;
  if (!who) throw new Error('nobody beside you');
  return daysFrom(from, to).filter((day) => works(who, crew, today(state, on), day) === working);
}

/** A life asked a favour at the first midnight, with the clock just past it. */
function asked(seed: string) {
  const start = game.init(seed, asking);
  const after = play(game, asking, start, at(start, 1, 0, 1));
  const request = ties(after.state).request;
  if (!request) throw new Error(`${seed}: nothing asked`);
  return { ...after, request };
}

describe('favours they ask of you (D42)', () => {
  it('asks at midnight for a shift of theirs two to six days on, when you are free that day', () => {
    for (let i = 0; i < 40; i++) {
      const { state, request, of } = asked(`ask-${i}`);
      expect(of('ties/asked')).toEqual([{ type: 'ties/asked', ...request }]);
      expect(request.day).toBeGreaterThanOrEqual(3);
      expect(request.day).toBeLessThanOrEqual(7);
      expect(theirDays(state, asking, request.day, request.day)).toEqual([request.day]);
      expect(game.fact(state, 'job.free', { day: request.day }, asking)).toBe(true);
      expect(game.fact(state, 'ties.asking', undefined, asking)).toBe(true);
    }
  });

  it('asks only for a day you are free: not one you work, nor past your week', () => {
    let asks = 0;
    for (let i = 0; i < 40; i++) {
      const start = game.init(`full-${i}`, asking);
      // Tuesday to Saturday: a full week, so only next Monday, day 7, is free.
      const full = play(game, asking, start, ...[1, 2, 3, 4, 5].map(signUp)).state;
      const request = ties(play(game, asking, full, at(full, 1, 0, 1)).state).request;
      if (!request) continue;
      asks++;
      expect(request.day).toBe(7);
    }
    expect(asks).toBeGreaterThan(10);
  });

  it('never asks when its chance is nil, and about one day in ten at the line cook’s', () => {
    const never = simWith({ asks: 0 });
    const start = game.init('never', never);
    expect(play(game, never, start, at(start, 60, 0, 1)).of('ties/asked')).toEqual([]);
    let days = 0;
    let asks = 0;
    for (let i = 0; i < 40; i++) {
      const life = game.init(`often-${i}`, sim);
      // No answers, so a request waits days; count the days nothing was waiting.
      const run = play(game, sim, life, at(life, 28, 0, 1));
      asks += run.of('ties/asked').length;
      days += 28;
    }
    // Ten in a hundred of the days with nothing waiting: fewer of all days, and more than none.
    expect(asks / days).toBeGreaterThan(0.04);
    expect(asks / days).toBeLessThan(0.1);
  });

  it('a yes: the shift is yours and counts in your week, they are off it, and they remember', () => {
    const { state, request } = asked('yes');
    expect(game.options(state, asking).filter((a) => a.type === 'ties/answer')).toEqual([
      { type: 'ties/answer', answer: 'yes' },
      { type: 'ties/answer', answer: 'no' },
    ]);
    const yes = play(game, asking, state, { type: 'ties/answer', answer: 'yes' });
    expect(yes.of('job/took-shift')).toEqual([{ type: 'job/took-shift', ...request }]);
    expect(job(yes.state).signed.map((s) => [s.day, s.shift])).toEqual([[request.day, request.shift]]);
    expect(yes.fact('job.free', { day: request.day })).toBe(false);
    expect(ties(yes.state)).toMatchObject({ request: null, off: [request.day], regard: 66 });
    expect(ties(yes.state).memory).toEqual([{ act: 'covered-for-them', day: 1, times: 1 }]);
    expect(refusal(game, asking, yes.state, { type: 'ties/answer', answer: 'yes' })).toBe('nothing-asked');
  });

  it('a no, or no answer by the midnight before, is remembered against you, and not sooner', () => {
    const { state } = asked('no');
    const no = play(game, asking, state, { type: 'ties/answer', answer: 'no' });
    expect(ties(no.state)).toMatchObject({ request: null, off: [], regard: 44 });
    expect(job(no.state).signed).toEqual([]);
    expect(refusal(game, asking, state, { type: 'ties/answer', answer: 'maybe' })).toBe('bad-answer');

    const quiet = asked('lapse');
    const eve = quiet.request.day - 1;
    const before = play(game, asking, quiet.state, at(quiet.state, eve - 1, 23, 59));
    expect(ties(before.state).request).toEqual(quiet.request);
    const lapsed = play(game, asking, before.state, at(before.state, eve, 0, 1));
    expect(lapsed.of('ties/remembered')[0]).toEqual({ type: 'ties/remembered', act: 'never-answered', regard: 42 });
  });

  it('offers only a no when you can no longer take the shift', () => {
    // A day posted at hire, Tuesday to Sunday, so it can still be signed up for.
    const seed = Array.from({ length: 40 }, (_, i) => `busy-${i}`).find((s) => asked(s).request.day <= 6) as string;
    const { state, request } = asked(seed);
    const busy = play(game, asking, state, signUp(request.day)).state;
    expect(game.options(busy, asking).filter((a) => a.type === 'ties/answer')).toEqual([
      { type: 'ties/answer', answer: 'no' },
    ]);
    expect(refusal(game, asking, busy, { type: 'ties/answer', answer: 'yes' })).toBe('already-signed-up');
  });
});

/** A life signed up for a shift on one of their days off, before it starts. */
function offDay(seed: string, on: SimContext = sim) {
  const start = game.init(seed, on);
  const day = theirDays(start, on, 1, 6, false)[0] as number;
  return { state: play(game, on, start, signUp(day)).state, day };
}

describe('favours you ask of them (D42, D43)', () => {
  it('lets you ask once a shift, only on their days off, at the odds the preview shows', () => {
    let given = 0;
    for (let i = 0; i < 60; i++) {
      const { state, day } = offDay(`cover-${i}`);
      const asks = game.options(state, sim).filter((a) => a.type === 'ties/ask-cover');
      expect(asks).toEqual([{ type: 'ties/ask-cover', day }]);
      const [preview] = game.preview(state, [{ effect: 'cover-ask', day }], sim);
      expect(preview?.chance).toBe(50);
      const standing = game.fact(state, 'job.standing', undefined, sim);
      const ask = play(game, sim, state, { type: 'ties/ask-cover', day });
      const rolled = ask.of('logic/rolled')[0];
      const yes = ask.of('ties/covered').length === 1;
      expect(rolled?.outcome === 0 ? rolled.chance : 100 - (rolled?.chance as number)).toBe(50);
      expect(rolled?.outcome).toBe(yes ? 0 : 1);
      expect(ask.fact('job.standing')).toBe(standing);
      if (yes) {
        given++;
        expect(job(ask.state).signed).toEqual([]);
        expect(ask.of('job/covered')).toEqual([{ type: 'job/covered', day }]);
        expect(ties(ask.state).memory).toEqual([{ act: 'asked-a-favour', day: 0, times: 1 }]);
      } else {
        expect(job(ask.state).signed.map((s) => s.day)).toEqual([day]);
        expect(ask.of('ties/refused')).toEqual([{ type: 'ties/refused', day }]);
      }
      expect(refusal(game, sim, ask.state, { type: 'ties/ask-cover', day })).toBe('not-askable');
    }
    expect(given).toBeGreaterThan(15);
    expect(given).toBeLessThan(45);
  });

  it('moves the odds with their regard, within 5 and 95', () => {
    const { state, day } = offDay('regard');
    const odds = (regard: number) => {
      const set = { ...state, ties: { ...ties(state), regard } };
      return game.preview(set, [{ effect: 'cover-ask', day }], sim)[0]?.chance;
    };
    expect([odds(0), odds(25), odds(50), odds(80), odds(100)]).toEqual([5, 25, 50, 80, 95]);
  });

  it("won't ask on a day they work, a day gone, or one not yours", () => {
    const start = game.init('their-day', sim);
    const theirs = theirDays(start, sim, 1, 6)[0] as number;
    const signed = play(game, sim, start, signUp(theirs)).state;
    expect(refusal(game, sim, signed, { type: 'ties/ask-cover', day: theirs })).toBe('not-askable');
    expect(refusal(game, sim, start, { type: 'ties/ask-cover', day: 3 })).toBe('not-askable');
    const { state, day } = offDay('started');
    const started = play(game, sim, state, at(state, day, 15)).state;
    expect(refusal(game, sim, started, { type: 'ties/ask-cover', day })).toBe('not-askable');
  });
});

describe('time beside them (D41, D42)', () => {
  /** A shift worked whole on a day, settled. */
  function worked(seed: string, beside: boolean) {
    const start = game.init(seed, sim);
    const day = theirDays(start, sim, 1, 6, beside)[0] as number;
    const signed = play(game, sim, start, signUp(day)).state;
    const before = play(game, sim, signed, at(signed, day, 10));
    expect(before.fact('ties.beside')).toBe(false);
    const there = play(game, sim, before.state, at(before.state, day, 15)).state;
    const on = play(game, sim, there, doing('work', 60));
    expect(on.fact('ties.beside')).toBe(beside);
    return play(game, sim, on.state, doing('work', 420), at(on.state, day, 23, 2));
  }

  it('grows familiarity with the minutes worked beside them, and only those', () => {
    const together = worked('together', true);
    expect(ties(together.state).together).toBe(480);
    // 100 × 480 ÷ (480 + 2,400), rounded down.
    expect(together.fact('ties.familiarity')).toBe(16);
    const apart = worked('apart', false);
    expect(ties(apart.state).together).toBe(0);
    expect(apart.fact('ties.familiarity')).toBe(0);
  });

  it('remembers you late or missing on a shift of theirs, and not on one alone', () => {
    for (const beside of [true, false]) {
      const start = game.init(`late-${beside}`, sim);
      const day = theirDays(start, sim, 1, 6, beside)[0] as number;
      const signed = play(game, sim, start, signUp(day)).state;
      const late = play(game, sim, signed, at(signed, day, 15, 30), doing('work', 60));
      expect(late.of('job/late').length).toBe(1);
      const missed = play(game, sim, signed, at(signed, day + 1, 0, 1));
      expect(missed.of('job/no-show').length).toBe(1);
      expect(ties(late.state).memory.map((m) => m.act)).toEqual(beside ? ['kept-them-waiting'] : []);
      expect(ties(missed.state).memory.map((m) => m.act)).toEqual(beside ? ['left-them-alone'] : []);
    }
  });
});
