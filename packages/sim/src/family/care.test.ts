import type { Action, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { fact, game, sim, withCircle } from '../../test/couple.ts';
import { doing, play, refusal, waitUntil } from '../../test/slice.ts';
import { rosterNow } from '../circle/meet.ts';
import { newTie } from '../circle/state.ts';
import type { Roster } from '../people/roster.ts';
import { pregnancyOf } from './records.ts';
import type { Child, FamilySlice } from './state.ts';

const care = pregnancyOf(sim.content).care;
const family = (s: GameState) => (s as unknown as { family: FamilySlice }).family;
const withFamily = (s: GameState, f: Partial<FamilySlice>) => ({ ...s, family: { ...family(s), ...f } }) as GameState;
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const child = (born: number, other = 3): Child => ({
  born,
  first: 'Ava',
  last: 'Kowalski',
  pronouns: 'she',
  carries: true,
  other,
  with: 'you',
});

/** A life with a baby born today, at 08:00 of day 1. */
function withBaby(seed = 'care'): GameState {
  const s = play(game, sim, game.init(seed, sim), waitUntil(8)).state;
  const today = fact(s, 'time.day') as number;
  return withFamily(s, { children: [child(today)], settled: today });
}

/** Cares for the rest of today's need, a sitting at a time. */
function careAll(state: GameState): GameState {
  let s = state;
  for (let k = 0; k < 10; k++) {
    const a = game.options(s, sim).find((o) => o.type === 'family/care') as Action | undefined;
    if (!a) break;
    s = play(game, sim, s, a).state;
  }
  return s;
}

/** To the same hour tomorrow. */
const nextDay = (s: GameState) => play(game, sim, s, doing('sleep', 600), waitUntil(8)).state;

describe('a child’s care (M2.6 step 4b, D98)', () => {
  it('asks the record’s minutes a day, in sittings, half of them with a partner you live with', () => {
    const s = withBaby();
    const need = care.needs[0]?.minutes as number;
    expect(fact(s, 'family.care-left')).toBe(need);
    const offer = game.options(s, sim).find((a) => a.type === 'family/care');
    expect(offer?.minutes).toBe(Math.min(care.sitting, need));
    const after = play(game, sim, s, offer as Action).state;
    expect(fact(after, 'family.care-left')).toBe(need - (offer?.minutes as number));
    expect(fact(after, 'time.of-day')).toBe((fact(s, 'time.of-day') as number) + (offer?.minutes as number));
    expect(refusal(game, sim, after, { type: 'family/care', minutes: care.sitting + 1 })).toBe('bad-minutes');
    const together = withCircle(s, { ties: [{ ...newTie(3, 6000, 0), status: 'married', living: true, since: 0 }] });
    expect(fact(together, 'family.care-left')).toBe(Math.ceil((need * (100 - care.partner)) / 100));
    expect(fact(careAll(s), 'family.care-left')).toBe(0);
  });

  it('brings a report after the record’s days short in its window; the investigation finds it, or closes', () => {
    let s = withBaby('care-short');
    for (let d = 0; d < care.neglect.days; d++) s = nextDay(s);
    expect(family(s).report).not.toBeNull();
    // Cared for from then on: the investigation closes with nothing found.
    let closed: boolean | undefined;
    for (let d = 0; d <= care.investigation + 1 && closed === undefined; d++) {
      const r = play(game, sim, careAll(s), doing('sleep', 600), waitUntil(8));
      closed = r.of('family/investigated')[0]?.found as boolean | undefined;
      s = r.state;
    }
    expect(closed).toBe(false);
    // Left short again: found.
    let t = withBaby('care-found');
    for (let d = 0; d < care.neglect.days; d++) t = nextDay(t);
    let found: boolean | undefined;
    for (let d = 0; d <= care.investigation + 1 && found === undefined; d++) {
      const r = play(game, sim, t, doing('sleep', 600), waitUntil(8));
      found = r.of('family/investigated')[0]?.found as boolean | undefined;
      t = r.state;
    }
    expect(found).toBe(true);
    expect(fact(t, 'family.findings')).toBe(1);
  });

  it('brings no report while the care is given', () => {
    let s = withBaby('care-given');
    for (let d = 0; d < care.neglect.window; d++) s = nextDay(careAll(s));
    expect(family(s).missed).toEqual([]);
    expect(family(s).report).toBeNull();
  });

  it('pays daycare once a day you work while the child is young, unless a partner is home', () => {
    let s = withBaby('care-work');
    const shift = game.options(s, sim).find((a) => a.type === 'job/sign-up') as Action;
    s = play(game, sim, s, shift).state;
    s = play(game, sim, s, { type: 'time/advance', minutes: fact(s, 'job.next-shift-in') as number }).state;
    const before = cash(s);
    // The shift worked in two parts: one day's daycare, not two.
    const first = play(game, sim, s, doing('work', 60));
    const worked = play(game, sim, first.state, doing('work', fact(first.state, 'job.shift-left') as number));
    expect([...first.of('family/daycare'), ...worked.of('family/daycare')].map((b) => b.cents)).toEqual([
      care.daycare.cost,
    ]);
    expect(before - cash(worked.state)).toBeLessThanOrEqual(care.daycare.cost);
    // With a partner home who doesn't work: none.
    const roster = rosterNow({ fact: (id: string) => fact(s, id), content: sim.content } as never) as Roster;
    let idle = 3;
    while ((roster.people[idle]?.work ?? 0) >= 0) idle++;
    const home = withCircle(s, { ties: [{ ...newTie(idle, 6000, 0), status: 'married', living: true, since: 0 }] });
    const r = play(game, sim, home, doing('work', fact(home, 'job.shift-left') as number));
    expect(r.of('family/daycare')).toEqual([]);
  });
});
