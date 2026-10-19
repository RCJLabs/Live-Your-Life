import { type Action, type GameState, type Policy, playRun, Rng, seedsOf, type TimeSlice, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { LINE_COOK, sliceGame, sliceSim } from '../../test/slice.ts';
import { randomFor, steadyFor } from '../bot.ts';
import { createLifeGame } from '../game.ts';
import { thiefFor } from '../thief.ts';

const sim = sliceSim();
const DAYS = 56;
const MAX_TURNS = 40_000;

/** What a beat's roll says the first outcome's chance was, read as the chance of the one that came up. */
const rolledChance = (b: Record<string, unknown>): number =>
  b.outcome === 0 ? (b.chance as number) : 100 - (b.chance as number);

interface Tally {
  beats: Set<string>;
  pleas: Set<string>;
  evidence: Set<string>;
  previews: number;
}

/** The odds a law action's preview shows, or null for one with none. */
function shown(t: ReturnType<typeof turnFor>, action: Action): number[] | null {
  const p = (effect: object) => t.preview([effect as never])[0] as Record<string, number> | undefined;
  if (action.type === 'law/take') {
    const odds = p({ effect: 'theft', spot: action.spot, item: action.item });
    return [odds?.held as number, odds?.filmed as number];
  }
  if (action.type === 'law/sell') return [p({ effect: 'sale', item: action.item })?.trouble as number];
  if (action.type === 'law/plead' && action.plea === 'contest') {
    const k = (t.mode.data as { case: number }).case;
    return [p({ effect: 'contest', case: k })?.chance as number];
  }
  return null;
}

/** Every law timer due is one the player was told of, with the tick it comes. */
function allTold(state: GameState, told: Map<string, number>, seed: string): void {
  for (const timer of (state.time as TimeSlice).timers)
    if (timer.id.startsWith('law-')) expect(told.get(timer.id), `${seed} ${timer.id}`).toBe(timer.due);
}

function playLives(
  game: ReturnType<typeof createLifeGame>,
  policy: () => Policy,
  seeds: readonly string[],
  tally: Tally,
) {
  for (const seed of seeds) {
    const bot = policy();
    let state = game.init(seed, sim);
    const rng = Rng.create(seed).fork('bot');
    const told = new Map<string, number>();
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const t = turnFor(game, sim, state, rng, turn);
      const action = bot.choose(t) as Action | null;
      if (!action) break;
      const odds = shown(t, action);
      const step = game.reduce(state, action, sim);
      expect(step.accepted, `${seed} ${JSON.stringify(action)}`).toBe(true);
      state = step.state;
      const rolls = step.beats.filter((b) => b.type === 'logic/rolled');
      // The first roll an action makes is its own; a take's second, its footage.
      if (odds && rolls[0]) {
        expect(rolledChance(rolls[0]), `${seed} ${action.type}`).toBe(odds[0]);
        if (action.type === 'law/take' && rolls[1] && !step.beats.some((b) => b.type === 'law/held'))
          expect(rolledChance(rolls[1]), seed).toBe(odds[1]);
        tally.previews++;
      }
      for (const b of step.beats) {
        if (!b.type.startsWith('law/')) continue;
        tally.beats.add(b.type);
        if (b.type === 'law/notice' && typeof b.timer === 'string') told.set(b.timer, b.tick as number);
        if (b.type === 'law/pleaded') tally.pleas.add(String(b.plea));
      }
      for (const k of (state.law as { cases: { evidence: string }[] }).cases) tally.evidence.add(k.evidence);
      allTold(state, told, seed);
    }
  }
}

// M1.5's gates over eight-week lives: a thief who steals instead of working, and the random bot,
// which steals, sells, misses court and the rest at random. Every step of the chain comes up;
// every offer is accepted; the odds shown for a take, a sale and a contest are the odds rolled;
// and every timer the law sets was told to the player, with when it comes.
describe('the law in the bots’ lives', () => {
  it('reaches every step of the chain, refuses nothing, shows the odds it rolls and tells every timer', {
    timeout: 300_000,
  }, () => {
    const tally: Tally = { beats: new Set(), pleas: new Set(), evidence: new Set(), previews: 0 };
    playLives(createLifeGame(), () => thiefFor(DAYS), seedsOf(150, 'law-thief'), tally);
    playLives(sliceGame(), () => randomFor(DAYS), seedsOf(150, 'law-random'), tally);
    const chain = [
      'took',
      'held',
      'ticketed',
      'notice',
      'in-court',
      'pleaded',
      'trainee',
      'checked-in',
      'convicted',
      'dismissed',
      'revoked',
      'warrant',
      'arrested',
      'hearing',
      'sold',
      'ate',
      'paid',
    ];
    expect(chain.filter((b) => !tally.beats.has(`law/${b}`))).toEqual([]);
    expect([...tally.pleas].sort()).toEqual(['contest', 'guilty', 'hyta']);
    expect([...tally.evidence].sort()).toEqual(['camera', 'held', 'sale']);
    expect(tally.previews).toBeGreaterThan(500);
  });
});

describe('crime against work (D7, D48)', () => {
  it('leaves a thief poorer after eight weeks than the line cook, after what is owed', { timeout: 300_000 }, () => {
    const worth = (game: ReturnType<typeof createLifeGame>, policy: Policy, seed: string) => {
      const { state } = playRun(game, sim, { seed, policy, maxTurns: MAX_TURNS });
      const f = (id: string, args?: object) => game.fact(state, id, args as never, sim) as number;
      return f('economy.amount', { resource: 'cash' }) - f('law.owed') - f('home.owed');
    };
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1] as number;
    const seeds = seedsOf(60, 'pays');
    const thieves = seeds.map((s) => worth(createLifeGame(), thiefFor(DAYS), s));
    const cooks = seeds.map((s) => worth(createLifeGame({ career: LINE_COOK }), steadyFor(DAYS), s));
    expect(median(thieves)).toBeLessThan(median(cooks));
    expect(Math.max(...thieves)).toBeLessThan(Math.min(...cooks));
  });
});
