/**
 * `node packages/sim/test/students-bench.ts [lives] [years]`: the student bot's years (M2.8 step 7).
 * Each life works and studies as `education/student.ts` does, from the slice's start; for each, its
 * schooling at the start, the GED if it earned one, terms enrolled, credits, average, the day it
 * earned an associate's, what aid paid, what it borrowed and owes at the end, and jobs lost. Read
 * against CALIBRATION.md's figures. Defaults: 20 lives, 3 years. Slow: about a minute a life-year.
 */
import { type Action, Rng, turnFor } from '@eb/core';
import { studentFor } from '../src/education/student.ts';
import { sliceGame, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 20);
const years = Number(process.argv[3] ?? 3);
const days = years * 365;
const game = sliceGame({ people: 1000 });
const sim = sliceSim();

interface Life {
  start: string;
  ged: number;
  terms: number;
  credits: number;
  gpa: number;
  associate: number;
  pell: number;
  borrowed: number;
  owed: number;
  letGo: number;
  attended: number;
  refused: number;
  died: boolean;
}

function live(seed: string): Life {
  const policy = studentFor(days);
  let state = game.init(seed, sim);
  const fact = (id: string) => game.fact(state, id, {}, sim);
  const rng = Rng.create(seed).fork('bot');
  const life: Life = {
    start: String(fact('education.finished')),
    ged: -1,
    terms: 0,
    credits: 0,
    gpa: 0,
    associate: -1,
    pell: 0,
    borrowed: 0,
    owed: 0,
    letGo: 0,
    attended: 0,
    refused: 0,
    died: false,
  };
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    if (!step.accepted) {
      life.refused++;
      continue;
    }
    state = step.state;
    const day = fact('time.day') as number;
    for (const b of step.beats) {
      if (b.type === 'education/earned' && b.credential === 'ged') life.ged = day;
      if (b.type === 'education/earned' && b.credential === 'associate') life.associate = day;
      if (b.type === 'education/enrolled') life.terms++;
      if (b.type === 'education/attended') life.attended++;
      if (b.type === 'education/billed') {
        life.pell += b.pell as number;
        life.borrowed += b.borrowed as number;
      }
      if (b.type === 'job/let-go') life.letGo++;
      if (b.type === 'lives/died') life.died = true;
    }
  }
  life.credits = fact('education.credits') as number;
  life.gpa = fact('education.gpa') as number;
  life.owed = fact('education.owed') as number;
  return life;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : (s[Math.floor((s.length - 1) / 2)] as number);
};
const $ = (cents: number) => `$${(cents / 100).toFixed(0)}`;

const t0 = performance.now();
const all: Life[] = [];
for (let i = 0; i < lives; i++) {
  const l = live(`student-${i}`);
  all.push(l);
  console.log(
    `student-${i}: ${l.start}${l.ged >= 0 ? ` (GED day ${l.ged})` : ''}, ${l.terms} terms, ${l.credits} credits at ${(l.gpa / 100).toFixed(2)}, associate ${l.associate >= 0 ? `day ${l.associate}` : 'no'}, Pell ${$(l.pell)}, borrowed ${$(l.borrowed)}, owes ${$(l.owed)}, let go ${l.letGo}, classes ${l.attended}, refused ${l.refused}${l.died ? ', died' : ''}`,
  );
}
const studied = all.filter((l) => l.terms > 0);
const done = all.filter((l) => l.associate >= 0);
console.log(`\n${lives} lives, ${years} years, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
console.log(`enrolled at all: ${studied.length}; earned an associate's: ${done.length}`);
console.log(
  `terms, median: ${median(studied.map((l) => l.terms))}; credits, median: ${median(studied.map((l) => l.credits))}`,
);
console.log(`average, median: ${(median(studied.map((l) => l.gpa)) / 100).toFixed(2)}`);
console.log(`days to the associate's, median: ${median(done.map((l) => l.associate))}`);
console.log(
  `borrowed at all: ${all.filter((l) => l.borrowed > 0).length}; borrowed, median of those: ${$(median(all.filter((l) => l.borrowed > 0).map((l) => l.borrowed)))}; Pell a life, median: ${$(median(studied.map((l) => l.pell)))}`,
);
console.log(`refused actions: ${all.reduce((n, l) => n + l.refused, 0)}`);
