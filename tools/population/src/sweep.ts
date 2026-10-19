/**
 * The whole harness (M0.4): every head count at each cadence, then where a batch's time goes at
 * each head count, as text for ROADMAP.md's Readings. The same in Node (bench.ts) and in the
 * page that headless Chromium runs (chromium.ts).
 */
import { CADENCES } from '@lyl/sim';
import { type Reading, run } from './run.ts';
import { type Split, split } from './split.ts';

/** ROADMAP.md's four head counts, and risk 2's 500. */
export const SIZES = [100, 300, 500, 1000, 3000] as const;
export const DAYS = 30;
export const SEED = 'population';

export interface SweepOptions {
  readonly sizes: readonly number[];
  readonly days: number;
  readonly now: () => number;
  /** Called between readings, so a page can yield and show progress. */
  readonly between?: (done: string) => Promise<void>;
}

export interface SweepResult {
  readonly runs: readonly Reading[];
  readonly splits: readonly Split[];
}

export async function sweep({ sizes, days, now, between }: SweepOptions): Promise<SweepResult> {
  const runs: Reading[] = [];
  const splits: Split[] = [];
  for (const n of sizes) {
    for (const cadence of CADENCES) {
      runs.push(run({ n, cadence, days, seed: SEED, now }));
      await between?.(`${n} by the ${cadence}`);
    }
    splits.push(split(n, 0x5eed, now));
    await between?.(`${n}, split`);
  }
  return { runs, splits };
}

const ms = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));

/** The readings as two tables of text. */
export function formatSweep({ runs, splits }: SweepResult): string {
  const lines = [
    'people | cadence | ms a game minute | batches after day 1 | mean ms | 95th ms | worst ms | worst on day 1 ms | a month in one action, ms | people kB | numbers | health % (lowest) | rest % | ties a person',
    ...runs.map((r) =>
      [
        r.n,
        r.cadence,
        r.msPerMinute.toFixed(4),
        r.batches,
        ms(r.batchMs),
        ms(r.p95Ms),
        ms(r.worstMs),
        ms(r.firstDayMs),
        ms(r.monthMs),
        r.peopleKB.toFixed(0),
        r.numbers,
        `${r.health.toFixed(0)} (${r.lowestHealth.toFixed(0)})`,
        r.rest.toFixed(0),
        r.ties.toFixed(1),
      ].join(' | '),
    ),
    '',
    "people | an hour, alone ms | a day, alone ms | an hour's plan, alone ms | kernel copy ms | kernel copy and freeze ms | lean copy and freeze ms | a share's day, alone ms | a share's copy and freeze ms",
    ...splits.map((s) =>
      [
        s.n,
        ms(s.hourMs),
        ms(s.dayMs),
        ms(s.planMs),
        ms(s.copyMs),
        ms(s.copyFreezeMs),
        ms(s.leanMs),
        ms(s.shareDayMs),
        ms(s.shareCopyFreezeMs),
      ].join(' | '),
    ),
  ];
  return lines.join('\n');
}
