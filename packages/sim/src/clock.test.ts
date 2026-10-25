import { type Action, createSession, type GameState, stateHash, type TimeSlice } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { minutesUntil } from './clock.ts';
import { lifeSim } from './content.ts';
import { createLifeGame } from './game.ts';

const sim = lifeSim();
const game = createLifeGame({ people: 0 });
const fresh = () => game.init('m0-1', sim);
const tick = (state: GameState) => (state.time as TimeSlice).tick;
const fact = (state: GameState, id: string) => game.fact(state, id, undefined, sim);

function run(state: GameState, ...actions: Action[]) {
  let current = state;
  const beats = [];
  for (const action of actions) {
    const step = game.reduce(current, action, sim);
    expect(step.accepted, `${action.type} accepted`).toBe(true);
    beats.push(...step.beats);
    current = step.state;
  }
  return { state: current, beats };
}

describe('minutesUntil', () => {
  it('counts forward to the next time of day, tomorrow if need be', () => {
    expect(minutesUntil(7 * 60, 16 * 60)).toBe(9 * 60);
    expect(minutesUntil(23 * 60, 6 * 60)).toBe(7 * 60);
    expect(minutesUntil(7 * 60, 7 * 60)).toBe(24 * 60);
  });
});

describe('the clock', () => {
  it("allows the time, clock, life, home, job, market, trade, circle, ties, law, health and you actions out in the world, and no shift event's choice", () => {
    expect(game.allowedActions(fresh())).toEqual([
      'circle/ask-in',
      'circle/ask-out',
      'circle/break-up',
      'circle/carries',
      'circle/drawn-to',
      'circle/file-divorce',
      'circle/go-on-date',
      'circle/go-out',
      'circle/home',
      'circle/licence',
      'circle/marry',
      'circle/plan-date',
      'circle/propose',
      'circle/separate',
      'circle/stay-night',
      'circle/talk',
      'clock/wait-until',
      'deal/buy',
      'deal/corner',
      'deal/front',
      'deal/join',
      'deal/pay-back',
      'deal/recruit',
      'family/care',
      'family/continue',
      'family/end',
      'family/pay-bill',
      'health/pay-bill',
      'health/rest',
      'health/see-doctor',
      'home/pay-owed',
      'job/drop',
      'job/quit',
      'job/sign-up',
      'law/attend',
      'law/check-in',
      'law/eat',
      'law/pay',
      'law/sell',
      'law/take',
      'life/do',
      'market/accept',
      'market/apply',
      'market/decline',
      'ties/answer',
      'ties/ask-cover',
      'time/advance',
      'time/elapse',
      'you/commute',
    ]);
  });

  it('reads the hour and minute of the day', () => {
    const { state } = run(fresh(), { type: 'time/advance', minutes: 95 });
    expect([fact(state, 'clock.hour'), fact(state, 'clock.minute')]).toEqual([8, 35]);
  });

  it('waits until a time of day', () => {
    const { state, beats } = run(fresh(), { type: 'clock/wait-until', hour: 16 });
    expect(tick(state)).toBe(9 * 60);
    expect([fact(state, 'clock.hour'), fact(state, 'clock.minute')]).toEqual([16, 0]);
    expect(beats).toContainEqual({ type: 'time/passed', from: 0, to: 9 * 60 });
  });

  it('waits past midnight, and a whole day when it is that time already', () => {
    const night = run(fresh(), { type: 'clock/wait-until', hour: 6, minute: 30 }).state;
    expect([fact(night, 'time.day'), fact(night, 'clock.hour'), fact(night, 'clock.minute')]).toEqual([1, 6, 30]);
    const again = run(night, { type: 'clock/wait-until', hour: 6, minute: 30 }).state;
    expect(tick(again) - tick(night)).toBe(24 * 60);
  });

  it.each([{ hour: 24 }, { hour: -1 }, { hour: 7.5 }, { hour: '7' }, { hour: 7, minute: 60 }, { minute: 30 }])(
    'refuses a time of day that does not exist: %o',
    (payload) => {
      const start = fresh();
      const step = game.reduce(start, { type: 'clock/wait-until', ...payload }, sim);
      expect(step.accepted).toBe(false);
      expect(step.state).toBe(start);
      expect(step.beats).toEqual([{ type: 'rejected', action: 'clock/wait-until', reason: 'bad-time' }]);
    },
  );

  it('offers the start of each part of the day, and accepts every offer', () => {
    const offered = game.options(fresh(), sim).filter((a) => a.type === 'clock/wait-until');
    expect(offered.map((a) => [a.hour, a.minute])).toEqual([
      [6, 0],
      [12, 0],
      [18, 0],
      [22, 0],
    ]);
    for (const action of offered) expect(game.reduce(fresh(), action, sim).accepted).toBe(true);
  });
});

describe('wall-clock time', () => {
  it('counts half a second a game minute, carrying what is short of a minute', () => {
    expect(tick(run(fresh(), { type: 'time/elapse', ms: 1000 }).state)).toBe(2);
    const quarters = run(fresh(), ...Array.from({ length: 6 }, () => ({ type: 'time/elapse', ms: 250 })));
    expect(tick(quarters.state)).toBe(3);
  });

  it('drops what is past the cap, and says so', () => {
    const { state, beats } = run(fresh(), { type: 'time/elapse', ms: 5000 });
    expect(tick(state)).toBe(4);
    expect(beats).toContainEqual({ type: 'time/capped', ms: 5000, counted: 2000 });
  });

  it('refuses a clock that went back', () => {
    const step = game.reduce(fresh(), { type: 'time/elapse', ms: -16 }, sim);
    expect(step.accepted).toBe(false);
    expect(step.beats[0]).toMatchObject({ reason: 'clock-went-back' });
  });
});

describe('replays', () => {
  const day: Action[] = [
    { type: 'time/elapse', ms: 1700 },
    { type: 'clock/wait-until', hour: 22 },
    { type: 'time/elapse', ms: 16 },
    { type: 'time/advance', hours: 3 },
    { type: 'clock/wait-until', hour: 6, minute: 45 },
  ];

  it('reaches the same state from the same seed and actions', () => {
    expect(stateHash(run(fresh(), ...day).state)).toBe(stateHash(run(fresh(), ...day).state));
  });

  it('reaches the session state by replaying its log from its start', () => {
    const session = createSession(game, sim, fresh());
    for (const action of day) session.dispatch(action);
    let replayed = session.start;
    for (const action of session.log) replayed = game.reduce(replayed, action, sim).state;
    expect(stateHash(replayed)).toBe(stateHash(session.state));
  });
});
