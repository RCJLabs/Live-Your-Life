import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import type { LawSlice as RecordSlice } from '../law/state.ts';
import type { Bill } from './aid.ts';
import { NO_COLLEGE, type Term } from './college.ts';
import { type LawSlice, NO_LAW } from './law.ts';
import { type Loan, monthlyFor, NO_LOAN } from './loans.ts';
import type { EducationSlice } from './module.ts';
import { type Aid, type EducationRecord, educationOf, type LawSchool } from './records.ts';
import { NO_UNIVERSITY } from './university.ts';

const sim = sliceSim();
const game = sliceGame();
const r = educationOf(sim.content) as EducationRecord;
const l = r.law as LawSchool;
const a = r.aid as Aid;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string, x: Record<string, unknown> = {}) => game.fact(s, id, x, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((o) => o.type === type);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const peek = (s: GameState, effect: Record<string, unknown>) =>
  game.preview(s, [effect as never], sim)[0] as Record<string, unknown>;
const chance = (b: Record<string, unknown> | undefined) =>
  b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;

/** A life with a bachelor's at a university average, law school so far, cash, and a record. */
function lifeWith(
  seed: string,
  o: { finished?: string; gpa?: number; law?: Partial<LawSlice>; convictions?: number; felonies?: number } = {},
): GameState {
  const s = game.init(seed, sim);
  const graded = 120;
  return {
    ...s,
    education: {
      ...edu(s),
      finished: o.finished ?? 'bachelor',
      college: NO_COLLEGE(),
      university: { ...NO_UNIVERSITY(), admitted: true, credits: 120, graded, points: ((o.gpa ?? 340) * graded) / 100 },
      law: { ...NO_LAW(), ...o.law },
    },
    law: { ...(s.law as RecordSlice), convictions: o.convictions ?? 0, felonies: o.felonies ?? 0 },
    economy: { ...(s.economy as object), amounts: { cash: 20_000_00 } },
  } as GameState;
}

describe('the LSAT (M4.2 step 2, D150)', () => {
  it('scores about the record’s mean and spread, and study raises it as the preview says', () => {
    const scores = (prep: number) =>
      Array.from({ length: 300 }, (_, i) => {
        const step = play(game, sim, lifeWith(`lsat-${i}`, { law: { prep } }), { type: 'education/take-lsat' });
        return step.of('education/lsat')[0]?.score as number;
      });
    const mean = (xs: number[]) => xs.reduce((n, x) => n + x, 0) / xs.length;
    const cold = scores(0);
    expect(Math.abs(mean(cold) - l.lsat.mean)).toBeLessThan(1.5);
    const sd = Math.sqrt(mean(cold.map((x) => (x - mean(cold)) ** 2)));
    expect(Math.abs(sd - l.lsat.spread / 10)).toBeLessThan(1.5);
    // Twenty hours of study: four points; past the most, no more.
    const prep = 20 * 60;
    expect(peek(lifeWith('p', { law: { prep } }), { effect: 'lsat-odds' }).expected).toBe(
      l.lsat.mean + 20 / l.lsat.perHour,
    );
    expect(Math.abs(mean(scores(prep)) - mean(cold) - 20 / l.lsat.perHour)).toBeLessThan(1.5);
    expect(peek(lifeWith('p', { law: { prep: 1000 * 60 } }), { effect: 'lsat-odds' }).expected).toBe(
      l.lsat.mean + l.lsat.most,
    );
  });

  it('charges its fee, keeps the best score, and waits between sittings', () => {
    const s = lifeWith('best', { law: { lsat: 175 } });
    const step = play(game, sim, s, { type: 'education/take-lsat' });
    expect(cash(step.state)).toBe(cash(s) - l.lsat.price);
    const [beat] = step.of('education/lsat');
    expect(edu(step.state).law.lsat).toBe(Math.max(175, beat?.score as number));
    expect(told(beat)).toBe(`Dana sat the LSAT and scored ${beat?.score}.`);
    expect(offered(step.state, 'education/take-lsat')).toEqual([]);
    const later = play(game, sim, step.state, advance(l.lsat.wait * MINUTES_PER_DAY)).state;
    expect(offered(later, 'education/take-lsat')).toEqual([{ type: 'education/take-lsat' }]);
    // Not without a bachelor's or most of one.
    const early = lifeWith('early', { finished: 'diploma' });
    const fresh = { ...early, education: { ...edu(early), university: NO_UNIVERSITY() } } as GameState;
    expect(refusal(game, sim, fresh, { type: 'education/take-lsat' })).toBe('no-lsat');
    expect(offered(fresh, 'education/study').some((o) => o.subject === 'lsat')).toBe(false);
    expect(offered(s, 'education/study').some((o) => o.subject === 'lsat')).toBe(true);
  });
});

describe('applying to law school (M4.2 step 2, D150)', () => {
  it('admits at the odds the preview shows, from the LSAT, the average and the record', () => {
    const odds = (o: Parameters<typeof lifeWith>[1]) => peek(lifeWith('o', o), { effect: 'law-odds' }).chance;
    const at = { gpa: l.admit.gpa, law: { lsat: l.admit.lsat } };
    expect(odds(at)).toBe(l.admit.at);
    expect(odds({ ...at, law: { lsat: l.admit.lsat + 4 } })).toBe(l.admit.at + 4 * l.admit.perPoint);
    expect(odds({ ...at, gpa: l.admit.gpa - 20 })).toBe(l.admit.at - 2 * l.admit.perTenth);
    expect(odds({ ...at, convictions: 1, felonies: 1 })).toBe(l.admit.at - l.admit.conviction - l.admit.felony);
    expect(odds({ ...at, law: { lsat: 180 }, gpa: 400 })).toBe(l.admit.most);
    // No score, or no bachelor's: no chance, nothing offered.
    for (const s of [lifeWith('n'), lifeWith('n', { ...at, finished: 'associate' })]) {
      expect(peek(s, { effect: 'law-odds' }).chance).toBe(0);
      expect(offered(s, 'education/apply-law')).toEqual([]);
    }
    const seen = new Set<boolean>();
    for (let i = 0; i < 40; i++) {
      const s = lifeWith(`apply-${i}`, { ...at, law: { lsat: l.admit.lsat - 5 + (i % 10) } });
      const step = play(game, sim, s, { type: 'education/apply-law' });
      expect(chance(step.of('logic/rolled')[0])).toBe(peek(s, { effect: 'law-odds' }).chance);
      const [heard] = step.of('education/law-admitted');
      expect(edu(step.state).law.admitted).toBe(heard?.admitted);
      expect(told(heard)).toBe(
        heard?.admitted ? 'Dana was admitted to the law school.' : 'The law school turned Dana down.',
      );
      seen.add(heard?.admitted as boolean);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });
});

/** Days on to the morning `days` before the fall term (2 September; the life starts 2 June). */
const beforeFall = (s: GameState, days: number) => play(game, sim, s, advance((92 - days) * MINUTES_PER_DAY)).state;

describe('law school’s terms (M4.2 step 2, D149)', () => {
  it('bills its own price with no Pell, and lends a professional student’s loan apart', () => {
    const s = beforeFall(lifeWith('term', { law: { admitted: true } }), 10);
    const options = offered(s, 'education/enroll');
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => o.school === 'law')).toBe(true);
    const bill = peek(s, { effect: 'college-bill', school: 'law', courses: 5, borrow: 'most' }) as unknown as Bill;
    expect(bill.charge).toBe(15 * l.price.perCredit);
    expect(bill.pell).toBe(0);
    expect(bill.borrowed).toBe(l.loans.year / 2);
    expect(bill.fee).toBe(Math.floor((bill.borrowed * l.loans.fee) / 100000));
    const step = play(game, sim, s, { type: 'education/enroll', courses: 5, borrow: 'most', school: 'law' });
    expect(edu(step.state).grad.owed).toBe(bill.borrowed);
    expect(edu(step.state).loan.owed).toBe(0);
    expect((edu(step.state).law.term as Term).courses.map((x) => x.id)).toEqual(l.courses.slice(0, 5).map((x) => x.id));
    expect(told(step.of('education/enrolled')[0])).toBe('Dana enrolled at the law school for 5 courses.');
    // Interest at law school’s rate, not the college’s.
    const day = fact(step.state, 'time.day') as number;
    const year = play(game, sim, step.state, advance(365 * MINUTES_PER_DAY)).state;
    const owed = fact(year, 'education.owed') as number;
    const days = (fact(year, 'time.day') as number) - day;
    // Within a dollar: interest is floored each 1st it is run to.
    expect(Math.abs(owed - bill.borrowed - Math.floor((bill.borrowed * l.loans.rate * days) / 3_650_000))).toBeLessThan(
      100,
    );
  });

  it('repays law school’s loan on its own plan, at its rate, after the grace', () => {
    const grad: Loan = { ...NO_LOAN(), owed: 50_000_00, repay: 1 };
    const s = { ...lifeWith('repay'), education: { ...edu(lifeWith('repay')), grad } } as GameState;
    const due = play(game, sim, s, advance(29 * MINUTES_PER_DAY)).of('education/loan-due');
    const monthly = monthlyFor(
      { loans: { ...a.loans, rate: l.loans.rate } },
      50_000_00 + Math.floor((50_000_00 * l.loans.rate * 29) / 3_650_000),
    );
    expect(due).toEqual([{ type: 'education/loan-due', cents: monthly, paid: true }]);
  });

  it('earns the JD at its credits and average', () => {
    const s0 = lifeWith('jd', {
      law: { admitted: true, credits: l.degree - 3, graded: l.degree - 3, points: (l.degree - 3) * 3 },
    });
    const day = fact(s0, 'time.day') as number;
    const last = l.courses[l.courses.length - 1]?.id as string;
    const full = { id: last, slot: 0, attended: 30, study: l.study * 3 * 15 * 60 };
    const term: Term = { evening: false, id: 'fall', start: day, end: day + 15 * 7, courses: [full] };
    const s = { ...s0, education: { ...edu(s0), law: { ...edu(s0).law, term } } } as GameState;
    const end = play(game, sim, s, advance(15 * 7 * MINUTES_PER_DAY));
    expect(end.of('education/earned')).toEqual([{ type: 'education/earned', credential: 'jd' }]);
    expect(fact(end.state, 'education.finished')).toBe('jd');
    expect(told(end.of('education/earned')[0])).toBe('Dana earned a law degree.');
  });
});

describe('the bar exam (M4.2 step 2)', () => {
  // 28 July 2025, the first bar day after the life starts on 2 June: 56 days on, at 07:00.
  const barDay = (o: Parameters<typeof lifeWith>[1]) =>
    play(game, sim, lifeWith('bar', o), advance(56 * MINUTES_PER_DAY)).state;
  const jd = { finished: 'jd', law: { admitted: true } };

  it('is given on its days in the morning, to those with the JD and the fee', () => {
    expect(offered(barDay(jd), 'education/sit-bar')).toEqual([{ type: 'education/sit-bar' }]);
    expect(offered(barDay({ ...jd, finished: 'bachelor' }), 'education/sit-bar')).toEqual([]);
    const dayBefore = play(game, sim, lifeWith('bar', jd), advance(55 * MINUTES_PER_DAY)).state;
    expect(offered(dayBefore, 'education/sit-bar')).toEqual([]);
    const noon = play(game, sim, barDay(jd), { type: 'clock/wait-until', hour: 12, minute: 0 }).state;
    expect(refusal(game, sim, noon, { type: 'education/sit-bar' })).toBe('no-bar');
  });

  it('ends what you do when the doors open on its day, as a class does, so it isn’t slept through', () => {
    // 05:00 on 28 July: two hours before the doors.
    const early = play(game, sim, lifeWith('bar', jd), advance(56 * MINUTES_PER_DAY - 120)).state;
    expect(fact(early, 'education.class-in')).toBe(120);
    const sleep = offered(early, 'life/do').find((o) => o.activity === 'sleep');
    expect(sleep?.minutes).toBe(120);
    // Not for one without the JD, nor the day before.
    const bachelor = play(
      game,
      sim,
      lifeWith('bar', { ...jd, finished: 'bachelor' }),
      advance(56 * MINUTES_PER_DAY - 120),
    ).state;
    expect(fact(bachelor, 'education.class-in')).toBeUndefined();
    const before = play(game, sim, lifeWith('bar', jd), advance(55 * MINUTES_PER_DAY - 120)).state;
    expect(fact(before, 'education.class-in')).toBeUndefined();
  });

  it('passes at the real rate with the study it asks, less in proportion short of it, as rolled', () => {
    const odds = (o: Parameters<typeof lifeWith>[1]) => peek(lifeWith('o', o), { effect: 'bar-odds' }).chance;
    const asked = l.bar.hours * 60;
    expect(odds({ ...jd, law: { barPrep: asked } })).toBe(l.bar.first);
    expect(odds({ ...jd, law: { barPrep: 2 * asked } })).toBe(l.bar.first);
    expect(odds(jd)).toBe(l.bar.least);
    expect(odds({ ...jd, law: { barPrep: asked / 2 } })).toBe(
      l.bar.least + Math.floor((l.bar.first - l.bar.least) / 2),
    );
    expect(odds({ ...jd, law: { barPrep: asked, tries: 1 } })).toBe(l.bar.repeat);
    const seen = new Set<boolean>();
    for (let i = 0; i < 30; i++) {
      const s = play(
        game,
        sim,
        lifeWith(`sit-${i}`, { ...jd, law: { barPrep: asked } }),
        advance(56 * MINUTES_PER_DAY),
      ).state;
      const before = cash(s);
      const step = play(game, sim, s, { type: 'education/sit-bar' });
      expect(chance(step.of('logic/rolled')[0])).toBe(l.bar.first);
      expect(cash(step.state)).toBe(before - l.bar.price);
      const [b] = step.of('education/bar');
      expect(fact(step.state, 'education.licensed')).toBe(b?.passed);
      expect(edu(step.state).law.tries).toBe(1);
      expect(told(b)).toBe(b?.passed ? 'Dana passed the bar exam.' : 'Dana sat the bar exam and did not pass.');
      seen.add(b?.passed as boolean);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });
});
