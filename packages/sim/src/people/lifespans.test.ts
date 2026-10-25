import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { circle, fact, game, sim, withCircle } from '../../test/couple.ts';
import { advance, play } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { populationOf } from '../circle/records.ts';
import { newTie } from '../circle/state.ts';
import { type Child, type FamilySlice, OTHER_DIED } from '../family/state.ts';
import { mortalityOf, yearChance } from '../lives/records.ts';
import { namePoolOf } from '../ties/records.ts';
import { ageOn, occupantAt } from './lifespans.ts';
import { LINKED } from './roster.ts';
import { ADULT } from './who.ts';

const pop = populationOf(sim.content);
const pool = namePoolOf(sim.content, pop.names);
const table = mortalityOf(sim.content);
const SEED = 4242;
const at = (i: number, day: number) => occupantAt(pop, pool, table, SEED, i, day);

/** The first place whose first occupant dies within `days`, and the day. */
function firstDeath(days: number, seed = SEED): { person: number; died: number } {
  for (let i = LINKED.count; i < 1000; i++) {
    const o = occupantAt(pop, pool, table, seed, i, days);
    if (o.before && o.gen === 1) return { person: i, died: o.before.died };
  }
  throw new Error('nobody died');
}

describe('who holds each place over the years (M2.7 step 1b, D106)', () => {
  it('dies at the life table’s rate: a year of 1,000 places, near the deaths the table expects', () => {
    let died = 0;
    let expected = 0;
    for (let i = LINKED.count; i < 1000; i++) {
      const first = at(i, 0);
      expected += yearChance(table, first.who.age, first.who.carries) / 100_000;
      if (at(i, 364).gen > 0 || at(i, 365).gen > 0) died++;
    }
    // Within three standard deviations of the table's count (a sum of rare chances: about its root).
    expect(Math.abs(died - expected)).toBeLessThan(3 * Math.sqrt(expected) + 1);
    expect(expected).toBeGreaterThan(5);
  });

  it('brings a newcomer the day after a death, an adult with their own name, and keeps the linked people', () => {
    const { person, died } = firstDeath(5 * 365);
    expect(at(person, died).gen).toBe(0);
    const next = at(person, died + 1);
    expect(next.gen).toBe(1);
    expect(next.since).toBe(died + 1);
    expect(next.before?.died).toBe(died);
    expect(`${next.who.first} ${next.who.last}`).not.toBe(`${next.before?.who.first} ${next.before?.who.last}`);
    expect(ageOn(next, died + 1)).toBeGreaterThanOrEqual(ADULT);
    expect(at(person, died + 1)).toEqual(next);
    for (let i = 0; i < LINKED.count; i++) expect(at(i, 50 * 365).gen).toBe(0);
  });

  it('ends a tie when they die, and a child of theirs comes home to you', () => {
    const seed = fact(game.init('lifespans', sim), 'people.seed') as number;
    const { person, died } = firstDeath(3 * 365, seed);
    let s = game.init('lifespans', sim);
    const child: Child = {
      born: 0,
      first: 'Ava',
      last: 'K',
      pronouns: 'she',
      carries: true,
      other: person,
      with: 'them',
      parted: 0,
    };
    s = withCircle(s, {
      ties: [{ ...newTie(person, 6000, 0), status: 'married', living: true, since: 0 }],
      settled: 0,
    });
    s = { ...s, family: { ...(s.family as FamilySlice), children: [child], settled: 0 } } as GameState;
    let beats: { type: string; name?: unknown; partner?: unknown }[] = [];
    for (let d = 0; d <= died + 2 && beats.length === 0; d += 30) {
      const r = play(game, sim, s, advance(30 * MINUTES_PER_DAY));
      beats = r.beats.filter((b) => b.type === 'circle/died');
      s = r.state;
    }
    expect(beats.length).toBe(1);
    expect(beats[0]?.partner).toBe(true);
    expect(beats[0]?.name).toBe(fact(game.init('lifespans', sim), 'circle.name', { person }));
    expect(circle(s).ties.find((t) => t.person === person)).toBeUndefined();
    const kid = (s.family as FamilySlice).children[0];
    expect(kid?.with).toBe('you');
    expect(kid?.other).toBe(OTHER_DIED);
  });
});
