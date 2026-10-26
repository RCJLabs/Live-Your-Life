import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, sliceGame, sliceSim } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { type CollegeSlice, meetings, NO_COLLEGE, nextCourses, score, type Term } from './college.ts';
import type { EducationSlice } from './module.ts';
import { type College, type EducationRecord, educationOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const c = (educationOf(sim.content) as EducationRecord).college as College;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string, a: Record<string, unknown> = {}) => game.fact(s, id, a, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((a) => a.type === type);
const withCollege = (s: GameState, college: Partial<CollegeSlice>, finished = 'diploma') =>
  ({ ...s, education: { ...edu(s), finished, college: { ...edu(s).college, ...college } } }) as GameState;

/** Days on to the morning `days` before the fall term starts (1 September; the life starts 2 June). */
function beforeFall(days: number): GameState {
  const s = game.init('college', sim);
  const fall = 91; // 2 June to 1 September
  return play(game, sim, withCollege(s, {}), advance((fall - days) * MINUTES_PER_DAY)).state;
}

describe('the community college (M2.8 step 3, D111)', () => {
  it('opens enrolling the record’s days before a term, to those with a diploma or GED', () => {
    expect(offered(beforeFall(c.enroll + 2), 'education/enroll')).toEqual([]);
    const open = beforeFall(c.enroll - 1);
    const counts = new Set(offered(open, 'education/enroll').map((a) => a.courses));
    expect([...counts]).toEqual(c.slots.map((_, i) => i + 1));
    expect(offered(withCollege(open, {}, 'none'), 'education/enroll')).toEqual([]);
  });

  it('enrolls in the next courses in order, which meet at their slots from the term’s first day', () => {
    let s = play(game, sim, beforeFall(10), { type: 'education/enroll', courses: 2, borrow: 'none' }).state;
    const term = edu(s).college.term as Term;
    expect(term.courses.map((x) => x.id)).toEqual(['c01', 'c02']);
    expect(term.start).toBe((fact(s, 'time.day') as number) + 10);
    expect(offered(s, 'education/enroll')).toEqual([]);
    // Study for a course counts toward it.
    const studied = play(game, sim, s, { type: 'education/study', subject: 'c02', minutes: 60 }).state;
    expect((edu(studied).college.term as Term).courses.find((x) => x.id === 'c02')?.study).toBe(60);
    // A course passed is not taken again.
    const again = play(game, sim, withCollege(beforeFall(10), { passed: ['c01'] }), {
      type: 'education/enroll',
      courses: 1,
      borrow: 'none',
    }).state;
    expect((edu(again).college.term as Term).courses.map((x) => x.id)).toEqual(['c02']);
    // To the first Monday or Tuesday at 18:00 inside the term: a class of yours meets.
    s = play(game, sim, s, advance((term.start - (fact(s, 'time.day') as number)) * MINUTES_PER_DAY)).state;
    s = play(game, sim, s, { type: 'clock/wait-until', hour: 18, minute: 0 }).state;
    for (let i = 0; i < 7 && offered(s, 'education/attend').length === 0; i++)
      s = play(game, sim, s, advance(MINUTES_PER_DAY)).state;
    const [a] = offered(s, 'education/attend');
    const t0 = fact(s, 'time.of-day') as number;
    const after = play(game, sim, s, a as never).state;
    expect(fact(after, 'time.of-day')).toBe(t0 + 75);
    expect((edu(after).college.term as Term).courses.find((x) => x.id === a?.course)?.attended).toBe(1);
  });

  it('grades on attendance and study, earns the credits at a D or better, and keeps the average', () => {
    const s0 = game.init('grades', sim);
    const day = fact(s0, 'time.day') as number;
    const term: Term = {
      id: 'fall',
      start: day,
      end: day + 16 * 7,
      courses: [
        { id: 'c01', slot: 0, attended: 0, study: 0 },
        { id: 'c02', slot: 1, attended: 0, study: 0 },
      ],
    };
    const full = { ...term.courses[0], attended: 32, study: c.study * 3 * 16 * 60 } as Term['courses'][number];
    expect(meetings(c, full, term)).toBe(32);
    expect(score(c, full, term)).toBe(100);
    term.courses[0] = full;
    const s = play(game, sim, withCollege(s0, { term }), advance(16 * 7 * MINUTES_PER_DAY + 60));
    expect(s.of('education/graded').map((g) => [g.course, g.grade])).toEqual([
      ['c01', 'A'],
      ['c02', 'F'],
    ]);
    expect(fact(s.state, 'education.credits')).toBe(3);
    expect(fact(s.state, 'education.gpa')).toBe(200);
    expect(edu(s.state).college.term).toBeNull();
    expect(edu(s.state).college.passed).toEqual(['c01']);
  });

  it('gives the associate’s at the record’s credits and average', () => {
    const s0 = game.init('associate', sim);
    const day = fact(s0, 'time.day') as number;
    const last = c.courses[c.courses.length - 1] as College['courses'][number];
    const done = c.courses.slice(0, -1).map((x) => x.id);
    const credits = c.associate - last.credits;
    const term: Term = {
      id: 'spring',
      start: day,
      end: day + 7,
      courses: [{ id: last.id, slot: 0, attended: 2, study: c.study * last.credits * 60 }],
    };
    const s = play(
      game,
      sim,
      withCollege(s0, { term, credits, points: 2 * credits, graded: credits, passed: done }),
      advance(8 * MINUTES_PER_DAY),
    );
    expect(s.of('education/earned')).toEqual([{ type: 'education/earned', credential: 'associate' }]);
    expect(fact(s.state, 'education.finished')).toBe('associate');
    expect(fact(s.state, 'education.high-school')).toBe(true);
    // Below the average, no degree however many credits.
    const low = play(
      game,
      sim,
      withCollege(s0, { term, credits, points: credits, graded: credits, passed: done }),
      advance(8 * MINUTES_PER_DAY),
    );
    expect(fact(low.state, 'education.finished')).toBe('diploma');
  });

  it('offers the courses not yet passed first, then those passed at a C or lower, the lowest first (step 8)', () => {
    const all = c.courses.map((x) => x.id);
    const grades = Object.fromEntries(all.map((id) => [id, 3]));
    const done = { ...NO_COLLEGE(), passed: all, grades: { ...grades, c07: 1, c03: 2 } };
    expect(nextCourses(c, done).map((x) => x.id)).toEqual(['c07', 'c03']);
    expect(nextCourses({ ...c, retake: undefined }, done)).toEqual([]);
    const failed = { ...NO_COLLEGE(), passed: all.filter((id) => id !== 'c05'), grades: { ...grades, c05: 0 } };
    expect(nextCourses(c, failed).map((x) => x.id)).toEqual(['c05']);
  });

  it('replaces a retaken course’s grade in the average, and gives the associate’s it was short of', () => {
    const s0 = game.init('retake', sim);
    const day = fact(s0, 'time.day') as number;
    const all = c.courses.map((x) => x.id);
    // 60 credits: 19 courses at a C and one at a D, a 1.95 average, short of the 2.00.
    const grades = { ...Object.fromEntries(all.map((id) => [id, 2])), c01: 1 };
    const points = 3 * (19 * 2 + 1);
    const term: Term = {
      id: 'fall',
      start: day,
      end: day + 7,
      courses: [{ id: 'c01', slot: 0, attended: 2, study: c.study * 3 * 60 }],
    };
    const stuck = withCollege(s0, { credits: 60, points, graded: 60, passed: all, grades });
    expect(fact(stuck, 'education.gpa')).toBe(195);
    const s = play(game, sim, withCollege(stuck, { term }), advance(8 * MINUTES_PER_DAY));
    expect(s.of('education/graded')).toEqual([{ type: 'education/graded', course: 'c01', grade: 'A', score: 100 }]);
    expect(fact(s.state, 'education.credits')).toBe(60);
    expect(fact(s.state, 'education.gpa')).toBe(Math.floor(((points - 3 + 12) * 100) / 60));
    expect(edu(s.state).college.grades.c01).toBe(4);
    expect(fact(s.state, 'education.finished')).toBe('associate');
    // An F retaken and passed: the F leaves the average and the credits come.
    const failed = withCollege(s0, {
      credits: 0,
      points: 0,
      graded: 3,
      passed: [],
      grades: { c01: 0 },
      term,
    });
    const after = play(game, sim, failed, advance(8 * MINUTES_PER_DAY)).state;
    expect(fact(after, 'education.credits')).toBe(3);
    expect(fact(after, 'education.gpa')).toBe(400);
    // A retake that goes worse leaves the better grade standing.
    const worse = { ...term, courses: [{ id: 'c01', slot: 0, attended: 0, study: 0 }] };
    const kept = play(
      game,
      sim,
      withCollege(s0, { credits: 3, points: 6, graded: 3, passed: ['c01'], grades: { c01: 2 }, term: worse }),
      advance(8 * MINUTES_PER_DAY),
    ).state;
    expect(edu(kept).college.grades.c01).toBe(2);
    expect(fact(kept, 'education.credits')).toBe(3);
    expect(fact(kept, 'education.gpa')).toBe(200);
  });
});
