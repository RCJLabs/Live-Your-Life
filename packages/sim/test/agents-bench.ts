/**
 * `node packages/sim/test/agents-bench.ts [lives] [days] [people]`: the agent bot (M4.3 step 5),
 * from 26 with a bachelor's and two years as an accountant. For each life: each application's
 * stages and how it ended, the day it reported, was sworn and reached each grade, its cases and
 * how each ended, and anything refused; then the share of applications that ended cleared, read
 * against the real figure of about 2 in 100 of all applicants hired. Defaults: 20 lives, 1,100
 * days, the 1,000 people.
 */
import { type Action, Rng, turnFor } from '@eb/core';
import { agentFor } from '../src/federal/agent.ts';
import { agentGame, agentStart } from './agent.ts';
import { sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 20);
const days = Number(process.argv[3] ?? 1100);
const people = Number(process.argv[4] ?? 1000);
const game = agentGame(people);
const sim = sliceSim();

interface Life {
  steps: string[];
  applied: number;
  cleared: number;
  failed: Record<string, number>;
  cases: string[];
  refused: number;
}

function live(seed: string): Life {
  let state = agentStart(game, sim, seed);
  const policy = agentFor(days);
  const rng = Rng.create(seed).fork('bot');
  const out: Life = { steps: [], applied: 0, cleared: 0, failed: {}, cases: [], refused: 0 };
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    if (!step.accepted) {
      out.refused++;
      if (out.refused < 4) console.log(seed, 'refused', JSON.stringify(action));
      continue;
    }
    state = step.state;
    const day = game.fact(state, 'time.day', {}, sim) as number;
    for (const b of step.beats) {
      if (b.type === 'federal/applied') out.applied++;
      if (b.type === 'federal/cleared') out.cleared++;
      if (b.type === 'federal/failed') out.failed[String(b.stage)] = (out.failed[String(b.stage)] ?? 0) + 1;
      if (b.type === 'federal/convicted' || b.type === 'federal/declined')
        out.cases.push(`${b.type.slice(8)} ${String(b.target)} d${day}`);
      if (['federal/reported', 'job/promoted', 'job/let-go', 'federal/opened'].includes(b.type))
        out.steps.push(`${b.type.split('/')[1]}${b.career ? ` ${String(b.career)}` : ''} d${day}`);
    }
  }
  return out;
}

const all: Life[] = [];
const t0 = performance.now();
for (let i = 0; i < lives; i++) {
  const l = live(`agents-${i}`);
  all.push(l);
  console.log(
    `agents-${i}: applied ${l.applied}, cleared ${l.cleared}, failed ${JSON.stringify(l.failed)}; ${l.steps.join('; ')}; cases: ${l.cases.join(', ') || 'none'}; refused ${l.refused}`,
  );
}
const applied = all.reduce((n, l) => n + l.applied, 0);
const cleared = all.reduce((n, l) => n + l.cleared, 0);
const failed: Record<string, number> = {};
for (const l of all) for (const [k, v] of Object.entries(l.failed)) failed[k] = (failed[k] ?? 0) + v;
console.log(`\n${lives} lives, ${days} days, ${people} people, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
console.log(
  `applications ${applied}, cleared ${cleared} (${((100 * cleared) / Math.max(1, applied)).toFixed(1)} in 100)`,
);
console.log(`failed by stage ${JSON.stringify(failed)}`);
const sworn = all.filter((l) => l.steps.some((s) => s.startsWith('promoted special-agent '))).length;
console.log(
  `sworn ${sworn}; cases ${all.reduce((n, l) => n + l.cases.length, 0)}, convicted ${all.reduce((n, l) => n + l.cases.filter((c) => c.startsWith('convicted')).length, 0)}`,
);
console.log(`refused ${all.reduce((n, l) => n + l.refused, 0)}`);
