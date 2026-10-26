import { type Action, type GameState, Rng, seedsOf, turnFor } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../test/slice.ts';
import { lifeSim } from './content.ts';
import { COSTS, RENT } from './dials.ts';
import { createLifeGame } from './game.ts';
import type { CareerRecord, TaxRecord } from './job/records.ts';
import { paycheck } from './job/withholding.ts';
import { hireOdds } from './market/odds.ts';
import { climateOf, gasBill } from './season/climate.ts';
import { thiefFor } from './thief.ts';

// The realism bars (docs/CALIBRATION.md, M2.12): what the first year must answer like the real
// one. B6 is deal/week.test.ts's, where the dealer and the line cook are lived side by side.

const sim = lifeSim(PACK.records);
const careers = sim.content
  .ids('career')
  .map((id) => [id, sim.content.get<CareerRecord>('career', id) as CareerRecord] as const);
const MINIMUM = 1248;

/** A year's net pay, full time: 40 hours a week for 52 weeks, withheld as the line cook's pay is. */
function netYear(wage: number): number {
  const taxes = (sim.content.get<CareerRecord>('career', 'line-cook') as CareerRecord).withholding.map(
    (t) => [t, sim.content.get<TaxRecord>('tax', t) as TaxRecord] as const,
  );
  const week = wage * 40;
  let net = 0;
  for (let w = 0; w < 52; w++) net += paycheck(taxes, week, 52, week * w).net;
  return net;
}

/** A year of essentials (D140): the studio's rent, the gas by the month's cold, the other bills, three meals a day. */
function essentials(): number {
  const climate = climateOf(sim.content);
  const gas = Array.from({ length: 12 }, (_, m) => gasBill(climate, m + 1)).reduce((a, b) => a + b, 0);
  const bills = sim.content
    .ids('bill')
    .reduce((n, id) => n + (sim.content.get<{ cents: number }>('bill', id)?.cents ?? 0), 0);
  return RENT * 12 + gas + bills * 12 + COSTS.eat * 3 * 365;
}

const left = (wage: number) => {
  const net = netYear(wage);
  return (net - essentials()) / net;
};

describe('the realism bars (CALIBRATION.md, M2.12)', () => {
  it('B1: full time at the median wage, a year of essentials leaves over two-fifths of net pay', () => {
    const wages = careers.map(([, c]) => c.wage).sort((a, b) => a - b);
    const median = wages[Math.floor(wages.length / 2)] as number;
    console.log(`B1: median wage ${median}¢ an hour leaves ${(left(median) * 100).toFixed(1)}%`);
    expect(left(median)).toBeGreaterThan(0.4);
  });

  it('B2: full time at the minimum wage, it leaves under a third', () => {
    console.log(`B2: the minimum wage leaves ${(left(MINIMUM) * 100).toFixed(1)}%`);
    expect(left(MINIMUM)).toBeLessThan(1 / 3);
    expect(left(MINIMUM)).toBeGreaterThan(0);
  });

  it('B3: one uninsured hospital day costs more than a month’s rent', () => {
    const illness = sim.content.get<{ hospital: { none: number } }>('illness', 'michigan');
    expect(illness?.hospital.none ?? 0).toBeGreaterThan(RENT);
  });

  it('B4: a record cuts the odds of being taken on by about half, for every career', () => {
    const you = { convictions: 0, felonies: 0, reputation: 50, schooling: 'high-school' as const };
    for (const [id, c] of careers) {
      const clean = hireOdds(c, you);
      const marked = hireOdds(c, { ...you, convictions: 1, felonies: 1 });
      expect(marked / clean, id).toBeGreaterThan(0.3);
      expect(marked / clean, id).toBeLessThan(0.7);
    }
  });

  it('B5: a body let run down carries a higher chance of dying than one looked after', () => {
    const game = sliceGame({ career: undefined });
    const s0 = game.init('b5', sliceSim());
    const life = s0.life as { levels: Record<string, number> };
    const run = { ...s0, life: { ...life, levels: { ...life.levels, health: 0 } } } as GameState;
    const kept = game.preview(s0, [{ effect: 'die', cause: 'age' }], sliceSim())[0] as unknown as { chance: number };
    const down = game.preview(run, [{ effect: 'die', cause: 'age' }], sliceSim())[0] as unknown as { chance: number };
    console.log(`B5: a month's chance per 100,000, ${kept.chance} looked after, ${down.chance} run down`);
    expect(down.chance).toBeGreaterThan(kept.chance);
  });

  it('B7: most shoplifting goes unnoticed at the moment, and none of it is a prison offence', {
    timeout: 300_000,
  }, () => {
    const game = createLifeGame({ people: 0, events: false, unlocked: true });
    let took = 0;
    let held = 0;
    for (const seed of seedsOf(60, 'b7')) {
      // A careful thief: it steals only while the odds shown are one in ten or better.
      const bot = thiefFor(7, 'careful', 10);
      let s = game.init(seed, sim);
      const rng = Rng.create(seed).fork('bot');
      for (let turn = 0; turn < 3000; turn++) {
        const a = bot.choose(turnFor(game, sim, s, rng, turn)) as Action | null;
        if (!a) break;
        const step = game.reduce(s, a, sim);
        for (const b of step.beats) {
          if (b.type === 'law/took') took++;
          if (b.type === 'law/held') held++;
        }
        s = step.state;
      }
    }
    console.log(`B7: ${held} held of ${took + held} takes`);
    expect(took + held).toBeGreaterThan(50);
    // Nine in ten get away at the till (tune: a tenth either way).
    expect(held / (took + held)).toBeLessThan(0.14);
    // Retail fraud in the second and third degree are misdemeanours: up to a year in jail, not prison.
    const crime = sim.content.get<{ offences: string[] }>('crime', 'shoplifting');
    for (const o of crime?.offences ?? [])
      expect(sim.content.get<{ days: number }>('offence', o)?.days, o).toBeLessThanOrEqual(365);
  });
});
