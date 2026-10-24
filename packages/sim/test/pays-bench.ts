/**
 * `node packages/sim/test/pays-bench.ts [lives] [weeks]`: the reading behind M2.4's realism bar
 * B6, that crime pays less than work once arrests and time are counted. Dealers (dealer.ts) and
 * line cooks (the steady bot) play the same seeds; each life's worth at the end is its cash less
 * what it owes the court, the landlord and the supplier. Also: how many dealers were raided,
 * convicted and sentenced to prison. Defaults: 60 lives, 8 weeks.
 */
import { playRun, seedsOf } from '@eb/core';
import { createLifeGame, dealerFor, steadyFor } from '../src/index.ts';
import { LINE_COOK, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 60);
const weeks = Number(process.argv[3] ?? 8);
const days = weeks * 7;
const sim = sliceSim();
const dealing = createLifeGame({ people: 0 });
const cooking = createLifeGame({ people: 0, career: LINE_COOK });
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const at = (xs: number[], q: number) => sorted(xs)[Math.min(xs.length - 1, Math.floor(q * xs.length))] as number;
const dollars = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

function worth(game: typeof dealing, state: Parameters<typeof dealing.fact>[0]): number {
  const f = (id: string, args?: object) => game.fact(state, id, args as never, sim) as number;
  return f('economy.amount', { resource: 'cash' }) - f('law.owed') - f('home.owed') - f('deal.owed');
}

const dealers: number[] = [];
const cooks: number[] = [];
const tally = { raided: 0, convicted: 0, prison: 0, sentences: 0 };
for (const seed of seedsOf(lives, 'pays')) {
  const d = playRun(dealing, sim, { seed, policy: dealerFor(days), maxTurns: 200_000 });
  dealers.push(worth(dealing, d.state));
  tally.raided += d.beats['law/raided'] ?? 0;
  tally.convicted += d.beats['law/convicted'] ?? 0;
  tally.prison += d.beats['prison/admitted'] ?? 0;
  tally.sentences += d.beats['law/sentenced'] ?? 0;
  const c = playRun(cooking, sim, { seed, policy: steadyFor(days), maxTurns: 200_000 });
  cooks.push(worth(cooking, c.state));
}
const line = (name: string, xs: number[]) =>
  `${name}: median ${dollars(at(xs, 0.5))}, 10th ${dollars(at(xs, 0.1))}, 90th ${dollars(at(xs, 0.9))}, best ${dollars(at(xs, 1))}`;
console.log(`${lives} lives, ${weeks} weeks`);
console.log(line('dealers', dealers));
console.log(line('cooks  ', cooks));
console.log(
  `dealers raided ${tally.raided}, convicted ${tally.convicted}, sentenced ${tally.sentences}, sent to prison ${tally.prison}`,
);
console.log(`dealers worth more than the median cook: ${dealers.filter((x) => x > at(cooks, 0.5)).length} of ${lives}`);
