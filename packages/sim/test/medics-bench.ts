/**
 * `node packages/sim/test/medics-bench.ts [nurse|emt] [lives] [days] [people]`: the medic bots
 * (M4.4 step 5), from 18 with a diploma, a line cook at the diner. For each life: the day each
 * step came (each term's grades, admitted, finished, licensed, hired) and the shifts worked since,
 * their kinds and their hours, what the events did, and anything refused. Defaults: the nurse, 10
 * lives, 1,460 days, no people.
 */
import { type Action, Rng, turnFor } from '@eb/core';
import { medicFor, type Track } from '../src/education/medic.ts';
import { medicStart } from './medic.ts';
import { sliceGame, sliceSim } from './slice.ts';

const track = (process.argv[2] ?? 'nurse') as Track;
const lives = Number(process.argv[3] ?? 10);
const days = Number(process.argv[4] ?? 1460);
const people = Number(process.argv[5] ?? 0);
const game = sliceGame({ people });
const sim = sliceSim();
const CAREER = { nurse: 'registered-nurse', emt: 'emt' }[track];

interface Life {
  steps: string[];
  shifts: Record<string, number>;
  minutes: number;
  hurt: number;
  warned: number;
  refused: number;
  end: string;
}

const STEPS = new Set([
  'education/nursing-admitted',
  'education/nursed',
  'education/nclex',
  'education/certified',
  'education/nremt',
  'market/took',
  'job/let-go',
  'lives/died',
  'health/admitted',
]);

function live(seed: string): Life {
  let state = medicStart(game, sim, seed);
  const policy = medicFor(days, track);
  const rng = Rng.create(seed).fork('bot');
  const out: Life = { steps: [], shifts: {}, minutes: 0, hurt: 0, warned: 0, refused: 0, end: '' };
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    if (!step.accepted) {
      out.refused++;
      if (out.refused < 4) console.log(seed, 'refused', JSON.stringify(action), JSON.stringify(step.beats[0]));
      continue;
    }
    state = step.state;
    const day = game.fact(state, 'time.day', {}, sim) as number;
    const mine = game.fact(state, 'job.career', {}, sim) === CAREER;
    for (const b of step.beats) {
      if (b.type === 'education/graded' && b.grade === 'F') out.steps.push(`F ${String(b.course)} d${day}`);
      if (STEPS.has(b.type)) {
        const what = Object.entries(b)
          .filter(([k]) => ['admitted', 'passed', 'career', 'reason', 'program'].includes(k))
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(' ');
        out.steps.push(`${b.type.split('/')[1]}${what ? ` ${what}` : ''} d${day}`);
      }
      if (!mine) continue;
      if (b.type === 'job/shift-over') {
        out.minutes += b.worked as number;
      }
      if (b.type === 'job/started') out.shifts.started = (out.shifts.started ?? 0) + 1;
      if (b.type === 'job/signed-up') out.shifts[String(b.shift)] = (out.shifts[String(b.shift)] ?? 0) + 1;
      if (b.type === 'health/fell-ill' && b.kind === 'injury') out.hurt++;
      if (b.type === 'job/warned') out.warned++;
    }
  }
  out.end = `d${String(game.fact(state, 'time.day', {}, sim))} ${String(game.fact(state, 'job.career', {}, sim))} employed=${String(game.fact(state, 'job.employed', {}, sim))} cash=$${Math.floor((game.fact(state, 'economy.amount', { resource: 'cash' }, sim) as number) / 100)} owed=$${Math.floor((game.fact(state, 'education.owed', {}, sim) as number) / 100)}`;
  return out;
}

const t0 = performance.now();
const all: Life[] = [];
for (let i = 0; i < lives; i++) {
  const l = live(`medics-${track}-${i}`);
  all.push(l);
  console.log(
    `${track}-${i}: ${l.steps.join('; ')}; shifts ${JSON.stringify(l.shifts)}, ${Math.round(l.minutes / 60)} h; hurt ${l.hurt}, warned ${l.warned}; refused ${l.refused}; ${l.end}`,
  );
}
const hired = all.filter((l) => l.steps.some((s) => s.startsWith('took'))).length;
console.log(
  `\n${track}: ${lives} lives, ${days} days, ${people} people, ${((performance.now() - t0) / 1000).toFixed(0)} s`,
);
console.log(`hired ${hired}; refused ${all.reduce((n, l) => n + l.refused, 0)}`);
