import { describe, expect, it } from 'vitest';
import { run } from '../src/run.ts';
import { split } from '../src/split.ts';
import { formatSweep, sweep } from '../src/sweep.ts';

// A clock that moves one millisecond each time it is read, so every timed thing takes exactly 1 ms.
const ticking = () => {
  let t = 0;
  return () => t++;
};

describe('the population harness', () => {
  it('counts the batches after the first day, and every hour toward the mean', () => {
    const hourly = run({ n: 30, cadence: 'hour', days: 3, seed: 'h', now: ticking() });
    expect(hourly.batches).toBe(48);
    expect(hourly.msPerMinute).toBe((3 * 24) / (3 * 24 * 60));
    expect([hourly.batchMs, hourly.p95Ms, hourly.worstMs, hourly.firstDayMs, hourly.monthMs]).toEqual([1, 1, 1, 1, 1]);
    const daily = run({ n: 30, cadence: 'day', days: 3, seed: 'h', now: ticking() });
    expect(daily.batches).toBe(2);
    // A staggered share is due every hour, so every hour is a batch.
    const staggered = run({ n: 48, cadence: 'staggered', days: 3, seed: 'h', now: ticking() });
    expect(staggered.batches).toBe(48);
  });

  it('counts every share of a staggered game', () => {
    const reading = run({ n: 48, cadence: 'staggered', days: 2, seed: 'h', now: ticking() });
    expect(reading.numbers).toBe(48 * 6 + 48 * 24 * 2);
    expect(reading.ties).toBeGreaterThan(0);
  });

  it('reports the slice it timed, and people who stayed well', () => {
    const reading = run({ n: 40, cadence: 'day', days: 2, seed: 'h', now: ticking() });
    expect(reading.numbers).toBe(40 * 6 + 40 * 24 * 2);
    expect(reading.peopleKB).toBeGreaterThan(1);
    expect(reading.health).toBeGreaterThan(90);
    expect(reading.lowestHealth).toBeLessThanOrEqual(reading.health);
    expect(reading.ties).toBeGreaterThan(0);
  });

  it('splits a batch into the arithmetic and the copy', () => {
    const parts = split(30, 7, ticking());
    const { n: _, ...times } = parts;
    expect(Object.keys(times)).toHaveLength(8);
    for (const ms of Object.values(times)) expect(ms).toBeGreaterThan(0);
  });

  it('sweeps every size at each cadence into two tables', async () => {
    const result = await sweep({ sizes: [10, 20], days: 2, now: ticking() });
    expect(result.runs.map((r) => `${r.n}/${r.cadence}`)).toEqual([
      '10/hour',
      '10/day',
      '10/staggered',
      '20/hour',
      '20/day',
      '20/staggered',
    ]);
    expect(formatSweep(result).split('\n')).toHaveLength(1 + 6 + 1 + 1 + 2);
  });
});
