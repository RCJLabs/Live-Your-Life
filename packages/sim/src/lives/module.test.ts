import type { GameState } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, play, sliceGame, sliceSim } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { rollable, smallRoll } from '../odds.ts';
import { MONTH, monthChance } from './module.ts';
import { MORTALITY, mortalityOf, yearChance } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const table = mortalityOf(sim.content);
const fact = (s: GameState, id: string, args: Record<string, unknown> = {}) => game.fact(s, id, args, sim);
const lives = (s: GameState) => s.lives as { settled: number; died: number };

/** The product of a nested roll's chances that reach `yes`, per 100,000. */
function hit(e: { effect: string; outcomes?: { chance: number; effects: unknown[] }[] }): number {
  if (e.effect !== 'roll') return 100_000;
  const yes = e.outcomes?.find((o) => o.effects.length > 0);
  if (!yes) return 0;
  return (yes.chance / 100) * hit(yes.effects[0] as Parameters<typeof hit>[0]);
}

describe('your life’s length (M2.7 step 1, D103)', () => {
  it('reads the life table by age and body, a straight line between its rows', () => {
    const [a, b] = table.table as [(typeof table.table)[number], (typeof table.table)[number]];
    expect(yearChance(table, a.age, false)).toBe(a.not);
    expect(yearChance(table, a.age, true)).toBe(a.carries);
    const mid = Math.floor((a.age + b.age) / 2);
    const v = yearChance(table, mid, false);
    expect(v).toBeGreaterThanOrEqual(Math.min(a.not, b.not));
    expect(v).toBeLessThanOrEqual(Math.max(a.not, b.not));
    // Every age climbs or holds from 30 on, and older is never safer.
    for (let age = 30; age < 110; age++)
      expect(yearChance(table, age + 1, false)).toBeGreaterThanOrEqual(yearChance(table, age, false));
  });

  it('rolls a chance per 100,000 exactly as it is shown, in whole-percent rolls', () => {
    for (const c of [1, 9, 37, 100, 101, 456, 999, 1001, 3456, 9999, 10_001, 54_321, 100_000]) {
      const e = smallRoll(c, [{ effect: 'die' }]) as unknown as Parameters<typeof hit>[0];
      expect(Math.round(hit(e) * 1000) / 1000, `chance ${c}`).toBe(rollable(c));
      const each = JSON.stringify(e).match(/"chance":(\d+(\.\d+)?)/g) ?? [];
      for (const m of each) expect(Number.isInteger(Number(m.split(':')[1])), `${c}: ${m}`).toBe(true);
    }
  });

  it('shows a month’s chance at your age, raised while your health is let fall', () => {
    const s = game.init('lives-chance', sim);
    const year = yearChance(table, fact(s, 'circle.your-age') as number, fact(s, 'circle.carries') === true);
    expect(fact(s, 'lives.month-chance')).toBe(Math.ceil(year / 12));
    const ill = {
      ...s,
      life: { ...(s.life as object), levels: { ...(s.life as { levels: object }).levels, health: 5 } },
    };
    expect(fact(ill as GameState, 'lives.month-chance')).toBe(Math.ceil((table.health.times * year) / 12));
    expect(monthChance({ content: sim.content, fact: (id, a) => fact(s, id, a ?? {}) })).toBe(Math.ceil(year / 12));
  });

  it('rolls once a month, and a death stops the world', () => {
    let s = play(game, sim, game.init('lives-month', sim), advance(60)).state;
    const first = lives(s).settled;
    expect(first).toBeGreaterThanOrEqual(0);
    // Halfway through the month: not yet rolled.
    expect(lives(play(game, sim, s, advance(15 * MINUTES_PER_DAY)).state).settled).toBe(first);
    const r = play(game, sim, s, advance(MONTH * MINUTES_PER_DAY));
    s = r.state;
    expect(lives(s).settled).toBe(first + MONTH);
    expect(r.beats.filter((b) => b.type === 'logic/rolled').length).toBeGreaterThan(0);
    expect(fact(s, 'lives.dead')).toBe(false);
  });

  it('starts its months on the first day it hears, in a save from before it', () => {
    let s = play(game, sim, game.init('lives-late', sim), advance(100 * MINUTES_PER_DAY)).state;
    // As a save from before M2.7 loads: the slice is new, its months not yet begun.
    s = { ...s, lives: { settled: -1, died: -1 } } as GameState;
    const r = play(game, sim, s, advance(60));
    expect(lives(r.state).settled).toBe(fact(r.state, 'time.day'));
    expect(r.beats.filter((b) => b.type === 'logic/rolled')).toEqual([]);
  });

  it('dies when the month’s roll comes up, tells it, and offers nothing after', () => {
    // A table where every year is certain death: a month's chance is a twelfth of it.
    const certain = { ...table, table: table.table.map((r) => ({ ...r, carries: 100_000, not: 100_000 })) };
    const doomed = sliceSim({ ...PACK.records, mortality: { [MORTALITY]: certain } });
    let s = play(game, doomed, game.init('lives-doomed', doomed), advance(60)).state;
    expect(game.fact(s, 'lives.month-chance', {}, doomed)).toBe(Math.ceil(100_000 / 12));
    const died: Record<string, unknown>[] = [];
    for (let m = 0; m < 120 && died.length === 0; m++) {
      const r = play(game, doomed, s, advance(MONTH * MINUTES_PER_DAY));
      died.push(...r.beats.filter((b) => b.type === 'lives/died'));
      s = r.state;
    }
    expect(died.length).toBe(1);
    expect(died[0]?.age).toBe(game.fact(s, 'circle.your-age', {}, doomed));
    expect(game.fact(s, 'lives.dead', {}, doomed)).toBe(true);
    expect(game.options(s, doomed)).toEqual([]);
    expect(game.reduce(s, advance(60), doomed).accepted).toBe(false);
  });
});
