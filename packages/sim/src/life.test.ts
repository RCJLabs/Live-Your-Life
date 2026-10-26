import { type Action, createRecordStore, type GameState, type SimContext, type TimeSlice } from '@eb/core';
import { describe, expect, it } from 'vitest';
import {
  advance,
  play,
  refusal as refusalIn,
  signUp,
  sliceSim,
  TEST_COOK,
  testCook,
  tickOf,
  withCareer,
} from '../test/slice.ts';
import { lifeSim } from './content.ts';
import { COSTS, START_CASH } from './dials.ts';
import { createLifeGame } from './game.ts';
import { payFor } from './job/withholding.ts';

const sim = lifeSim();
const broke: SimContext = { content: createRecordStore({ resource: { cash: { name: 'Cash', start: 0, min: 0 } } }) };
const game = createLifeGame({ events: false, people: 0 });
// The default life starts on Monday 2 June 2025 at 07:00.
const fresh = (context: SimContext = sim) => game.init('life', context);
const tick = (state: GameState) => (state.time as TimeSlice).tick;
const fact = (state: GameState, id: string, args?: Record<string, unknown>, context = sim) =>
  game.fact(state, id, args, context);
const need = (state: GameState, which: string) => fact(state, 'life.need', { need: which });
const cash = (state: GameState) => fact(state, 'economy.amount', { resource: 'cash' });
const doing = (activity: string, minutes: number): Action => ({ type: 'life/do', activity, minutes });

function run(state: GameState, ...actions: Action[]) {
  let current = state;
  const beats = [];
  for (const action of actions) {
    const step = game.reduce(current, action, sim);
    expect(step.accepted, `${action.type} ${JSON.stringify(action)} accepted`).toBe(true);
    beats.push(...step.beats);
    current = step.state;
  }
  return { state: current, beats };
}

const refusal = (state: GameState, action: Action, context = sim) => {
  const step = game.reduce(state, action, context);
  expect(step.accepted).toBe(false);
  expect(step.state).toBe(state);
  return step.beats[0]?.reason;
};

describe('doing things', () => {
  it('eats a meal: half an hour, four dollars, and food up by half', () => {
    const { state, beats } = run(fresh(), doing('eat', 30));
    expect(tick(state)).toBe(30);
    expect(cash(state)).toBe(START_CASH - COSTS.eat);
    expect(need(state, 'food')).toBe(100);
    expect(beats).toContainEqual({ type: 'life/started', activity: 'eat', minutes: 30 });
    expect(beats).toContainEqual({ type: 'life/ended', activity: 'eat', minutes: 30 });
  });

  it('sleeps eight hours, and is awake again when its timer ends it', () => {
    const { state } = run(fresh(), doing('sleep', 480));
    expect(tick(state)).toBe(480);
    expect(need(state, 'rest')).toBe(100);
    expect(fact(state, 'life.activity')).toBe('awake');
    expect(fact(state, 'time.pending', { timer: 'activity' })).toBe(false);
  });

  it('lets time pass at awake rates without writing to the life slice', () => {
    const start = fresh();
    const { state } = run(start, { type: 'time/advance', hours: 2 }, { type: 'time/elapse', ms: 1500 });
    expect(state.life).toBe(start.life);
    // Food starts at 60% and falls 6.25% an hour: 47.1875% after 2 hours and 3 minutes.
    expect(need(state, 'food')).toBe(47);
  });

  it('names the most pressing need', () => {
    expect(fact(fresh(), 'life.lowest')).toBe('food');
  });

  it('does not offer, and refuses, a meal it cannot pay for', () => {
    const start = fresh(broke);
    const offered = game.options(start, broke).filter((a) => a.type === 'life/do');
    expect(offered.map((a) => a.activity)).not.toContain('eat');
    expect(offered.map((a) => a.activity)).toContain('sleep');
    expect(refusal(start, doing('eat', 30), broke)).toBe('cant-afford');
  });

  it.each([
    { action: doing('dance', 30), reason: 'bad-activity' },
    { action: doing('eat', 0), reason: 'bad-minutes' },
    { action: doing('eat', 24 * 60 + 1), reason: 'bad-minutes' },
    { action: doing('eat', 2.5), reason: 'bad-minutes' },
    { action: { type: 'life/do', activity: 'eat', minutes: '30' }, reason: 'bad-minutes' },
  ])('refuses $action.activity for $action.minutes minutes: $reason', ({ action, reason }) => {
    expect(refusal(fresh(), action)).toBe(reason);
  });
});

describe('work', () => {
  // The test cook, signed up for Tuesday's shift, 15:00 to 23:00.
  const cook = createLifeGame({ events: false, people: 0, career: TEST_COOK });
  const cookSim = sliceSim(withCareer(testCook()));
  const signed = play(cook, cookSim, cook.init('work', cookSim), signUp(1)).state;
  const tuesdayAt = (hour: number) => play(cook, cookSim, signed, advance(tickOf(1, hour))).state;

  it('is not offered off shift, and is refused there', () => {
    for (const [g, s, state] of [
      [game, sim, fresh()],
      [cook, cookSim, signed],
    ] as const) {
      expect(g.options(state, s).some((a) => a.activity === 'work')).toBe(false);
      expect(refusalIn(g, s, state, doing('work', 60))).toBe('not-on-shift');
    }
  });

  it('is offered for the rest of the shift, and refused past its end', () => {
    expect(cook.options(tuesdayAt(15), cookSim)).toContainEqual(doing('work', 480));
    expect(cook.options(tuesdayAt(19), cookSim)).toContainEqual(doing('work', 240));
    expect(refusalIn(cook, cookSim, tuesdayAt(19), doing('work', 241))).toBe('past-the-shift');
  });

  it('hands the minutes worked to the job when the shift ends', () => {
    const { state, fact: read } = play(cook, cookSim, tuesdayAt(15), doing('work', 480));
    expect(read('clock.hour')).toBe(23);
    expect(read('job.unpaid')).toBe(payFor(480, testCook().wage));
    expect(state.life).toMatchObject({ activity: 'awake' });
    expect(read('job.on-shift')).toBe(false);
  });
});
