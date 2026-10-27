/**
 * `node packages/sim/test/bosses-bench.ts [lives] [weeks]`: B6 at a crew's tier (M4.1 step 6). Bosses
 * (boss-bot.ts, from test/boss.ts's first morning: in the crew, the connect met, $20,000, four people
 * known well) and line cooks (the steady bot, from the usual $300) play the same seeds, the 1,000
 * people in both. Each life's gain is its worth at the end, cash less what it owes the court, the
 * landlord and the supplier, less the cash it started with. Also the crew's toll: raids, prison,
 * beatings, seizures, members taken in. Defaults: 40 lives, 52 weeks.
 */
import { type Action, type GameState, Rng, seedsOf, turnFor } from '@eb/core';
import { bossFor, createLifeGame, START_CASH, steadyFor } from '../src/index.ts';
import { bossLife, START } from './boss.ts';
import { LINE_COOK, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 40);
const weeks = Number(process.argv[3] ?? 52);
const days = weeks * 7;
const sim = sliceSim();
const bossing = createLifeGame({ people: 1000, events: false, unlocked: true });
const cooking = createLifeGame({ people: 1000, events: false, unlocked: true, career: LINE_COOK });
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const at = (xs: number[], q: number) => sorted(xs)[Math.min(xs.length - 1, Math.floor(q * xs.length))] as number;
const dollars = (c: number) => `${c < 0 ? '−' : ''}$${Math.abs(Math.round(c / 100)).toLocaleString('en-US')}`;

function worth(game: typeof bossing, state: GameState): number {
  const f = (id: string, args?: object) => game.fact(state, id, args as never, sim) as number;
  return f('economy.amount', { resource: 'cash' }) - f('law.owed') - f('home.owed') - f('deal.owed');
}

function live(game: typeof bossing, start: GameState, policy: ReturnType<typeof bossFor>, seed: string) {
  let s = start;
  const rng = Rng.create(seed).fork('bot');
  const beats: Record<string, number> = {};
  for (let turn = 0; turn < 1_000_000; turn++) {
    const a = policy.choose(turnFor(game, sim, s, rng, turn)) as Action | null;
    if (!a) break;
    const r = game.reduce(s, a, sim);
    for (const b of r.beats) beats[b.type] = (beats[b.type] ?? 0) + 1;
    s = r.state;
  }
  return { state: s, beats };
}

const bosses: number[] = [];
const cooks: number[] = [];
const toll: Record<string, number> = {};
const TOLL = [
  'law/raided',
  'prison/admitted',
  'deal/beaten',
  'deal/cash-seized',
  'deal/member-arrested',
  'law/charged',
  'lives/died',
];
const t0 = performance.now();
for (const seed of seedsOf(lives, 'bosses')) {
  const b = live(bossing, bossLife(bossing, sim, seed), bossFor(days), seed);
  bosses.push(worth(bossing, b.state) - START);
  for (const k of TOLL) toll[k] = (toll[k] ?? 0) + (b.beats[k] ?? 0);
  const c = live(cooking, cooking.init(seed, sim), steadyFor(days), seed);
  cooks.push(worth(cooking, c.state) - START_CASH);
}
const line = (name: string, xs: number[]) =>
  `${name}: median ${dollars(at(xs, 0.5))}, 10th ${dollars(at(xs, 0.1))}, 90th ${dollars(at(xs, 0.9))}, best ${dollars(at(xs, 1))}`;
console.log(`${lives} lives, ${weeks} weeks, ${Math.round((performance.now() - t0) / 1000)} s`);
console.log(line('bosses gained', bosses));
console.log(line('cooks gained ', cooks));
console.log(`bosses' toll: ${TOLL.map((k) => `${k} ${toll[k]}`).join(', ')}`);
console.log(
  `bosses who gained more than the median cook: ${bosses.filter((x) => x > at(cooks, 0.5)).length} of ${lives}`,
);
