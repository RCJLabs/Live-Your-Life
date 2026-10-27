import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import type { LawSlice } from '../law/state.ts';
import type { Bill } from './aid.ts';
import { type CollegeSlice, NO_COLLEGE, type Term } from './college.ts';
import type { EducationSlice } from './module.ts';
import { type EducationRecord, educationOf, type University } from './records.ts';
import { NO_UNIVERSITY, type UniversitySlice } from './university.ts';

const sim = sliceSim();
const game = sliceGame();
const u = (educationOf(sim.content) as EducationRecord).university as University;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string, a: Record<string, unknown> = {}) => game.fact(s, id, a, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((a) => a.type === type);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const odds = (s: GameState) => game.preview(s, [{ effect: 'admit-odds' }], sim)[0]?.chance;
const chance = (b: Record<string, unknown> | undefined) =>
  b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);

/** A life with its schooling, its college and university so far, cash, and a record. */
function lifeWith(
  seed: string,
  o: {
    finished?: string;
    college?: Partial<CollegeSlice>;
    university?: Partial<UniversitySlice>;
    convictions?: number;
    felonies?: number;
  } = {},
): GameState {
  const s = game.init(seed, sim);
  const e = edu(s);
  return {
    ...s,
    education: {
      ...e,
      finished: o.finished ?? 'diploma',
      college: { ...NO_COLLEGE(), ...o.college },
      university: { ...NO_UNIVERSITY(), ...o.university },
    },
    law: { ...(s.law as LawSlice), convictions: o.convictions ?? 0, felonies: o.felonies ?? 0 },
    economy: { ...(s.economy as object), amounts: { cash: 20_000_00 } },
  } as GameState;
}

/** A college record of `credits` credits, all at a grade of `points`. */
const college = (credits: number, points: number): Partial<CollegeSlice> => ({
  credits: points > 0 ? credits : 0,
  graded: credits,
  points: credits * points,
});

describe('applying to the state university (M4.2 step 1, D150)', () => {
  it('admits at the odds the preview shows, from your schooling and record', () => {
    expect(odds(lifeWith('a'))).toBe(u.admit.diploma);
    expect(odds(lifeWith('a', { finished: 'ged' }))).toBe(u.admit.ged);
    expect(odds(lifeWith('a', { college: college(30, 3) }))).toBe(u.admit.transfer);
    expect(odds(lifeWith('a', { convictions: 2 }))).toBe(u.admit.diploma - u.admit.conviction);
    expect(odds(lifeWith('a', { convictions: 1, felonies: 1 }))).toBe(
      u.admit.diploma - u.admit.conviction - u.admit.felony,
    );
    // Under the transfer average, or without a diploma or GED: no chance, and nothing offered.
    for (const s of [lifeWith('a', { college: college(30, 1) }), lifeWith('a', { finished: 'none' })]) {
      expect(odds(s)).toBe(0);
      expect(offered(s, 'education/apply')).toEqual([]);
      expect(refusal(game, sim, s, { type: 'education/apply' })).toBe('no-applying');
    }
    const seen = new Set<boolean>();
    for (let i = 0; i < 40; i++) {
      const s = lifeWith(`odds-${i}`, { finished: i % 2 ? 'ged' : 'diploma', convictions: i % 3 });
      const step = play(game, sim, s, { type: 'education/apply' });
      const [rolled] = step.of('logic/rolled');
      expect(chance(rolled)).toBe(odds(s));
      const [heard] = step.of('education/admitted');
      expect(heard?.chance).toBe(odds(s));
      expect(fact(step.state, 'education.admitted')).toBe(heard?.admitted);
      seen.add(heard?.admitted as boolean);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });

  it('lets you apply again only the record’s days after a refusal, and never once admitted', () => {
    const today = fact(lifeWith('w'), 'time.day') as number;
    const refused = lifeWith('w', { university: { applied: today } });
    expect(offered(refused, 'education/apply')).toEqual([]);
    const later = play(game, sim, refused, advance(u.admit.wait * MINUTES_PER_DAY)).state;
    expect(offered(later, 'education/apply')).toEqual([{ type: 'education/apply' }]);
    expect(offered(lifeWith('w', { university: { admitted: true } }), 'education/apply')).toEqual([]);
  });

  it('brings the college’s credits, up to its most, as courses passed with no grade', () => {
    for (let i = 0; i < 40; i++) {
      const s = lifeWith(`transfer-${i}`, { finished: 'associate', college: college(66, 3) });
      const step = play(game, sim, s, { type: 'education/apply' });
      if (!step.of('education/admitted')[0]?.admitted) continue;
      const v = edu(step.state).university;
      expect(v.transferred).toBe(u.transfer);
      expect(v.credits).toBe(u.transfer);
      expect(v.passed).toEqual(u.courses.slice(0, u.transfer / 3).map((x) => x.id));
      expect(v.graded).toBe(0);
      expect(fact(step.state, 'education.degree-gpa')).toBe(0);
      expect(step.of('education/admitted')[0]?.transfer).toBe(u.transfer);
      expect(told(step.of('education/admitted')[0])).toBe('Dana was admitted to the state university.');
      return;
    }
    throw new Error('never admitted in 40');
  });
});

/** Days on to the morning `days` before the fall term (2 September; the life starts 2 June). */
function beforeFall(s: GameState, days: number): GameState {
  return play(game, sim, s, advance((92 - days) * MINUTES_PER_DAY)).state;
}

describe('the university’s terms (M4.2 step 1, D149)', () => {
  it('enrolls the admitted at its own price, one school at a time, as the bill shows', () => {
    const s = beforeFall(lifeWith('enroll', { university: { admitted: true } }), 10);
    const options = offered(s, 'education/enroll');
    expect(options.filter((o) => o.school === 'university').length).toBeGreaterThan(0);
    // The college's options keep their old shape: no school named.
    expect(options.filter((o) => o.school === undefined).length).toBeGreaterThan(0);
    const bill = (n: number) =>
      game.preview(
        s,
        [{ effect: 'college-bill', school: 'university', courses: n, borrow: 'none' }],
        sim,
      )[0] as unknown as Bill;
    expect(bill(4).charge).toBe(12 * u.price.perCredit + u.price.termFee);
    const step = play(game, sim, s, { type: 'education/enroll', courses: 4, borrow: 'none', school: 'university' });
    const [billed] = step.of('education/billed');
    expect(billed?.charge).toBe(bill(4).charge);
    expect(billed?.cash).toBe(bill(4).cash);
    expect((edu(step.state).university.term as Term).courses.map((x) => x.id)).toEqual([
      'u-01',
      'u-02',
      'u-03',
      'u-04',
    ]);
    expect(told(step.of('education/enrolled')[0])).toBe('Dana enrolled at the state university for 4 courses.');
    expect(offered(step.state, 'education/enroll')).toEqual([]);
    // Past the lower division, the upper price.
    const upper = beforeFall(lifeWith('upper', { university: { admitted: true, credits: u.price.upper.after } }), 10);
    const [up] = game.preview(
      upper,
      [{ effect: 'college-bill', school: 'university', courses: 1, borrow: 'none' }],
      sim,
    );
    expect((up as unknown as Bill).charge).toBe(3 * u.price.upper.perCredit + u.price.termFee);
  });

  it('offers evening sections (D152): the same courses and bill, meeting at the evening slots', () => {
    const s = beforeFall(lifeWith('evening', { university: { admitted: true } }), 10);
    const evening = offered(s, 'education/enroll').filter((o) => o.evening === true);
    expect(Math.max(...evening.map((o) => o.courses as number))).toBe(u.evening?.length);
    expect(evening.every((o) => o.school === 'university')).toBe(true);
    const step = play(game, sim, s, {
      type: 'education/enroll',
      courses: 2,
      borrow: 'none',
      school: 'university',
      evening: true,
    });
    const term = edu(step.state).university.term as Term;
    expect(term.evening).toBe(true);
    // Tuesday 2 September, the term's first day: the second course meets at the second evening slot.
    const first = play(
      game,
      sim,
      step.state,
      advance((term.start - (fact(step.state, 'time.day') as number)) * MINUTES_PER_DAY),
    ).state;
    const morning = play(game, sim, first, {
      type: 'clock/wait-until',
      hour: u.slots[1]?.hour as number,
      minute: 0,
    }).state;
    expect(offered(morning, 'education/attend')).toEqual([]);
    const night = play(game, sim, morning, {
      type: 'clock/wait-until',
      hour: u.evening?.[1]?.hour as number,
      minute: 0,
    }).state;
    expect(offered(night, 'education/attend')).toEqual([{ type: 'education/attend', course: term.courses[1]?.id }]);
    expect(
      refusal(game, sim, s, {
        type: 'education/enroll',
        courses: 5,
        borrow: 'none',
        school: 'university',
        evening: true,
      }),
    ).toBe('no-enrolling');
  });

  it('refuses the university’s term to someone not admitted, and the college’s once you hold a bachelor’s', () => {
    const s = beforeFall(lifeWith('closed'), 10);
    expect(offered(s, 'education/enroll').some((o) => o.school === 'university')).toBe(false);
    const ask = { type: 'education/enroll', courses: 1, borrow: 'none', school: 'university' };
    expect(refusal(game, sim, s, ask)).toBe('no-enrolling');
    const done = beforeFall(lifeWith('closed', { finished: 'bachelor', university: { admitted: true } }), 10);
    // Only the EMT course (M4.4), which takes a bachelor's holder as anyone.
    expect(offered(done, 'education/enroll').every((o) => o.school === 'emt')).toBe(true);
  });

  it('meets at the university’s slots, and earns the bachelor’s at its credits and average', () => {
    const s0 = lifeWith('degree', {
      university: { admitted: true, credits: u.degree - 3, graded: u.degree - 3, points: (u.degree - 3) * 3 },
    });
    const day = fact(s0, 'time.day') as number;
    const last = u.courses[u.courses.length - 1]?.id as string;
    const term: Term = {
      evening: false,
      id: 'fall',
      start: day,
      end: day + 15 * 7,
      courses: [{ id: last, slot: 0, attended: 0, study: 0 }],
    };
    let s = { ...s0, education: { ...edu(s0), university: { ...edu(s0).university, term } } } as GameState;
    // Monday 2 June: the first slot meets at 09:00.
    s = play(game, sim, s, { type: 'clock/wait-until', hour: u.slots[0]?.hour as number, minute: 0 }).state;
    expect(offered(s, 'education/attend')).toEqual([{ type: 'education/attend', course: last }]);
    const full = { id: last, slot: 0, attended: 30, study: u.study * 3 * 15 * 60 };
    s = {
      ...s,
      education: { ...edu(s), university: { ...edu(s).university, term: { ...term, courses: [full] } } },
    } as GameState;
    const end = play(game, sim, s, advance(15 * 7 * MINUTES_PER_DAY));
    expect(end.of('education/graded').map((g) => g.grade)).toEqual(['A']);
    expect(end.of('education/earned')).toEqual([{ type: 'education/earned', credential: 'bachelor' }]);
    expect(fact(end.state, 'education.finished')).toBe('bachelor');
    expect(fact(end.state, 'education.degree-credits')).toBe(u.degree);
    expect(told(end.of('education/earned')[0])).toBe("Dana earned a bachelor's degree.");
    // A course short: graded, no degree.
    const short = { ...edu(s).university, credits: u.degree - 6, graded: u.degree - 6, points: (u.degree - 6) * 3 };
    const early = play(
      game,
      sim,
      { ...s, education: { ...edu(s), university: short } } as GameState,
      advance(15 * 7 * MINUTES_PER_DAY),
    );
    expect(early.of('education/earned')).toEqual([]);
  });
});
