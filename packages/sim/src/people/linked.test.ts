import { describe, expect, it } from 'vitest';
import { advance, play, signUp, sliceGame, sliceSim, TEST_COOK, testCook, withCareer } from '../../test/slice.ts';
import { HOURS } from './day.ts';
import { type Linked, newShare, progress } from './module.ts';
import { LINKED } from './roster.ts';

// The test cook is offered one shift a day, 15:00 to 23:00 (test/slice.ts).
const sim = sliceSim(withCareer(testCook()));
const game = sliceGame({ career: TEST_COOK, people: 48 });

describe('the coworker and the fence among the tier-1 people (M2.2, D70)', () => {
  it('give the coworker the hours of the shift they work: yours on your days, off on their days off', () => {
    const start = game.init('linked', sim);
    const state = play(game, sim, start, ...[1, 2, 3, 4, 5].map(signUp)).state;
    const fact = (id: string, day: number) => game.fact(state, id, { day }, sim) as number;
    let worked = 0;
    let off = 0;
    for (let day = 1; day <= 6; day++) {
      const begins = fact('ties.their-start', day);
      if (begins < 0) {
        off++;
        expect(fact('ties.their-minutes', day)).toBe(0);
        continue;
      }
      worked++;
      // On a day you work, they're beside you: the same shift. The test cook has only the one.
      if (fact('job.shift-start', day) >= 0) expect(begins).toBe(fact('job.shift-start', day));
      expect(begins).toBe(15 * 60);
      expect(fact('ties.their-minutes', day)).toBe(480);
    }
    expect(worked).toBeGreaterThan(0);
    expect(off).toBeGreaterThan(0);
  });

  it('put the line cook’s coworker on your shift on your days, whichever of the shifts it is', () => {
    const cook = sliceGame({ people: 48 });
    const pack = sliceSim();
    let paired = 0;
    for (let i = 0; i < 40; i++) {
      const start = cook.init(`pair-${i}`, pack);
      const posted = (start.job as { posted: { day: number }[] }).posted.map((p) => p.day);
      const state = play(cook, pack, start, ...posted.map(signUp)).state;
      for (const day of posted) {
        const theirs = cook.fact(state, 'ties.their-start', { day }, pack) as number;
        if (theirs < 0) continue;
        expect(theirs, `pair-${i} day ${day}`).toBe(cook.fact(state, 'job.shift-start', { day }, pack));
        paired++;
      }
    }
    expect(paired).toBeGreaterThan(20);
  });

  it('give the fence the fence record’s hours', () => {
    const state = game.init('fence', sim);
    expect(game.fact(state, 'law.fence-from', undefined, sim)).toBe(22);
    expect(game.fact(state, 'law.fence-to', undefined, sim)).toBe(24);
  });

  it('live the linked people’s hours from their modules, and only theirs', () => {
    const city = { seed: 7, n: 48 };
    const atWork: Linked = (i) => (i < LINKED.count ? HOURS.work : null);
    const plain = newShare(48, 0, 24);
    const linked = newShare(48, 0, 24);
    progress(city, plain, 0, 24, 0);
    progress(city, linked, 0, 24, 0, atWork);
    // Six levels a person: the three linked people differ, worked all day; nobody else does. Two
    // to a share here, so the third, the supplier, is the first of the next share.
    expect(linked.levels.slice(0, 12)).not.toEqual(plain.levels.slice(0, 12));
    expect(linked.count).toBe(2);
    const next = newShare(48, 1, 24);
    const nextLinked = newShare(48, 1, 24);
    progress(city, next, 0, 24, 0);
    progress(city, nextLinked, 0, 24, 0, atWork);
    expect(nextLinked.levels.slice(0, 6)).not.toEqual(next.levels.slice(0, 6));
    expect(nextLinked.levels.slice(6)).toEqual(next.levels.slice(6));
    const other = newShare(48, 2, 24);
    const otherLinked = newShare(48, 2, 24);
    progress(city, other, 0, 24, 0);
    progress(city, otherLinked, 0, 24, 0, atWork);
    expect(otherLinked.levels).toEqual(other.levels);
  });

  it('settles the share holding them in a life by their own hours, not the roster’s day', () => {
    const start = game.init('lived', sim);
    const state = play(game, sim, start, signUp(1), advance(3 * 24 * 60)).state;
    const share = state['people-0'] as { hour: number; levels: number[] };
    expect(share.hour).toBeGreaterThan(48);
    // The same hours lived by the roster alone: from 07:00 on Monday, day 0, the life's start.
    const city = { seed: game.fact(state, 'people.seed', undefined, sim) as number, n: 48 };
    const alone = newShare(48, 0, 24);
    progress(city, alone, 7, share.hour, 0);
    expect(share.levels.slice(0, 12)).not.toEqual(alone.levels.slice(0, 12));
  });
});
