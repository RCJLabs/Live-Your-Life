import { type Action, type Beat, createRecordStore, type GameState, type SimContext } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { signUp, TEST_COOK, testCook, withCareer } from '../test/slice.ts';
import { DEFAULT_START, daysToNextMonth, minutesToMidnight, minutesToNextMonth } from './calendar.ts';
import { lifeSim } from './content.ts';
import { RENT, START_CASH } from './dials.ts';
import { createLifeGame } from './game.ts';
import { climateOf, gasBill } from './season/climate.ts';

const game = createLifeGame({ events: false, unlocked: true, people: 0 });
const cook = createLifeGame({ events: false, unlocked: true, people: 0, career: TEST_COOK });
/** The test cook's records, and cash to start with; `bills` false leaves out the month's other bills (D140). */
const withCash = (cents: number, bills = true): SimContext => ({
  content: createRecordStore({
    ...withCareer(testCook()),
    resource: { cash: { name: 'Cash', start: cents, min: 0 } },
    ...(bills ? {} : { bill: {} }),
  }),
});
/** A bill on 1 July for a life begun on 2 June: 29 of June's 30 days (D140). */
const firstMonth = (cents: number): number => Math.floor((cents * 29) / 30);
/** The month's other bills on 1 July, in cents. */
const billsOf = (sim: SimContext): number =>
  sim.content
    .ids('bill')
    .reduce((n, id) => n + firstMonth(sim.content.get<{ cents: number }>('bill', id)?.cents ?? 0), 0);

function play(sim: SimContext, ...actions: Action[]) {
  return playIn(game, sim, ...actions);
}

function playIn(g: typeof game, sim: SimContext, ...actions: Action[]) {
  let state: GameState = g.init('money', sim);
  const beats: Beat[] = [];
  for (const action of actions) {
    const step = g.reduce(state, action, sim);
    expect(step.accepted, `${JSON.stringify(action)} accepted`).toBe(true);
    beats.push(...step.beats);
    state = step.state;
  }
  const fact = (id: string, args?: Record<string, unknown>) => g.fact(state, id, args, sim);
  return { state, beats, fact, cash: () => fact('economy.amount', { resource: 'cash' }) };
}

const DAY = 24 * 60;
const waitUntil = (hour: number, minute = 0): Action => ({ type: 'clock/wait-until', hour, minute });

describe('the start', () => {
  it('finds the first midnight and the next 1st from Monday 2 June 2025, 07:00', () => {
    expect(minutesToMidnight(DEFAULT_START)).toBe(17 * 60);
    expect(minutesToNextMonth(DEFAULT_START)).toBe(29 * DAY - 7 * 60);
    expect(daysToNextMonth('december', 31)).toBe(1);
    const { fact } = play(lifeSim());
    expect(fact('time.left', { timer: 'midnight' })).toBe(17 * 60);
    expect(fact('time.left', { timer: 'rent' })).toBe(29 * DAY - 7 * 60);
  });

  it('starts with the cash, and no job unless hired into one', () => {
    expect(play(lifeSim()).cash()).toBe(START_CASH);
    expect(play(lifeSim()).fact('job.employed')).toBe(false);
    expect(playIn(cook, withCash(START_CASH)).fact('job.employed')).toBe(true);
  });
});

describe('rent', () => {
  const fired = (beats: Beat[]) => beats.filter((b) => b.type === 'time/fired' && b.timer === 'rent').map((b) => b.at);

  it('is paid at midnight on the 1st when the cash is there', () => {
    const sim = withCash(1000_00);
    const { beats, cash, fact } = play(sim, { type: 'time/advance', days: 29 });
    expect(beats).toContainEqual({ type: 'home/rent', cents: RENT, paid: true });
    // June's gas comes with July's rent (D130), and the month's other bills (D140).
    const june = gasBill(climateOf(withCash(0).content), 6);
    expect(beats).toContainEqual({ type: 'home/gas', cents: june, paid: true });
    expect(beats).toContainEqual({ type: 'home/bill', bill: 'electricity', cents: firstMonth(76_30), paid: true });
    expect(beats.filter((b) => b.type === 'home/bill')).toHaveLength(sim.content.ids('bill').length);
    expect(cash()).toBe(1000_00 - RENT - june - billsOf(sim));
    expect(fact('home.owed')).toBe(0);
  });

  it('owes the gas and the other bills it can’t pay, as it owes the rent', () => {
    const sim = withCash(RENT);
    const { beats, cash, fact } = play(sim, { type: 'time/advance', days: 29 });
    const june = gasBill(climateOf(sim.content), 6);
    expect(beats).toContainEqual({ type: 'home/bill', bill: 'phone', cents: firstMonth(40_00), paid: false });
    expect(cash()).toBe(0);
    expect(fact('home.owed')).toBe(june + billsOf(sim));
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
    // Owed on Tuesday 1 July; a shift on Wednesday the 2nd, paid on Friday the 4th, covers it.
    // Without the other bills, which a week's pay couldn't cover as well.
    const sim = withCash(500_00, false);
    const owing = [
      { type: 'time/advance', days: 29 },
      signUp(30),
      waitUntil(15),
      waitUntil(15),
      { type: 'life/do', activity: 'work', minutes: 480 },
    ] as Action[];
    const before = playIn(cook, sim, ...owing);
    expect(before.fact('home.owed')).toBe(RENT);
    expect(cook.options(before.state, sim).some((a) => a.type === 'home/pay-owed')).toBe(false);
    const after = playIn(cook, sim, ...owing, { type: 'time/advance', days: 2 }, { type: 'home/pay-owed' });
    const paid = after.beats.find((b) => b.type === 'job/paid') as Beat & { net: number };
    expect(paid.net).toBe(107_49);
    expect(after.fact('home.owed')).toBe(0);
    // Short of the rent, but not of June's gas, which was paid (D130).
    expect(after.cash()).toBe(500_00 + paid.net - RENT - gasBill(climateOf(sim.content), 6));
    expect(after.beats).toContainEqual({ type: 'home/paid-owed', cents: RENT });
    const again = cook.reduce(after.state, { type: 'home/pay-owed' }, sim);
    expect(again.accepted).toBe(false);
    expect(again.beats[0]).toMatchObject({ reason: 'nothing-owed' });
  });
});
