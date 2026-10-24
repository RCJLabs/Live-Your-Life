import { type Action, type GameState, type Policy, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { lineCook, sliceGame, sliceSim } from '../../test/slice.ts';
import { randomLifePolicy, steadyPolicy } from '../bot.ts';
import { todayOf } from '../job/days.ts';
import { KEPT } from './memory.ts';
import { works } from './person.ts';
import { actOf, type Crew } from './records.ts';
import type { TiesSlice } from './state.ts';

const game = sliceGame();
const sim = sliceSim();
const crew = lineCook().crew as Crew;
const MAX_TURNS = 3000;
const ties = (state: GameState) => state.ties as TiesSlice;

interface Tally {
  acts: Set<string>;
  asks: number;
  shared: number;
}

/** Whether they were on a day's shift with you, read from the life before the turn. */
function beside(state: GameState, day: number): boolean {
  const who = ties(state).coworker;
  if (!who || ties(state).off.includes(day)) return false;
  // Hired away from the diner (M2.3), you're beside them no more.
  if (game.fact(state, 'market.at-diner', undefined, sim) === false) return false;
  return works(who, crew, todayOf({ fact: (id) => game.fact(state, id, undefined, sim) }), day);
}

/** One turn's beats held to M1.4's gates; returns the minutes worked beside them in it. */
function checkTurn(before: GameState, after: GameState, beats: readonly Record<string, unknown>[], tally: Tally) {
  let regard = ties(before).regard;
  let minutes = 0;
  for (const beat of beats) {
    if (beat.type === 'job/worked' && beside(before, beat.day as number)) minutes += beat.minutes as number;
    if (beat.type !== 'ties/remembered') continue;
    const act = beat.act as string;
    tally.acts.add(act);
    regard = Math.min(100, Math.max(0, regard + actOf(sim.content, act).regard));
    expect(beat.regard, act).toBe(regard);
    expect(ties(after).memory.some((m) => m.act === act)).toBe(true);
  }
  expect(ties(after).memory.length).toBeLessThanOrEqual(KEPT);
  return minutes;
}

function playWeeks(policy: Policy, seeds: readonly string[], tally: Tally): void {
  for (const seed of seeds) {
    let state = game.init(seed, sim);
    let together = 0;
    const rng = Rng.create(seed).fork('bot');
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const t = turnFor(game, sim, state, rng, turn);
      const action = policy.choose(t) as Action | null;
      if (!action) break;
      const shown =
        action.type === 'ties/ask-cover'
          ? (t.preview([{ effect: 'cover-ask', day: action.day }])[0]?.chance as number)
          : null;
      const step = game.reduce(state, action, sim);
      expect(step.accepted, JSON.stringify(action)).toBe(true);
      if (shown !== null) {
        const rolled = step.beats.find((b) => b.type === 'logic/rolled');
        expect(rolled?.outcome === 0 ? rolled.chance : 100 - (rolled?.chance as number)).toBe(shown);
        tally.asks++;
      }
      together += checkTurn(state, step.state, step.beats, tally);
      state = step.state;
    }
    // Familiarity grows exactly by the minutes worked beside them, and in no other run.
    expect(ties(state).together, seed).toBe(together);
    if (together > 0) tally.shared++;
  }
}

// M1.4's gates over the bots' weeks: every act comes up and moves regard by its weight; what
// they remember stays within 8 kinds; familiarity grows only with time beside them; and the odds
// shown for a cover are the odds rolled (a regard choice's are held to that in week.test.ts).
describe('the coworker in the bots’ weeks', () => {
  it('reaches every act, and holds regard, memory, familiarity and the cover odds to the rules', {
    timeout: 120_000,
  }, () => {
    const tally: Tally = { acts: new Set(), asks: 0, shared: 0 };
    playWeeks(steadyPolicy, seedsOf(500, 'ties'), tally);
    const steadyShared = tally.shared;
    playWeeks(randomLifePolicy, seedsOf(300, 'ties-random'), tally);
    // Prison's acts (M2.4, D81) are reached by prison/module.test.ts: these bots never go inside.
    const PRISON_ACTS = ['went-inside', 'wrote-from-inside', 'silent-inside'];
    const all = sim.content.ids('act').filter((act) => !PRISON_ACTS.includes(act));
    expect(all.length).toBe(17);
    expect(all.filter((act) => !tally.acts.has(act))).toEqual([]);
    expect(tally.asks).toBeGreaterThan(50);
    // Five of their days in seven, paired on yours: nearly every steady week shares a shift.
    expect(steadyShared).toBeGreaterThan(490);
  });
});
