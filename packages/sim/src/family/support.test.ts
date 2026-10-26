import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { circle, fact, game, sim, withCircle } from '../../test/couple.ts';
import { play, waitUntil } from '../../test/slice.ts';
import { rosterNow } from '../circle/meet.ts';
import { newTie } from '../circle/state.ts';
import type { Roster } from '../people/roster.ts';
import { pregnancyOf } from './records.ts';
import { type Child, type FamilySlice, OTHER_DIED } from './state.ts';
import { monthlyNet, pow25, supportFor, wageOf } from './support.ts';

const rec = pregnancyOf(sim.content).support;
const family = (s: GameState) => (s as unknown as { family: FamilySlice }).family;
const withFamily = (s: GameState, f: Partial<FamilySlice>) => ({ ...s, family: { ...family(s), ...f } }) as GameState;
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const baby = (other: number, born = 0): Child => ({
  born,
  first: 'Ava',
  last: 'Kowalski',
  pronouns: 'she',
  carries: true,
  other,
  with: 'you',
  parted: -1,
});

/** A life living with a working partner and their baby, at 08:00 of day 1. */
function family0(seed = 'support'): { state: GameState; other: number } {
  const s = play(game, sim, game.init(seed, sim), waitUntil(8)).state;
  const roster = rosterNow({ fact: (id: string) => fact(s, id), content: sim.content } as never) as Roster;
  let other = 3;
  while (wageOf({ fact: (id: string) => fact(s, id), content: sim.content, state: family(s) } as never, other) === 0)
    other++;
  expect(roster.people[other]?.work).toBeGreaterThanOrEqual(0);
  const ties = [{ ...newTie(other, 6000, 0), status: 'married' as const, living: true, since: 0 }];
  return { state: withFamily(withCircle(s, { ties }), { children: [baby(other)], settled: 1 }), other };
}

const breakUp = (s: GameState, other: number) => play(game, sim, s, { type: 'circle/separate', person: other });

describe('custody and child support (M2.6 step 4c, D100)', () => {
  it('finds a power of 2.5 from whole numbers', () => {
    for (const n of [1, 4, 73, 146, 292, 365]) expect(Math.abs(pow25(n) / n ** 2.5 - 1)).toBeLessThan(0.001);
    expect(pow25(0)).toBe(0);
  });

  it('keeps the child with whoever gave more care, and tells it', () => {
    const { state, other } = family0();
    const you = breakUp(withFamily(state, { given: { you: 900, them: 300 } }), other);
    expect(you.of('family/custody')[0]?.with).toBe('you');
    expect(family(you.state).children[0]?.with).toBe('you');
    const them = breakUp(withFamily(state, { given: { you: 100, them: 300 } }), other);
    expect(them.of('family/custody')[0]?.with).toBe('them');
    expect(family(them.state).children[0]?.parted).toBe(fact(state, 'time.day'));
  });

  it('works support by the formula’s shape: their share of the base, offset for nights', () => {
    const { state, other } = family0();
    const apart = breakUp(withFamily(state, { given: { you: 900, them: 0 } }), other).state;
    const theirs = monthlyNet(
      { fact: (id: string) => fact(apart, id), content: sim.content } as never,
      wageOf({ fact: (id: string) => fact(apart, id), content: sim.content } as never, other),
    );
    const yours = monthlyNet(
      { fact: (id: string) => fact(apart, id), content: sim.content } as never,
      fact(apart, 'job.wage') as number,
    );
    const combined = theirs + yours;
    const base = Math.floor((combined * (rec.base[0] as number)) / 100);
    const bBase = base - Math.floor((base * yours) / combined);
    const aBase = base - bBase;
    const aN = pow25(rec.nights.custodial);
    const bN = pow25(rec.nights.parenting);
    const expected = Math.max(0, Math.trunc((aN * bBase - bN * aBase) / (aN + bN)));
    expect(fact(apart, 'family.support', { person: other })).toBe(expected);
    // Two children: the base for two.
    const two = withFamily(apart, {
      children: [...family(apart).children, { ...baby(other), first: 'Ben', parted: 1 }],
    });
    const both = fact(two, 'family.support', { person: other }) as number;
    expect(both).toBeGreaterThan(expected);
    expect(Math.abs(both / expected - (rec.base[1] as number) / (rec.base[0] as number))).toBeLessThan(0.02);
    // Living with them: you pay.
    const gone = breakUp(withFamily(state, { given: { you: 0, them: 900 } }), other).state;
    expect(fact(gone, 'family.support', { person: other }) as number).toBeLessThanOrEqual(0);
  });

  it('asks no support for a child in foster care (D102)', () => {
    const { state, other } = family0();
    const apart = breakUp(withFamily(state, { given: { you: 900, them: 0 } }), other).state;
    expect(fact(apart, 'family.support', { person: other })).not.toBe(0);
    const fostered = withFamily(apart, {
      children: family(apart).children.map((c) => ({ ...c, with: 'care' as const })),
    });
    expect(fact(fostered, 'family.support', { person: other })).toBe(0);
    // Nor for one whose other parent has died (D106): whoever came to their place owes nothing.
    const bereft = withFamily(apart, {
      children: family(apart).children.map((c) => ({ ...c, with: 'you' as const, other: OTHER_DIED })),
    });
    expect(
      supportFor(
        { fact: (id: string, a?: Record<string, unknown>) => fact(bereft, id, a ?? {}), content: sim.content } as never,
        other,
        family(bereft).children,
      ),
    ).toBe(0);
  });

  it('pays the month’s support with the rent, or owes it', () => {
    const { state, other } = family0();
    const gone = breakUp(withFamily(state, { given: { you: 0, them: 900 } }), other).state;
    const month = fact(gone, 'family.support', { person: other }) as number;
    const minutes = (29 - (fact(gone, 'time.day') as number)) * 1440 + 14 * 60 + 5;
    const r = play(game, sim, gone, { type: 'time/advance', minutes });
    const s = r.of('family/support')[0];
    if (month < 0) {
      expect(s?.by).toBe('you');
      expect(s?.cents).toBe(-month);
      if (s?.paid === false) expect(family(r.state).arrears.owe).toBe(-month);
    }
    // Kept with you: their support comes in.
    const kept = breakUp(withFamily(state, { given: { you: 900, them: 0 } }), other).state;
    const toYou = fact(kept, 'family.support', { person: other }) as number;
    const before = cash(kept);
    const k = play(game, sim, kept, { type: 'time/advance', minutes });
    if (toYou > 0) expect(k.of('family/support')[0]).toMatchObject({ by: 'them', cents: toYou });
    expect(toYou).toBeGreaterThan(0);
    const rent = k.of('home/rent')[0];
    // And the month's gas and other bills with it (D130, D140), those that were paid.
    const bills = [rent, ...k.of('home/gas'), ...k.of('home/bill')].reduce(
      (n, b) => n + (b?.paid ? (b.cents as number) : 0),
      0,
    );
    expect(cash(k.state)).toBe(before - bills + toYou);
    expect(circle(k.state).ties[0]?.status).toBe('separated');
  });
});
