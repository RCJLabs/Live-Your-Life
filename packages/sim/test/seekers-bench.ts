/**
 * `node packages/sim/test/seekers-bench.ts [lives] [days]`: the seeker bot's search (M2.3). Each life
 * starts with no job and looks for one as `bot.ts`'s seeker does; for each, the day it was hired and
 * into what. Read against the real median spell out of work (CALIBRATION.md). Defaults: 500 lives,
 * 60 days.
 */
import { type Action, Rng, seedsOf, turnFor } from '@eb/core';
import { seekerFor } from '../src/bot.ts';
import { sliceGame, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 500);
const days = Number(process.argv[3] ?? 60);
const game = sliceGame({ career: undefined });
const sim = sliceSim();

const hiredOn: number[] = [];
const careers = new Map<string, number>();
let refused = 0;
const started = performance.now();
for (const seed of seedsOf(lives, 'seekers')) {
  const policy = seekerFor(days);
  let state = game.init(seed, sim);
  const rng = Rng.create(seed).fork('bot');
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    if (!step.accepted) {
      refused++;
      continue;
    }
    state = step.state;
    const hire = step.beats.find((b) => b.type === 'job/hired');
    if (hire) {
      hiredOn.push(game.fact(state, 'time.day', {}, sim) as number);
      careers.set(hire.career as string, (careers.get(hire.career as string) ?? 0) + 1);
      break;
    }
  }
}
const sorted = [...hiredOn].sort((a, b) => a - b);
const at = (q: number) => sorted[Math.floor(q * (sorted.length - 1))];
console.log(
  `${lives} lives, ${days} days, ${((performance.now() - started) / 1000).toFixed(0)} s. Hired: ${hiredOn.length} ` +
    `(${((100 * hiredOn.length) / lives).toFixed(0)}%), median day ${at(0.5)}, 90th day ${at(0.9)}. ` +
    `Careers reached: ${careers.size}. Refused: ${refused}.`,
);
console.log(
  [...careers.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c} ${n}`)
    .join(', '),
);
