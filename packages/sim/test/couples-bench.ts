/**
 * `node packages/sim/test/couples-bench.ts [lives] [weeks]`: the year's rates behind M2.6's gate.
 * The suitor bot (circle/suitor.ts) lives each seed out every evening; for each life, the day it
 * first met someone, was asked or said yes, moved in, got engaged and married, and how many
 * breakups, nights, pregnancies and births. Read against CALIBRATION.md's figures for moving in
 * and marrying. Defaults: 40 lives, 52 weeks. Slow: about a third of a second a week.
 */
import { type Action, Rng, seedsOf, turnFor } from '@eb/core';
import { suitorFor } from '../src/circle/suitor.ts';
import { sliceGame, sliceSim } from './slice.ts';

const lives = Number(process.argv[2] ?? 40);
const weeks = Number(process.argv[3] ?? 52);
const days = weeks * 7;
const game = sliceGame({ people: 1000 });
const sim = sliceSim();

/** The beats whose first day each life records. */
const FIRSTS = ['circle/met', 'circle/asked-out', 'circle/moved-in', 'circle/proposed', 'circle/married'] as const;
/** The beats each life counts. */
const COUNTS = ['circle/broke-up', 'circle/stayed', 'family/born', 'circle/found-out', 'circle/stood-up'] as const;

interface Life {
  first: Record<string, number>;
  count: Record<string, number>;
  conceived: number;
  expected: number;
  refused: number;
}

function live(seed: string): Life {
  const policy = suitorFor(days);
  let state = game.init(seed, sim);
  const rng = Rng.create(seed).fork('bot');
  const life: Life = { first: {}, count: {}, conceived: 0, expected: 0, refused: 0 };
  let pregnant = false;
  for (let turn = 0; turn < days * 200; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    // The chance of a pregnancy the night's preview shows, summed: what the year should have seen.
    if (action.type === 'circle/stay-night') {
      const turn = turnFor(game, sim, state, Rng.create('peek'), 0);
      const p = turn.preview([
        { effect: 'night-roll', person: action.person, protect: action.protect },
      ])[0] as unknown as {
        chance: number;
        pregnancy: number;
      };
      life.expected += (p.chance / 100) * (p.pregnancy / 10_000);
    }
    if (action.type === 'circle/ask-in') {
      const turn = turnFor(game, sim, state, Rng.create('peek'), 0);
      const p = turn.preview([{ effect: 'move-in-roll', person: action.person }])[0] as unknown as { chance: number };
      asks.push(`${game.fact(state, 'time.day', {}, sim)}:${p.chance}`);
    }
    const step = game.reduce(state, action, sim);
    if (!step.accepted) life.refused++;
    const day = game.fact(step.state, 'time.day', {}, sim) as number;
    for (const b of step.beats) {
      // An ask's beat comes with its answer: only a yes counts as the step taken.
      const counts = b.yes === undefined || b.yes === true;
      if (counts && (FIRSTS as readonly string[]).includes(b.type) && life.first[b.type] === undefined)
        life.first[b.type] = day;
      if (b.yes !== undefined && (FIRSTS as readonly string[]).includes(b.type)) {
        const key = `${b.type} ${b.yes ? 'yes' : 'no'}`;
        life.count[key] = (life.count[key] ?? 0) + 1;
      }
      if ((COUNTS as readonly string[]).includes(b.type)) life.count[b.type] = (life.count[b.type] ?? 0) + 1;
    }
    state = step.state;
    const now = game.fact(state, 'family.pregnant', {}, sim) === true;
    if (now && !pregnant) life.conceived++;
    pregnant = now;
  }
  return life;
}

/** Each ask to move in: the day and the chance shown. */
const asks: string[] = [];
const started = performance.now();
const all: Life[] = [];
for (const seed of seedsOf(lives, 'couples')) all.push(live(seed));
const seconds = (performance.now() - started) / 1000;

const share = (n: number) => `${n} of ${all.length} (${Math.round((100 * n) / all.length)}%)`;
const median = (xs: number[]) => (xs.length === 0 ? '—' : String([...xs].sort((a, b) => a - b)[xs.length >> 1]));
console.log(
  `${lives} lives, ${weeks} weeks, ${seconds.toFixed(0)} s (${((seconds * 1000) / (lives * weeks)).toFixed(0)} ms a week)`,
);
for (const f of FIRSTS) {
  const reached = all.filter((l) => l.first[f] !== undefined);
  console.log(`${f}: ${share(reached.length)}, median day ${median(reached.map((l) => l.first[f] as number))}`);
}
// Moving in after the first yes, the reading CALIBRATION.md's cohabitation row is held to.
const gaps = all
  .filter((l) => l.first['circle/moved-in'] !== undefined && l.first['circle/asked-out'] !== undefined)
  .map((l) => (l.first['circle/moved-in'] as number) - (l.first['circle/asked-out'] as number));
console.log(
  `moved in, days after the first yes: median ${median(gaps)}, by 120 days ${gaps.filter((g) => g <= 120).length} of ${gaps.length}`,
);
const answers = [...new Set(all.flatMap((l) => Object.keys(l.count)).filter((k) => / (yes|no)$/.test(k)))].sort();
for (const k of answers) console.log(`${k}: ${all.reduce((n, l) => n + (l.count[k] ?? 0), 0)} in all`);
for (const c of COUNTS) console.log(`${c}: ${all.reduce((n, l) => n + (l.count[c] ?? 0), 0)} in all`);
console.log(
  `pregnancies: ${all.reduce((n, l) => n + l.conceived, 0)} in all, ${all.reduce((n, l) => n + l.expected, 0).toFixed(1)} expected from the nights' previews; refused actions: ${all.reduce((n, l) => n + l.refused, 0)}`,
);
console.log(`asked to move in (day:chance): ${asks.join(' ')}`);
