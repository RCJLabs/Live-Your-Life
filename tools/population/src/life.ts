/**
 * The life bench (M2.2's second gate): the life's game with its 1,000 people, timed as the page
 * plays it. An hour passing moves one share of the people on (D30), and a month in one action
 * (sleeping it off, a sentence) moves every share thirty times over. Each is timed against the
 * same life with no people, so what the people cost stands apart from the rest of the life.
 */
import type { Action, Game, GameState, SimContext } from '@eb/core';
import { PACK } from '@lyl/content';
import { createLifeGame, lifeSim, PEOPLE } from '@lyl/sim';

const HOUR: Action = { type: 'time/advance', minutes: 60 };
const MONTH: Action = { type: 'time/advance', minutes: 30 * 24 * 60 };
const HOURS = 48;

export interface LifeReading {
  readonly people: number;
  /** Per round: the median and the slowest of a run of hours, and one month, in ms. */
  readonly hour: { median: number; worst: number }[];
  readonly month: number[];
}

function step(game: Game, sim: SimContext, state: GameState, action: Action): GameState {
  const next = game.reduce(state, action, sim);
  if (!next.accepted) throw new Error(`${action.type} was refused: ${JSON.stringify(next.beats[0])}`);
  return next.state;
}

async function measureOne(
  people: number,
  rounds: number,
  now: () => number,
  between: () => Promise<void>,
): Promise<LifeReading> {
  const game = createLifeGame({ career: 'line-cook', people });
  const sim = lifeSim(PACK.records);
  const reading: LifeReading = { people, hour: [], month: [] };
  for (let r = 0; r < rounds; r++) {
    let state = game.init(`life-bench-${r}`, sim);
    const hours: number[] = [];
    for (let h = 0; h < HOURS; h++) {
      const t0 = now();
      state = step(game, sim, state, HOUR);
      hours.push(now() - t0);
    }
    hours.sort((a, b) => a - b);
    reading.hour.push({ median: hours[Math.floor(hours.length / 2)] as number, worst: hours.at(-1) as number });
    await between();
    const t0 = now();
    step(game, sim, state, MONTH);
    reading.month.push(now() - t0);
    await between();
  }
  return reading;
}

export async function measureLife(
  rounds: number,
  now: () => number,
  between: () => Promise<void>,
): Promise<LifeReading[]> {
  return [await measureOne(0, rounds, now, between), await measureOne(PEOPLE, rounds, now, between)];
}

const median = (xs: readonly number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
const ms = (x: number) => x.toFixed(x < 10 ? 2 : 0);

export function formatLife(readings: readonly LifeReading[]): string {
  return readings
    .map((r) => {
      const hour = median(r.hour.map((h) => h.median));
      const worst = Math.max(...r.hour.map((h) => h.worst));
      return `${r.people} people: an hour ${ms(hour)} ms (slowest of ${HOURS * r.hour.length}: ${ms(worst)}); a month in one action ${ms(median(r.month))} ms (${r.month.map(ms).join(', ')})`;
    })
    .join('\n');
}
