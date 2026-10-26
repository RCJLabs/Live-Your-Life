import type { GameState, TimeSlice } from '@eb/core';
import { describe, expect, it } from 'vitest';
import {
  advance,
  doing,
  lineCook,
  play,
  refusal,
  signUp,
  sliceGame,
  sliceSim,
  TEST_COOK,
  testCook,
  tickOf,
  withCareer,
} from '../../test/slice.ts';
import { ALARM_MINUTES, START_CASH } from '../dials.ts';
import { createLifeGame } from '../game.ts';
import { ALARM_MARGIN, LONGEST_WALK } from '../you.ts';
import { weeklyCount } from './days.ts';
import { taxOf } from './records.ts';
import type { JobSlice } from './state.ts';
import { paycheck, payFor } from './withholding.ts';

// Monday 2 June 2025, 07:00, is tick 0. The test cook is offered every day's one shift, 15:00 to 23:00.
const game = createLifeGame({ events: false, unlocked: true, people: 0, career: TEST_COOK });
const sim = sliceSim(withCareer(testCook()));
const fresh = (): GameState => game.init('shifts', sim);
const job = (state: GameState) => state.job as JobSlice;
const toTick = (state: GameState, tick: number) => advance(tick - (state.time as { tick: number }).tick);
const at = (state: GameState, day: number, hour: number, minute = 0) => toTick(state, tickOf(day, hour, minute));
const standingAfter = (state: GameState) => play(game, sim, state).fact('job.standing');
/** The shifts' timers set now, by name. */
const shiftTimers = (state: GameState) =>
  (state.time as TimeSlice).timers.map((t) => t.id).filter((id) => id.startsWith('shift-'));

/** Signed up for `day`, then at its start, with the clock there. */
function atShift(day: number, minute = 0) {
  const signed = play(game, sim, fresh(), signUp(day)).state;
  return play(game, sim, signed, at(signed, day, 15, minute)).state;
}

/** Past the end of a day's shift, once it has been settled. */
const afterShift = (state: GameState, day: number) => play(game, sim, state, at(state, day, 23, 2));

describe('postings', () => {
  it('posts the rest of the week at hire, from tomorrow, one shift a day', () => {
    expect(job(fresh()).posted).toEqual([1, 2, 3, 4, 5, 6].map((day) => ({ day, shift: 'evening' })));
    const cook = sliceGame();
    const kinds = new Set<string>();
    const days = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const posted = job(cook.init(`hire-${i}`, sliceSim())).posted;
      // Five a week at standing 50, so four of the six days left.
      expect(posted.length).toBe(4);
      expect(new Set(posted.map((p) => p.day)).size).toBe(4);
      for (const p of posted) {
        kinds.add(p.shift);
        days.add(p.day);
      }
    }
    expect([...kinds].sort()).toEqual(['breakfast', 'dinner']);
    expect([...days].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("posts next week's on Thursday at midnight, and clears each day's as it comes", () => {
    const start = fresh();
    const wednesday = play(game, sim, start, at(start, 2, 23, 59));
    expect(job(wednesday.state).posted.map((p) => p.day)).toEqual([3, 4, 5, 6]);
    const thursday = play(game, sim, wednesday.state, advance(1));
    expect(thursday.of('job/posted')).toEqual([{ type: 'job/posted', days: [7, 8, 9, 10, 11, 12, 13] }]);
    expect(job(thursday.state).posted.map((p) => p.day)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('offers three shifts a week at standing 0, five at 50 and six at 100', () => {
    expect([0, 50, 100].map((s) => weeklyCount(lineCook(), s))).toEqual([3, 5, 6]);
  });
});

describe('signing up', () => {
  it('takes what is posted, one a day and five a week, and offers only that', () => {
    const start = fresh();
    expect(refusal(game, sim, start, signUp(0))).toBe('not-posted');
    expect(refusal(game, sim, start, signUp(9))).toBe('not-posted');
    expect(refusal(game, sim, start, { type: 'job/sign-up', day: 1.5 })).toBe('bad-day');
    const five = play(game, sim, start, signUp(1), signUp(2), signUp(3), signUp(4), signUp(5));
    expect(refusal(game, sim, five.state, signUp(1))).toBe('already-signed-up');
    expect(refusal(game, sim, five.state, signUp(6))).toBe('week-full');
    expect(game.options(five.state, sim).filter((a) => a.type === 'job/sign-up')).toEqual([]);
    const two = play(game, sim, start, signUp(2), signUp(4));
    expect(game.options(two.state, sim).filter((a) => a.type === 'job/sign-up')).toEqual(
      [1, 3, 5, 6].map((day) => ({ type: 'job/sign-up', day })),
    );
  });

  it('counts the five from Monday to Sunday, whatever day the job starts', () => {
    // Thursday 5 June: the rest of this week, Friday to Sunday, and all of next week are up.
    const thursday = createLifeGame({
      events: false,
      people: 0,
      career: TEST_COOK,
      start: { year: 2025, month: 6, day: 5, hour: 7, minute: 0 },
    });
    const state = thursday.init('thursday', sim);
    expect(job(state).posted.map((p) => p.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const both = play(thursday, sim, state, ...[1, 2, 3, 4, 5, 6, 7, 8].map(signUp));
    expect(refusal(thursday, sim, both.state, signUp(9))).toBe('week-full');
  });

  it('offers nothing to someone with no job', () => {
    const jobless = createLifeGame({ events: false, unlocked: true, people: 0 });
    const state = jobless.init('jobless', sim);
    expect(jobless.fact(state, 'job.employed', undefined, sim)).toBe(false);
    expect(jobless.options(state, sim).some((a) => a.type.startsWith('job/'))).toBe(false);
    expect(refusal(jobless, sim, state, signUp(1))).toBe('not-employed');
  });
});

describe('a shift', () => {
  it('worked whole and on time adds standing, practice, and pay owed', () => {
    const start = atShift(1);
    const worked = play(game, sim, start, doing('work', 480));
    expect(worked.of('job/started')).toEqual([{ type: 'job/started', day: 1, late: 0 }]);
    const over = afterShift(worked.state, 1);
    expect(over.of('job/shift-over')).toEqual([
      { type: 'job/shift-over', day: 1, worked: 480, late: 0, missed: 0, home: false },
    ]);
    expect(over.fact('job.standing')).toBe(52);
    expect(over.fact('job.skill')).toBe(1); // 100 × 480 ÷ (480 + 24,000)
    expect(over.fact('job.unpaid')).toBe(payFor(480, testCook().wage));
  });

  it('is late more than 5 minutes after it starts: standing lost, and none gained', () => {
    const started = play(game, sim, atShift(1, 10), doing('work', 470));
    expect(started.of('job/standing').map((b) => b.why)).toEqual(['late']);
    const late = afterShift(started.state, 1);
    expect(late.of('job/standing')).toEqual([]);
    expect(late.fact('job.standing')).toBe(46);
    const onTime = afterShift(play(game, sim, atShift(1, 5), doing('work', 475)).state, 1);
    expect(onTime.fact('job.standing')).toBe(52);
  });

  it('left early costs standing; half an hour off it does not', () => {
    const left = afterShift(play(game, sim, atShift(1), doing('work', 240)).state, 1);
    expect(left.of('job/standing').map((b) => b.why)).toEqual(['left-early']);
    expect(left.fact('job.standing')).toBe(44);
    const breaks = play(game, sim, atShift(1), doing('work', 120), doing('eat', 30), doing('work', 330));
    expect(afterShift(breaks.state, 1).fact('job.standing')).toBe(52);
  });

  it('caps every activity offered at the next shift’s start, and work at its end', () => {
    const signed = play(game, sim, fresh(), signUp(1)).state;
    const soon = play(game, sim, signed, at(signed, 1, 14, 30)).state;
    expect(game.fact(soon, 'job.next-shift-in', undefined, sim)).toBe(30);
    const offered = game.options(soon, sim).filter((a) => a.type === 'life/do');
    expect(offered.map((a) => [a.activity, a.minutes])).toContainEqual(['sleep', 30]);
    expect(offered.some((a) => a.activity === 'work')).toBe(false);
    const during = play(game, sim, soon, advance(90)).state;
    expect(game.options(during, sim)).toContainEqual(doing('work', 420));
    expect(refusal(game, sim, during, doing('work', 421))).toBe('past-the-shift');
  });

  it('ends what you do a walk before the shift (D57), and during it at its end, not the next one’s (D58)', () => {
    const signed = play(game, sim, fresh(), signUp(1)).state;
    const sleep = (state: GameState) =>
      game.options(state, sim).find((a) => a.type === 'life/do' && a.activity === 'sleep')?.minutes;
    const hour = play(game, sim, signed, at(signed, 1, 14)).state;
    expect(game.fact(hour, 'job.next-shift-in', undefined, sim)).toBe(60);
    expect(sleep(hour)).toBe(60 - ALARM_MINUTES);
    const morning = play(game, sim, signed, at(signed, 1, 9)).state;
    expect(sleep(morning)).toBe(6 * 60 - ALARM_MINUTES);
    const during = play(game, sim, signed, at(signed, 1, 16)).state;
    expect(game.fact(during, 'job.on-shift', undefined, sim)).toBe(true);
    expect(sleep(during)).toBe(game.fact(during, 'job.shift-left', undefined, sim));
    // D61: once the stage has said how long your walk is, the alarm sets that aside, and a margin.
    const walked = play(game, sim, signed, { type: 'you/commute', minutes: 50 }, at(signed, 1, 9)).state;
    expect(sleep(walked)).toBe(6 * 60 - 50 - ALARM_MARGIN);
    expect(refusal(game, sim, signed, { type: 'you/commute', minutes: 0 })).toBe('bad-minutes');
    expect(refusal(game, sim, signed, { type: 'you/commute', minutes: LONGEST_WALK + 1 })).toBe('bad-minutes');
  });
});

describe('no-shows and warnings (D39)', () => {
  it('warns at the first, and lets you go at a second within 28 days', () => {
    const first = afterShift(play(game, sim, fresh(), signUp(1), signUp(3), signUp(5)).state, 1);
    expect(first.of('job/no-show')).toEqual([{ type: 'job/no-show', day: 1, shift: 'evening', warnings: 1 }]);
    expect(first.fact('job.standing')).toBe(35);
    expect(first.fact('job.warnings')).toBe(1);
    const second = afterShift(first.state, 3);
    expect(second.of('job/let-go')).toEqual([{ type: 'job/let-go', reason: 'no-shows' }]);
    expect(second.fact('job.employed')).toBe(false);
    expect(job(second.state).posted).toEqual([]);
    expect(job(second.state).signed).toEqual([]);
    expect(shiftTimers(second.state)).toEqual([]);
    expect(game.options(second.state, sim).some((a) => a.type.startsWith('job/'))).toBe(false);
  });

  it('lets a warning lapse 28 days after it was given, and not a minute sooner', () => {
    const noShow = (state: GameState, day: number) => {
      const signed = play(game, sim, state, at(state, day - 2, 12), signUp(day)).state;
      return afterShift(signed, day);
    };
    const first = afterShift(play(game, sim, fresh(), signUp(1)).state, 1).state;
    const lapsed = noShow(first, 29);
    expect(lapsed.of('job/no-show')).toEqual([{ type: 'job/no-show', day: 29, shift: 'evening', warnings: 1 }]);
    expect(lapsed.fact('job.employed')).toBe(true);
    expect(noShow(first, 28).fact('job.employed')).toBe(false);
  });

  it('lets you go when standing reaches 0', () => {
    const fragile = createLifeGame({ events: false, unlocked: true, people: 0, career: TEST_COOK });
    const fragileSim = sliceSim(withCareer(testCook({ standing: { ...testCook().standing, start: 4 } })));
    const signed = play(fragile, fragileSim, fragile.init('fragile', fragileSim), signUp(1)).state;
    const late = play(fragile, fragileSim, signed, at(signed, 1, 15, 30), doing('work', 30));
    expect(late.of('job/let-go')).toEqual([{ type: 'job/let-go', reason: 'standing' }]);
    expect(late.fact('job.on-shift')).toBe(false);
    // Its shift's timer was set at midnight; letting go clears it.
    expect(shiftTimers(signed)).toEqual([]);
    expect(shiftTimers(play(fragile, fragileSim, signed, at(signed, 1, 0, 1)).state)).toEqual(['shift-1-over']);
    expect(shiftTimers(late.state)).toEqual([]);
  });
});

describe('dropping a shift', () => {
  it('drops one a day or more ahead for a point of standing, and no later', () => {
    const signed = play(game, sim, fresh(), signUp(1), signUp(3)).state;
    const dropped = play(game, sim, signed, { type: 'job/drop', day: 3 });
    expect(dropped.fact('job.standing')).toBe(49);
    expect(job(dropped.state).signed.map((s) => s.day)).toEqual([1]);
    // Tuesday's starts at 15:00: at 16:00 on Monday it is 23 hours away.
    const close = play(game, sim, signed, at(signed, 0, 16)).state;
    expect(refusal(game, sim, close, { type: 'job/drop', day: 1 })).toBe('too-late-to-drop');
    expect(game.options(close, sim).filter((a) => a.type === 'job/drop')).toEqual([{ type: 'job/drop', day: 3 }]);
  });

  it("clears a shift's timers when it is dropped on its own day, where a career allows it", () => {
    const lenient = createLifeGame({ events: false, unlocked: true, people: 0, career: TEST_COOK });
    const lenientSim = sliceSim(withCareer(testCook({ standing: { ...testCook().standing, dropBefore: 60 } })));
    const signed = play(lenient, lenientSim, lenient.init('lenient', lenientSim), signUp(1)).state;
    const morning = play(lenient, lenientSim, signed, at(signed, 1, 9)).state;
    expect(shiftTimers(morning)).toEqual(['shift-1-over']);
    const dropped = play(lenient, lenientSim, morning, { type: 'job/drop', day: 1 });
    expect(shiftTimers(dropped.state)).toEqual([]);
    expect(dropped.fact('job.on-shift')).toBe(false);
  });
});

describe('payday (D38)', () => {
  const taxes = () => testCook().withholding.map((id) => [id, taxOf(sim.content, id)] as const);

  function workDays(days: number[]) {
    let state = play(game, sim, fresh(), ...days.map(signUp)).state;
    for (const day of days) state = play(game, sim, state, at(state, day, 15), doing('work', 480)).state;
    return state;
  }

  it('pays on Friday at 06:00 for every minute since the last, less what is withheld', () => {
    const state = workDays([1, 2, 3]);
    const friday = play(game, sim, state, at(state, 4, 6, 1));
    const check = paycheck(taxes(), payFor(1440, testCook().wage), 52, 0);
    const { gross, net } = check;
    expect(friday.of('job/paid')).toEqual([{ type: 'job/paid', minutes: 1440, gross, withheld: gross - net, net }]);
    expect(check.gross).toBe(353_52);
    expect(friday.fact('economy.amount', { resource: 'cash' })).toBe(START_CASH + check.net);
    // The year's pay, as aid counts it (M2.8 step 4).
    expect(friday.fact('education.aid-income')).toBe(check.gross);
    expect(friday.fact('job.unpaid')).toBe(0);
    expect(job(friday.state).earned).toBe(353_52);
  });

  it('pays what is owed after being let go, and then nothing more', () => {
    const state = play(game, sim, workDays([1]), signUp(2), signUp(3)).state;
    const gone = afterShift(afterShift(state, 2).state, 3).state;
    expect(game.fact(gone, 'job.employed', undefined, sim)).toBe(false);
    const later = play(game, sim, gone, at(gone, 12, 7));
    expect(later.of('job/paid').map((b) => b.minutes)).toEqual([480]);
  });

  it('pays nothing for a week with nothing worked', () => {
    const start = fresh();
    expect(play(game, sim, start, at(start, 12, 7)).of('job/paid')).toEqual([]);
  });

  it("counts Social Security's year from the paycheck's calendar year", () => {
    // Monday 22 December 2025: paid on the 26th, then on Friday 2 January 2026.
    const december = createLifeGame({
      events: false,
      people: 0,
      career: TEST_COOK,
      start: { year: 2025, month: 12, day: 22, hour: 7, minute: 0 },
    });
    let state = play(december, sim, december.init('year', sim), signUp(1), signUp(2)).state;
    for (const day of [1, 2]) state = play(december, sim, state, at(state, day, 15), doing('work', 480)).state;
    // Next week's shifts go up on Christmas Day, a Thursday; the first payday is the day after.
    const christmas = play(december, sim, state, at(state, 3, 12), signUp(8)).state;
    const first = play(december, sim, christmas, at(christmas, 4, 7));
    expect(first.of('job/paid').map((b) => b.gross)).toEqual([235_68]);
    expect([job(first.state).year, job(first.state).earned]).toEqual([2025, 235_68]);
    state = play(december, sim, first.state, at(first.state, 8, 15), doing('work', 480)).state;
    const second = play(december, sim, state, at(state, 11, 7));
    expect(second.of('job/paid').map((b) => b.gross)).toEqual([117_84]);
    expect([job(second.state).year, job(second.state).earned]).toEqual([2026, 117_84]);
  });

  it('runs the same for the line cook, whose postings differ by seed', () => {
    expect(standingAfter(sliceGame().init('cook', sliceSim()))).toBe(lineCook().standing.start);
  });
});
