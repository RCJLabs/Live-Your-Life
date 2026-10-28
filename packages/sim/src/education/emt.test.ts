import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { careerOf } from '../job/records.ts';
import { barred } from '../market/odds.ts';
import type { Bill } from './aid.ts';
import { type CollegeSlice, NO_COLLEGE, type Term } from './college.ts';
import type { ExamSlice } from './emt.ts';
import type { EducationSlice } from './module.ts';
import { type EducationRecord, type EmtCourse, educationOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const c = (educationOf(sim.content) as EducationRecord).emt as EmtCourse;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string) => game.fact(s, id, {}, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((a) => a.type === type);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const chance = (b: Record<string, unknown> | undefined) =>
  b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);

/** A life with its schooling, its EMT course and exam so far, and cash, at ten in the morning. */
function lifeWith(
  seed: string,
  o: { finished?: string; emt?: Partial<CollegeSlice>; nremt?: Partial<ExamSlice>; cash?: number } = {},
): GameState {
  const s = game.init(seed, sim);
  const e = edu(s);
  const set = {
    ...s,
    education: {
      ...e,
      finished: o.finished ?? 'diploma',
      emt: { ...NO_COLLEGE(), ...o.emt },
      nremt: { ...e.nremt, ...o.nremt },
    },
    economy: { ...(s.economy as object), amounts: { cash: o.cash ?? 5_000_00 } },
  } as GameState;
  return play(game, sim, set, { type: 'clock/wait-until', hour: 10, minute: 0 }).state;
}

/** Days on to the morning `days` before the fall term (2 September; the life starts 2 June), with $5,000 then. */
function beforeFall(s: GameState, days: number): GameState {
  const t = play(game, sim, s, advance((92 - days) * MINUTES_PER_DAY)).state;
  return { ...t, economy: { ...(t.economy as object), amounts: { cash: 5_000_00 } } } as GameState;
}

/** Certified: both courses passed at a B. */
const certifiedSlice = (): Partial<CollegeSlice> => ({
  credits: c.certificate,
  graded: c.certificate,
  points: c.certificate * 3,
  passed: c.courses.map((x) => x.id),
});

describe('the EMT course at the college (M4.4 step 1, D163)', () => {
  it('enrolls anyone past high school for its two courses, at the college’s tuition, with no Pell and no loans', () => {
    const s = beforeFall(lifeWith('enroll'), 10);
    const options = offered(s, 'education/enroll').filter((o) => o.school === 'emt');
    expect(options.map((o) => [o.courses, o.borrow])).toEqual([
      [1, 'none'],
      [2, 'none'],
    ]);
    const [bill] = game.preview(
      s,
      [{ effect: 'college-bill', school: 'emt', courses: 2, borrow: 'most' }],
      sim,
    ) as unknown as Bill[];
    expect(bill?.credits).toBe(c.certificate);
    expect(bill?.pell).toBe(0);
    expect(bill?.borrowed).toBe(0);
    expect(bill?.cash).toBe(bill?.charge);
    const step = play(game, sim, s, { type: 'education/enroll', courses: 2, borrow: 'none', school: 'emt' });
    expect((edu(step.state).emt.term as Term).courses.map((x) => x.id)).toEqual(['emt-1', 'emt-2']);
    expect(step.of('education/billed')[0]?.cash).toBe(bill?.charge);
    expect(told(step.of('education/enrolled')[0])).toBe('Dana enrolled in the EMT course at the community college.');
    // Nothing for someone without a diploma or GED, or who has the certificate.
    expect(offered(beforeFall(lifeWith('none', { finished: 'none' }), 10), 'education/enroll')).toEqual([]);
    const done = beforeFall(lifeWith('done', { emt: certifiedSlice() }), 10);
    expect(offered(done, 'education/enroll').some((o) => o.school === 'emt')).toBe(false);
  });

  it('meets four evenings a week, and certifies at the term’s end with both courses passed', () => {
    const s0 = lifeWith('term');
    const day = fact(s0, 'time.day') as number;
    const full = (id: string, slot: number) => ({ id, slot, attended: 30, study: c.study * 6 * 15 * 60 });
    const term: Term = {
      evening: false,
      id: 'fall',
      start: day,
      end: day + 15 * 7,
      courses: [full('emt-1', 0), full('emt-2', 1)],
    };
    const s = { ...s0, education: { ...edu(s0), emt: { ...NO_COLLEGE(), term } } } as GameState;
    // Monday 2 June: the first course meets at 18:00.
    const evening = play(game, sim, s, { type: 'clock/wait-until', hour: c.slots[0]?.hour as number, minute: 0 }).state;
    expect(offered(evening, 'education/attend')).toEqual([{ type: 'education/attend', course: 'emt-1' }]);
    expect(fact(s, 'education.class-in')).toBe((c.slots[0]?.hour as number) * 60 - 10 * 60);
    const end = play(game, sim, s, advance(15 * 7 * MINUTES_PER_DAY));
    expect(end.of('education/graded').map((g) => g.grade)).toEqual(['A', 'A']);
    expect(end.of('education/certified')).toEqual([{ type: 'education/certified' }]);
    expect(told(end.of('education/certified')[0])).toBe('Dana finished the EMT course at the community college.');
    expect(fact(end.state, 'education.emt-certified')).toBe(true);
    // A certificate changes no schooling.
    expect(fact(end.state, 'education.finished')).toBe('diploma');
    // Both courses passed at a D: their credits, under the certificate's average.
    const low = lifeWith('low', { emt: { ...certifiedSlice(), points: c.certificate * 1 } });
    expect(fact(low, 'education.emt-certified')).toBe(false);
    expect(fact(lifeWith('ok', { emt: certifiedSlice() }), 'education.emt-certified')).toBe(true);
  });
});

describe('the national EMT exam (M4.4 step 1)', () => {
  it('is sat with the certificate, for its fee, at the first sitting’s chance as previewed, then the repeat’s', () => {
    expect(offered(lifeWith('uncert'), 'education/sit-nremt')).toEqual([]);
    expect(refusal(game, sim, lifeWith('uncert'), { type: 'education/sit-nremt' })).toBe('no-exam');
    expect(
      offered(lifeWith('broke', { emt: certifiedSlice(), cash: c.exam.price - 1 }), 'education/sit-nremt'),
    ).toEqual([]);
    const odds = (s: GameState) => game.preview(s, [{ effect: 'nremt-odds' }], sim)[0]?.chance;
    const seen = new Set<boolean>();
    for (let i = 0; i < 30; i++) {
      const s = lifeWith(`exam-${i}`, { emt: certifiedSlice() });
      expect(odds(s)).toBe(c.exam.first);
      const step = play(game, sim, s, { type: 'education/sit-nremt' });
      expect(chance(step.of('logic/rolled')[0])).toBe(c.exam.first);
      const [heard] = step.of('education/nremt');
      expect(fact(step.state, 'education.emt-licensed')).toBe(heard?.passed);
      expect(game.fact(step.state, 'economy.amount', { resource: 'cash' }, sim)).toBe(5_000_00 - c.exam.price);
      seen.add(heard?.passed as boolean);
      if (heard?.passed) {
        expect(told(heard)).toBe('Dana passed the national EMT exam.');
        expect(offered(step.state, 'education/sit-nremt')).toEqual([]);
        continue;
      }
      expect(told(heard)).toBe('Dana sat the national EMT exam and did not pass.');
      // Again only after its days, at the repeat's chance.
      expect(offered(step.state, 'education/sit-nremt')).toEqual([]);
      // A day short of the wait, not yet; at it, again. Set by the day, as a life waits on its own.
      const at = (ago: number) =>
        lifeWith(`exam-${i}`, {
          emt: certifiedSlice(),
          nremt: { tries: 1, last: (fact(s, 'time.day') as number) - ago },
        });
      expect(offered(at(c.exam.wait - 1), 'education/sit-nremt')).toEqual([]);
      const later = at(c.exam.wait);
      expect(offered(later, 'education/sit-nremt')).toEqual([{ type: 'education/sit-nremt' }]);
      expect(odds(later)).toBe(c.exam.repeat);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });

  it('is what the EMT’s career asks: no licence, no job', () => {
    const emt = careerOf(sim.content, 'emt');
    const you = { convictions: 0, felonies: 0, reputation: 50, schooling: 'diploma' };
    expect(barred(emt, you)).toBe('licence');
    expect(barred(emt, { ...you, emt: true })).toBeNull();
    expect(barred(emt, { ...you, emt: true, felonies: 1, convictions: 1 })).toBe('record');
    // Days, nights and the 24-hour shift (M4.4 step 3, D164), each with its unpaid breaks.
    expect(emt.shifts.map((k) => [k.id, k.hour, k.minutes, k.breaks])).toEqual([
      ['days', 7, 720, 30],
      ['nights', 19, 720, 30],
      ['twenty-four', 7, 1440, 480],
    ]);
  });
});
