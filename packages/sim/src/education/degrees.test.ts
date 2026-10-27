import { type Action, type GameState, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import type { EducationSlice } from './module.ts';
import { studentFor } from './student.ts';

const sim = sliceSim();
const game = sliceGame({ people: 1000 });

/** A start: an associate's at a 3.00, or a bachelor's at a 3.33 from the university. */
function start(seed: string, from: 'associate' | 'bachelor'): GameState {
  const s = game.init(seed, sim);
  const e = s.education as EducationSlice;
  const education =
    from === 'associate'
      ? { ...e, finished: 'associate', college: { ...e.college, credits: 60, graded: 60, points: 180 } }
      : {
          ...e,
          finished: 'bachelor',
          university: { ...e.university, admitted: true, credits: 120, graded: 120, points: 400 },
        };
  return { ...s, education } as GameState;
}

/** The student bot at five courses a term for `days`: the beats it saw, and nothing refused. */
function live(seed: string, state0: GameState, days: number) {
  const policy = studentFor(days, 'degree', 5);
  const rng = Rng.create(seed).fork('bot');
  const seen: { type: string; [k: string]: unknown }[] = [];
  let state = state0;
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    expect(step.accepted, `${seed}: ${JSON.stringify(action)}`).toBe(true);
    seen.push(...step.beats.filter((b) => b.type.startsWith('education/')));
    state = step.state;
  }
  return { state, seen, fact: (id: string) => game.fact(state, id, {}, sim) };
}

describe('the student bot past the associate’s (M4.2 step 5)', () => {
  it('goes from an associate’s to a bachelor’s, admitted in transfer, nothing refused', () => {
    const { seen, fact } = live('degrees-bachelor-0', start('degrees-bachelor-0', 'associate'), 1000);
    expect(seen.find((b) => b.type === 'education/admitted')).toMatchObject({ admitted: true, transfer: 60 });
    // The university's terms, never the college's; with the bachelor's and an LSAT, law school after.
    const schools = seen.filter((b) => b.type === 'education/enrolled').map((b) => b.school);
    expect(schools[0]).toBe('university');
    expect(schools.every((x) => x === 'university' || x === 'law')).toBe(true);
    expect(seen.some((b) => b.type === 'education/earned' && b.credential === 'bachelor')).toBe(true);
    expect(fact('education.finished')).toBe('bachelor');
    expect(fact('education.degree-credits') as number).toBeGreaterThanOrEqual(120);
    // One of the bench's lives (test/degrees-bench.ts); about thirty seconds.
  }, 180_000);

  it('goes from a bachelor’s through the LSAT and law school to the bar, nothing refused', () => {
    const { seen, fact } = live('degrees-law-5', start('degrees-law-5', 'bachelor'), 1400);
    const lsat = seen.find((b) => b.type === 'education/lsat');
    expect(lsat?.score as number).toBeGreaterThanOrEqual(120);
    expect(seen.some((b) => b.type === 'education/law-admitted' && b.admitted === true)).toBe(true);
    expect(seen.some((b) => b.type === 'education/earned' && b.credential === 'jd')).toBe(true);
    const bar = seen.filter((b) => b.type === 'education/bar');
    expect(bar.length).toBeGreaterThanOrEqual(1);
    expect(fact('education.licensed')).toBe(bar.some((b) => b.passed === true));
    // Borrowed through law school at its own rate.
    expect((fact('education.owed') as number) > 100_000_00).toBe(true);
  }, 240_000);
});
