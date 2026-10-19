import { type Action, type Beat, createRecordStore, type GameState, type SimContext } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_START, daysToNextMonth, minutesToNextMonth, minutesToWeekday } from './calendar.ts';
import { lifeSim } from './content.ts';
import { RENT, START_CASH } from './dials.ts';
import { createLifeGame } from './game.ts';
import { payFor } from './job.ts';

const game = createLifeGame();
const withCash = (cents: number): SimContext => ({
  content: createRecordStore({ resource: { cash: { name: 'Cash', start: cents, min: 0 } } }),
});

function play(sim: SimContext, ...actions: Action[]) {
  let state: GameState = game.init('money', sim);
  const beats: Beat[] = [];
  for (const action of actions) {
    const step = game.reduce(state, action, sim);
    expect(step.accepted, `${JSON.stringify(action)} accepted`).toBe(true);
    beats.push(...step.beats);
    state = step.state;
  }
  const fact = (id: string, args?: Record<string, unknown>) => game.fact(state, id, args, sim);
  return { state, beats, fact, cash: () => fact('economy.amount', { resource: 'cash' }) };
}

const DAY = 24 * 60;
const waitUntil = (hour: number, minute = 0): Action => ({ type: 'clock/wait-until', hour, minute });
const shift: Action = { type: 'life/do', activity: 'work', minutes: 480 };

describe('the start', () => {
  it('finds the first Friday 23:30 and the next 1st from Monday 2 June 2025, 07:00', () => {
    expect(minutesToWeekday(DEFAULT_START, 'friday', 23 * 60 + 30)).toBe(4 * DAY + 16 * 60 + 30);
    expect(minutesToNextMonth(DEFAULT_START)).toBe(29 * DAY - 7 * 60);
    expect(daysToNextMonth('december', 31)).toBe(1);
    const { fact } = play(lifeSim());
    expect(fact('time.left', { timer: 'payday' })).toBe(4 * DAY + 16 * 60 + 30);
    expect(fact('time.left', { timer: 'rent' })).toBe(29 * DAY - 7 * 60);
  });

  it('waits a week for a payday that is due now', () => {
    expect(minutesToWeekday({ ...DEFAULT_START, day: 6, hour: 23, minute: 30 }, 'friday', 23 * 60 + 30)).toBe(7 * DAY);
  });
});

describe('payday', () => {
  it('pays every minute worked since the last one, on Friday at 23:30', () => {
    const week = [
      waitUntil(15),
      waitUntil(15),
      shift,
      waitUntil(15),
      shift,
      waitUntil(15),
      shift,
      waitUntil(15),
      shift,
    ];
    const { beats, cash, fact } = play(lifeSim(), ...week, waitUntil(23, 45));
    expect(beats).toContainEqual({ type: 'job/paid', cents: payFor(4 * 480) });
    expect(payFor(4 * 480)).toBe(480_00);
    expect(cash()).toBe(START_CASH + 480_00);
    expect(fact('job.unpaid')).toBe(0);
  });

  it('pays nothing for a week not worked, and comes again a week later', () => {
    const { beats, cash } = play(lifeSim(), { type: 'time/advance', days: 12 });
    expect(beats.filter((b) => b.type === 'job/paid')).toEqual([
      { type: 'job/paid', cents: 0 },
      { type: 'job/paid', cents: 0 },
    ]);
    expect(cash()).toBe(START_CASH);
  });
});

describe('rent', () => {
  const fired = (beats: Beat[]) => beats.filter((b) => b.type === 'time/fired' && b.timer === 'rent').map((b) => b.at);

  it('is paid at midnight on the 1st when the cash is there', () => {
    const { beats, cash, fact } = play(withCash(1000_00), { type: 'time/advance', days: 29 });
    expect(beats).toContainEqual({ type: 'home/rent', cents: RENT, paid: true });
    expect(cash()).toBe(1000_00 - RENT);
    expect(fact('home.owed')).toBe(0);
  });

  it('is owed, not refused, when it is not, and the month still turns', () => {
    const { beats, cash, fact } = play(lifeSim(), { type: 'time/advance', days: 29 });
    expect(beats).toContainEqual({ type: 'home/rent', cents: RENT, paid: false });
    expect(cash()).toBe(START_CASH);
    expect(fact('home.owed')).toBe(RENT);
    // Due again at midnight on 1 August: 31 days after 1 July, which was 7 hours ago.
    expect(fact('time.left', { timer: 'rent' })).toBe(31 * DAY - 7 * 60);
  });

  it('falls due on the 1st of every month', () => {
    const { beats } = play(withCash(5000_00), { type: 'time/advance', days: 100 });
    const july = 29 * DAY - 7 * 60;
    expect(fired(beats)).toEqual([july, july + 31 * DAY, july + 62 * DAY]);
  });

  it('can be paid off once the cash covers all of it, and only then', () => {
    const owing = [{ type: 'time/advance', days: 29 }, waitUntil(15), shift] as Action[];
    const before = play(withCash(500_00), ...owing);
    expect(before.fact('home.owed')).toBe(RENT);
    expect(game.options(before.state, withCash(500_00)).some((a) => a.type === 'home/pay-owed')).toBe(false);
    // The Tuesday shift is paid on Friday: $500 + $120 covers the $550 owed.
    const after = play(withCash(500_00), ...owing, { type: 'time/advance', days: 4 }, { type: 'home/pay-owed' });
    expect(after.fact('home.owed')).toBe(0);
    expect(after.cash()).toBe(500_00 + 120_00 - RENT);
    expect(after.beats).toContainEqual({ type: 'home/paid-owed', cents: RENT });
    const again = game.reduce(after.state, { type: 'home/pay-owed' }, withCash(500_00));
    expect(again.accepted).toBe(false);
    expect(again.beats[0]).toMatchObject({ reason: 'nothing-owed' });
  });
});
