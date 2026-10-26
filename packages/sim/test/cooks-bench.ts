/**
 * `node packages/sim/test/cooks-bench.ts [lives] [years]`: the cook bot's years (M2.5 step 5).
 * Each life is the steady bot at the diner from the slice's start, living as `bot.ts` does, for
 * the years asked; for each, the day it became a kitchen lead and a chef, the hours it had worked
 * by then, its standing at the end, the shifts worked and missed, and jobs lost. Read against the
 * rungs' hours in CALIBRATION.md (D121, D122). Defaults: 20 lives, 5 years. About 8 seconds a life-year.
 */
import { type Action, Rng, turnFor } from '@eb/core';
import { steadyFor } from '../src/bot.ts';
import { sliceGame, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 20);
const years = Number(process.argv[3] ?? 5);
const days = years * 365;
const game = sliceGame({ people: 1000 });
const sim = sliceSim();

interface Life {
  lead: number;
  chef: number;
  leadHours: number;
  chefHours: number;
  hours: number;
  standing: number;
  career: string;
  shifts: number;
  missed: number;
  letGo: number;
  refused: number;
  died: boolean;
}

function live(seed: string): Life {
  const policy = steadyFor(days);
  let state = game.init(seed, sim);
  const fact = (id: string, args: Record<string, unknown> = {}) => game.fact(state, id, args, sim);
  const worked = () =>
    ['line-cook', 'kitchen-lead', 'chef'].reduce((n, career) => n + (fact('job.worked', { career }) as number), 0) / 60;
  const rng = Rng.create(seed).fork('bot');
  const life: Life = {
    lead: -1,
    chef: -1,
    leadHours: 0,
    chefHours: 0,
    hours: 0,
    standing: 0,
    career: '',
    shifts: 0,
    missed: 0,
    letGo: 0,
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
      if (b.type === 'job/promoted' && b.career === 'kitchen-lead') {
        life.lead = day;
        life.leadHours = Math.round(worked());
      }
      if (b.type === 'job/promoted' && b.career === 'chef') {
        life.chef = day;
        life.chefHours = Math.round(worked());
      }
      if (b.type === 'job/worked') life.shifts++;
      if (b.type === 'job/no-show') life.missed++;
      if (b.type === 'job/let-go') life.letGo++;
      if (b.type === 'lives/died') life.died = true;
    }
    if (life.died) break;
  }
  life.hours = Math.round(worked());
  life.standing = fact('job.standing') as number;
  life.career = String((state.job as { career: string | null }).career);
  return life;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : (s[Math.floor((s.length - 1) / 2)] as number);
};

const started = performance.now();
const all: Life[] = [];
for (let i = 0; i < lives; i++) {
  const life = live(`cook-${i}`);
  all.push(life);
  console.log(
    `cook-${i}: lead day ${life.lead} (${life.leadHours} h), chef day ${life.chef} (${life.chefHours} h), ` +
      `${life.hours} h worked, ${life.shifts} shifts, ${life.missed} missed, standing ${life.standing}, ` +
      `ends ${life.career}, let go ${life.letGo}, refused ${life.refused}${life.died ? ', died' : ''}`,
  );
}
const leads = all.filter((l) => l.lead >= 0);
const chefs = all.filter((l) => l.chef >= 0);
console.log(
  `\n${lives} lives, ${years} years, ${((performance.now() - started) / 1000).toFixed(0)} s. ` +
    `Kitchen lead: ${leads.length} of ${lives}, median day ${median(leads.map((l) => l.lead))}. ` +
    `Chef: ${chefs.length} of ${lives}, median day ${median(chefs.map((l) => l.chef))}. ` +
    `Median hours a year worked: ${median(all.map((l) => l.hours / years)).toFixed(0)}. ` +
    `Refused: ${all.reduce((n, l) => n + l.refused, 0)}. Let go: ${all.filter((l) => l.letGo > 0).length}. ` +
    `Died: ${all.filter((l) => l.died).length}.`,
);
