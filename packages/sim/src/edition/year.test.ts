import { seedsOf } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { liveTheYear } from '../../test/free-year.ts';

// Phase 2's year gate in small (M2.11 step 4): year-bench.ts runs it in 500 seeds.
describe('the free year, lived (M2.11 step 4)', () => {
  it('reaches the year’s end on day 365, or dies, with nothing refused, in 3 seeds', { timeout: 120_000 }, () => {
    for (const seed of seedsOf(3, 'year')) {
      const y = liveTheYear(seed);
      expect(y.refused, seed).toBe(0);
      expect(['year-end', 'dead'], seed).toContain(y.end);
      if (y.end === 'year-end') expect(y.day, seed).toBe(365);
    }
  });
});
