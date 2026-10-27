/**
 * `node packages/sim/test/degrees-bench.ts [lives] [path]`: the student bot past the associate's
 * (M4.2 step 5), five courses a term. `bachelor` starts with an associate's at a 3.00 and runs to
 * the bachelor's; `law` starts with a bachelor's at a 3.33 and runs to the bar. For each life: the
 * day of each step, the average, what is owed at the end, jobs lost, and anything refused.
 * Defaults: 10 lives, both paths. About 40 seconds a life.
 */
import { type Action, type GameState, Rng, turnFor } from '@eb/core';
import type { EducationSlice } from '../src/education/module.ts';
import { studentFor } from '../src/education/student.ts';
import { sliceGame, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 10);
const paths = process.argv[3] ? [process.argv[3]] : ['bachelor', 'law'];
const game = sliceGame({ people: 1000 });
const sim = sliceSim();
const DAYS = { bachelor: 1500, law: 2000 } as Record<string, number>;
const STEPS = [
  'education/admitted',
  'education/lsat',
  'education/law-admitted',
  'education/earned',
  'education/bar',
  'job/let-go',
];

function start(seed: string, path: string): GameState {
  const s = game.init(seed, sim);
  const e = s.education as EducationSlice;
  const education =
    path === 'bachelor'
      ? { ...e, finished: 'associate', college: { ...e.college, credits: 60, graded: 60, points: 180 } }
      : {
          ...e,
          finished: 'bachelor',
          university: { ...e.university, admitted: true, credits: 120, graded: 120, points: 400 },
        };
  return { ...s, education } as GameState;
}

function live(seed: string, path: string) {
  const days = DAYS[path] as number;
  let state = start(seed, path);
  const goal = path === 'bachelor' ? 'bachelor' : 'licensed';
  const policy = studentFor(days, 'degree', 5);
  const rng = Rng.create(seed).fork('bot');
  const steps: string[] = [];
  let refused = 0;
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    if (!step.accepted) {
      refused++;
      continue;
    }
    const day = game.fact(step.state, 'time.day', {}, sim) as number;
    for (const b of step.beats.filter((x) => STEPS.includes(x.type))) {
      const what = b.type.split('/')[1];
      const detail = b.score ?? b.credential ?? b.admitted ?? b.passed ?? b.reason;
      steps.push(`${what}:${String(detail)}@${day}`);
    }
    state = step.state;
    const done =
      goal === 'bachelor'
        ? game.fact(state, 'education.finished', {}, sim) === 'bachelor'
        : game.fact(state, 'education.licensed', {}, sim) === true;
    if (done) break;
  }
  const e = state.education as EducationSlice;
  const school = path === 'bachelor' ? e.university : e.law;
  const gpa = school.graded > 0 ? Math.floor((school.points * 100) / school.graded) / 100 : 0;
  const owed = Math.round((game.fact(state, 'education.owed', {}, sim) as number) / 100);
  return { day: game.fact(state, 'time.day', {}, sim), gpa, owed, refused, steps: steps.join(' ') };
}

for (const path of paths) {
  console.log(`\n${path}: ${lives} lives`);
  for (let i = 0; i < lives; i++) {
    const t0 = performance.now();
    const r = live(`degrees-${path}-${i}`, path);
    console.log(JSON.stringify({ ...r, s: Math.round((performance.now() - t0) / 1000) }));
  }
}
