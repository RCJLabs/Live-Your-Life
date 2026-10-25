import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { sliceSim } from '../../test/slice.ts';
import { lifeYear } from '../../test/year.ts';
import { MONTH } from './module.ts';
import { MORTALITY, mortalityOf } from './records.ts';

/** A year's chance of 90 in 100 at every age, so 80 lives tell the rate rolled from half or twice it. */
const base = mortalityOf(sliceSim().content);
const harsh = sliceSim({
  ...PACK.records,
  illness: {},
  mortality: {
    [MORTALITY]: {
      ...base,
      table: base.table.map((r) => ({
        ...r,
        carries: Math.min(40_000, r.carries * 100),
        not: Math.min(40_000, r.not * 100),
      })),
    },
  },
});

describe('the year in lives (M2.7 step 5, D103)', () => {
  it('dies at the chance the months roll: within three standard deviations over 80 lives', () => {
    let died = 0;
    let expected = 0;
    let variance = 0;
    const rolls = Math.floor(365 / MONTH);
    for (let i = 0; i < 80; i++) {
      const y = lifeYear(`year-${i}`, 30 + (i % 40), harsh);
      if (y.died) died++;
      // The month's chance is the year's over 12, rounded up, rolled every 30 days (lives/module.ts).
      const month = Math.ceil(y.expected / 12) / 100_000;
      let alive = 1;
      for (let k = 0; k < rolls; k++) alive *= 1 - month;
      expected += 1 - alive;
      variance += alive * (1 - alive);
    }
    expect(Math.abs(died - expected)).toBeLessThan(3 * Math.sqrt(variance));
  }, 120_000);
});
