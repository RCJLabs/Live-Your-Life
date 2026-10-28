import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import type { Bill } from './aid.ts';
import { type CollegeSlice, NO_COLLEGE, type Term } from './college.ts';
import type { EducationSlice } from './module.ts';
import { type EducationRecord, educationOf, type Nclex, type NursingProgram } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const r = educationOf(sim.content) as EducationRecord;
const adn = r.adn as NursingProgram;
const bsn = r.bsn as NursingProgram;
const nclex = r.nclex as Nclex;
const u = r.university as NonNullable<EducationRecord['university']>;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string) => game.fact(s, id, {}, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((a) => a.type === type);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const odds = (s: GameState, program: string) =>
  game.preview(s, [{ effect: 'nursing-odds', program }], sim)[0]?.chance as number;
const chance = (b: Record<string, unknown> | undefined) =>
  b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);

/** College or university credits graded at an average of `gpa` hundredths. */
const record = (credits: number, gpa: number): Partial<CollegeSlice> => ({
  credits,
  graded: credits,
  points: Math.floor((credits * gpa) / 100),
});

type Change = Partial<Omit<EducationSlice, 'adn' | 'bsn'>> & {
  adn?: Partial<EducationSlice['adn']>;
  bsn?: Partial<EducationSlice['bsn']>;
};

/** A life with its schooling changed and $10,000, at ten in the morning. */
function lifeWith(seed: string, change: Change = {}): GameState {
  const s = game.init(seed, sim);
  const e = edu(s);
  const set = {
    ...s,
    education: {
      ...e,
      ...change,
      adn: { ...e.adn, ...change.adn },
      bsn: { ...e.bsn, ...change.bsn },
    },
    economy: { ...(s.economy as object), amounts: { cash: 10_000_00 } },
  } as GameState;
  return play(game, sim, set, { type: 'clock/wait-until', hour: 10, minute: 0 }).state;
}

// Twenty credits, past the fifteen asked, so each average is made of whole grade points.
const prereqs = (gpa: number): Change => ({ college: { ...NO_COLLEGE(), ...record(adn.admit.credits + 5, gpa) } });

describe('the nursing programs’ admission (M4.4 step 2, D163)', () => {
  it('admits to the college’s program at a chance from the prerequisites’ average, shown first and rolled as shown', () => {
    expect(odds(lifeWith('none'), 'adn')).toBe(0);
    expect(offered(lifeWith('none'), 'education/apply-nursing')).toEqual([]);
    expect(odds(lifeWith('low', prereqs(adn.admit.gpa - 10)), 'adn')).toBe(0);
    expect(odds(lifeWith('at', prereqs(adn.admit.gpa)), 'adn')).toBe(adn.admit.chance);
    expect(odds(lifeWith('above', prereqs(adn.admit.gpa + 50)), 'adn')).toBe(adn.admit.chance + 5 * adn.admit.perTenth);
    expect(odds(lifeWith('top', prereqs(400)), 'adn')).toBe(adn.admit.most);
    const seen = new Set<boolean>();
    for (let i = 0; i < 30; i++) {
      const s = lifeWith(`apply-${i}`, prereqs(300));
      const shown = odds(s, 'adn');
      expect(offered(s, 'education/apply-nursing')).toEqual([{ type: 'education/apply-nursing', program: 'adn' }]);
      const step = play(game, sim, s, { type: 'education/apply-nursing', program: 'adn' });
      expect(chance(step.of('logic/rolled')[0])).toBe(shown);
      const [heard] = step.of('education/nursing-admitted');
      expect(edu(step.state).adn.admitted).toBe(heard?.admitted);
      seen.add(heard?.admitted as boolean);
      if (heard?.admitted) {
        expect(told(heard)).toBe("Dana was admitted to the college's nursing program.");
        continue;
      }
      expect(told(heard)).toBe("Dana applied to the college's nursing program and was not admitted.");
      // Again only after the record's days.
      expect(offered(step.state, 'education/apply-nursing')).toEqual([]);
      const day = fact(s, 'time.day') as number;
      const refused = (ago: number) => lifeWith(`apply-${i}`, { ...prereqs(300), adn: { applied: day - ago } });
      expect(offered(refused(adn.admit.wait - 1), 'education/apply-nursing')).toEqual([]);
      expect(offered(refused(adn.admit.wait), 'education/apply-nursing')).toHaveLength(1);
      expect(refusal(game, sim, s, { type: 'education/apply-nursing', program: 'bsn' })).toBe('no-applying');
    }
    expect([...seen].sort()).toEqual([false, true]);
  });

  it('admits to the university’s program only from the university, with two years’ credits at its average', () => {
    const university = (credits: number, gpa: number, admitted = true) => ({
      university: { ...edu(lifeWith('u')).university, admitted, ...record(credits, gpa) },
    });
    expect(odds(lifeWith('b1', university(bsn.admit.credits, 350, false)), 'bsn')).toBe(0);
    expect(odds(lifeWith('b2', university(bsn.admit.credits - 3, 350)), 'bsn')).toBe(0);
    expect(odds(lifeWith('b3', university(bsn.admit.credits, bsn.admit.gpa)), 'bsn')).toBe(bsn.admit.chance);
    // The college's record counts nothing toward it.
    expect(odds(lifeWith('b4', prereqs(400)), 'bsn')).toBe(0);
  });
});

/** Days on to the morning `days` before the fall term (2 September; the life starts 2 June), cash restored. */
function beforeFall(s: GameState, days: number): GameState {
  const t = play(game, sim, s, advance((92 - days) * MINUTES_PER_DAY)).state;
  return { ...t, economy: { ...(t.economy as object), amounts: { cash: 10_000_00 } } } as GameState;
}

describe('the nursing programs’ terms (M4.4 step 2)', () => {
  it('enrolls the admitted in their own courses by day, the bachelor’s at the university’s upper price', () => {
    // Not admitted, not enrolled, whatever the record.
    const out = beforeFall(lifeWith('enroll', prereqs(400)), 10);
    expect(offered(out, 'education/enroll').some((o) => o.school === 'adn' || o.school === 'bsn')).toBe(false);
    const s = beforeFall(lifeWith('enroll', { adn: { admitted: true } }), 10);
    const options = offered(s, 'education/enroll').filter((o) => o.school === 'adn');
    expect(Math.max(...options.map((o) => o.courses as number))).toBe(adn.slots.length);
    const step = play(game, sim, s, { type: 'education/enroll', courses: 2, borrow: 'none', school: 'adn' });
    expect((edu(step.state).adn.term as Term).courses.map((x) => x.id)).toEqual(['adn-01', 'adn-02']);
    expect(told(step.of('education/enrolled')[0])).toBe(
      "Dana enrolled in the college's nursing program for 2 courses.",
    );
    const b = beforeFall(lifeWith('bsn-bill', { bsn: { admitted: true } }), 10);
    const [bill] = game.preview(
      b,
      [{ effect: 'college-bill', school: 'bsn', courses: 3, borrow: 'none' }],
      sim,
    ) as unknown as Bill[];
    expect(bill?.charge).toBe(18 * u.price.upper.perCredit + u.price.termFee);
  });

  it('finishes the associate’s in nursing at its credits and average, and the bachelor’s on top of a university record', () => {
    const term = (s: GameState, ids: string[]): Term => {
      const day = fact(s, 'time.day') as number;
      return {
        evening: false,
        id: 'fall',
        start: day,
        end: day + 15 * 7,
        courses: ids.map((id, slot) => ({ id, slot, attended: 30, study: 2 * 6 * 15 * 60 })),
      };
    };
    const a0 = lifeWith('adn-end', { adn: { admitted: true, ...record(adn.degree - 6, 300) } });
    const a = { ...a0, education: { ...edu(a0), adn: { ...edu(a0).adn, term: term(a0, ['adn-06']) } } } as GameState;
    const end = play(game, sim, a, advance(15 * 7 * MINUTES_PER_DAY));
    expect(end.of('education/nursed')[0]).toMatchObject({ program: 'adn' });
    expect(told(end.of('education/nursed')[0])).toBe("Dana finished the college's nursing program.");
    expect(fact(end.state, 'education.nursing')).toBe('adn');
    expect(fact(end.state, 'education.finished')).toBe('associate');
    const b0 = lifeWith('bsn-end', { finished: 'associate', bsn: { admitted: true, ...record(bsn.degree - 6, 300) } });
    const b = { ...b0, education: { ...edu(b0), bsn: { ...edu(b0).bsn, term: term(b0, ['bsn-10']) } } } as GameState;
    const done = play(game, sim, b, advance(15 * 7 * MINUTES_PER_DAY));
    expect(fact(done.state, 'education.nursing')).toBe('bsn');
    expect(fact(done.state, 'education.finished')).toBe('bachelor');
    // A finished program isn't enrolled in again.
    expect(offered(beforeFall(done.state, 10), 'education/enroll').some((o) => o.school === 'bsn')).toBe(false);
  });
});

describe('the nursing licensing exam (M4.4 step 2)', () => {
  it('is sat after a program, at its first sitting’s chance as previewed, then a later one’s', () => {
    const o = (s: GameState) => game.preview(s, [{ effect: 'nclex-odds' }], sim)[0]?.chance as number;
    expect(offered(lifeWith('none'), 'education/sit-nclex')).toEqual([]);
    expect(o(lifeWith('a', { nursing: 'adn' }))).toBe(nclex.adn);
    expect(o(lifeWith('b', { nursing: 'bsn' }))).toBe(nclex.bsn);
    const seen = new Set<boolean>();
    for (let i = 0; i < 40; i++) {
      const s = lifeWith(`nclex-${i}`, { nursing: i % 2 ? 'adn' : 'bsn' });
      const shown = o(s);
      const step = play(game, sim, s, { type: 'education/sit-nclex' });
      expect(chance(step.of('logic/rolled')[0])).toBe(shown);
      const [heard] = step.of('education/nclex');
      expect(fact(step.state, 'education.rn-licensed')).toBe(heard?.passed);
      expect(game.fact(step.state, 'economy.amount', { resource: 'cash' }, sim)).toBe(10_000_00 - nclex.price);
      seen.add(heard?.passed as boolean);
      if (heard?.passed) {
        expect(told(heard)).toBe('Dana passed the nursing licensing exam and became a registered nurse.');
        continue;
      }
      expect(o(step.state)).toBe(nclex.repeat);
      expect(offered(step.state, 'education/sit-nclex')).toEqual([]);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });
});
