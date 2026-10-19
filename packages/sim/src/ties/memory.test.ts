import { describe, expect, it } from 'vitest';
import { familiarityOf, KEPT, type Memory, NEUTRAL, remember } from './memory.ts';

const fresh = () => ({ regard: NEUTRAL, memory: [] as Memory[] });

describe('what they remember (D44)', () => {
  it('moves regard by the weight every time, between 0 and 100', () => {
    const them = fresh();
    remember(them, 'helped', 10, 1);
    remember(them, 'helped', 10, 2);
    expect(them.regard).toBe(70);
    for (let i = 0; i < 5; i++) remember(them, 'helped', 10, 3);
    expect(them.regard).toBe(100);
    for (let i = 0; i < 9; i++) remember(them, 'told-on-them', -15, 4);
    expect(them.regard).toBe(0);
  });

  it('keeps a kind once, with the day it last happened and how often, the latest last', () => {
    const them = fresh();
    remember(them, 'helped', 10, 1);
    remember(them, 'talked', 4, 2);
    remember(them, 'helped', 10, 5);
    expect(them.memory).toEqual([
      { act: 'talked', day: 2, times: 1 },
      { act: 'helped', day: 5, times: 2 },
    ]);
  });

  it(`keeps the last ${KEPT} kinds, so an old kind is forgotten and starts again`, () => {
    const them = fresh();
    for (let i = 0; i < KEPT + 2; i++) remember(them, `act-${i}`, 0, i);
    expect(them.memory.map((m) => m.act)).toEqual(Array.from({ length: KEPT }, (_, i) => `act-${i + 2}`));
    remember(them, 'act-0', 0, 20);
    expect(them.memory.at(-1)).toEqual({ act: 'act-0', day: 20, times: 1 });
    expect(them.memory.length).toBe(KEPT);
  });
});

describe('familiarity (D41)', () => {
  it('is half at the half-way minutes, and comes more slowly the more there is', () => {
    expect([0, 2400, 7200, 24000].map((m) => familiarityOf(m, 2400))).toEqual([0, 50, 75, 90]);
    expect(familiarityOf(1_000_000_000, 2400)).toBe(99);
  });
});
