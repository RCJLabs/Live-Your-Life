/**
 * One reading of the population harness (M0.4): N tier-1 people at one cadence for some game
 * days, played the way speed 1 plays them, one action a game hour, each action timed. Then a
 * month in one action, the way sleep at speed 3 or a prison term passes it. The clock comes in
 * from outside (`performance.now` in Node and in the page), so one file runs in both.
 */
import { canonicalJson, type GameState, utf8Length } from '@eb/core';
import { type Cadence, createPeopleGame, lifeSim, NEEDS, PERCENT, type PeopleSlice, SHARES, shareId } from '@lyl/sim';

export interface RunOptions {
  readonly n: number;
  readonly cadence: Cadence;
  readonly days: number;
  readonly seed: string;
  readonly now: () => number;
}

export interface Reading {
  readonly n: number;
  readonly cadence: Cadence;
  readonly days: number;
  /** Every game hour's action, summed, over the game minutes. */
  readonly msPerMinute: number;
  /** The hours that moved the people on after the first day: how many, the mean, the 95th and the slowest. */
  readonly batches: number;
  readonly batchMs: number;
  readonly p95Ms: number;
  readonly worstMs: number;
  /** The slowest in the first game day, while the page's code is still new to the engine running it. */
  readonly firstDayMs: number;
  /** A month in one action, after the run. */
  readonly monthMs: number;
  /** The people's slice as a save holds it, in kB, and how many numbers are in it. */
  readonly peopleKB: number;
  readonly numbers: number;
  /** Sanity, at the end: mean health and rest in percent, the lowest health, and ties a person. */
  readonly health: number;
  readonly rest: number;
  readonly lowestHealth: number;
  readonly ties: number;
}

const HOUR = { type: 'time/advance', hours: 1 } as const;
const MONTH = { type: 'time/advance', days: 30 } as const;

/** Every share's settled hour, joined: it changes when any share is moved on. */
const settled = (shares: readonly PeopleSlice[]) => shares.map((s) => s.hour).join();

export function run({ n, cadence, days, seed, now }: RunOptions): Reading {
  const game = createPeopleGame({ n, cadence });
  const sim = lifeSim();
  const sharesOf = (state: GameState) =>
    Array.from({ length: SHARES[cadence] }, (_, k) => state[shareId(k, SHARES[cadence])] as PeopleSlice);
  let state = game.init(seed, sim);
  let total = 0;
  const first: number[] = [];
  const batches: number[] = [];
  for (let h = 0; h < days * 24; h++) {
    const before = settled(sharesOf(state));
    const t0 = now();
    const step = game.reduce(state, HOUR, sim);
    const ms = now() - t0;
    if (!step.accepted) throw new Error(`the harness's hour was refused: ${JSON.stringify(step.beats)}`);
    state = step.state;
    total += ms;
    if (settled(sharesOf(state)) !== before) (h < 24 ? first : batches).push(ms);
  }
  const t1 = now();
  const month = game.reduce(state, MONTH, sim);
  const monthMs = now() - t1;
  const sorted = [...batches].sort((a, b) => a - b);
  return {
    n,
    cadence,
    days,
    msPerMinute: total / (days * 24 * 60),
    batches: batches.length,
    batchMs: batches.reduce((s, ms) => s + ms, 0) / Math.max(1, batches.length),
    p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0,
    worstMs: sorted[sorted.length - 1] ?? 0,
    firstDayMs: Math.max(0, ...first),
    monthMs,
    ...sizeOf(sharesOf(state)),
    ...sanity(sharesOf(month.state), n),
  };
}

function sizeOf(shares: readonly PeopleSlice[]) {
  return {
    peopleKB: shares.reduce((kB, s) => kB + utf8Length(canonicalJson(s)) / 1024, 0),
    numbers: shares.reduce((count, s) => count + s.levels.length + s.ties.length, 0),
  };
}

function sanity(shares: readonly PeopleSlice[], n: number) {
  const health = NEEDS.indexOf('health');
  const rest = NEEDS.indexOf('rest');
  let sumHealth = 0;
  let sumRest = 0;
  let lowestHealth = 100;
  let ties = 0;
  for (const share of shares) {
    for (let row = 0; row < share.count; row++) {
      const level = (k: number) => (share.levels[row * NEEDS.length + k] as number) / PERCENT;
      sumHealth += level(health);
      sumRest += level(rest);
      lowestHealth = Math.min(lowestHealth, level(health));
    }
    for (let t = 0; t < share.ties.length; t += 2) if ((share.ties[t] as number) >= 0) ties++;
  }
  return { health: sumHealth / n, rest: sumRest / n, lowestHealth, ties: ties / n };
}
