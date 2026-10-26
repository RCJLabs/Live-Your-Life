import type { GameState } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { atBar, circle, fact, game, sim, withCircle } from '../../test/couple.ts';
import { advance, play, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { newTie, type Tie } from '../circle/state.ts';
import { type Child, type FamilySlice, OTHER_DIED } from '../family/state.ts';
import { LINKED } from '../people/roster.ts';
import { heirOf } from './heir.ts';
import { MONTH } from './module.ts';
import { ESTATE, type EstateRecord, estateOf, MORTALITY, mortalityOf } from './records.ts';

const table = mortalityOf(sim.content);
const estate = estateOf(sim.content) as EstateRecord;
// Certain death at the first month's roll, for everyone the table reads: you, here.
const deadly = sliceSim({
  ...PACK.records,
  illness: {},
  mortality: { [MORTALITY]: { ...table, table: table.table.map((r) => ({ ...r, carries: 100_000, not: 100_000 })) } },
});

const lives = (s: GameState) => s.lives as { died: number; gen: number; born: number; settled: number };
const family = (s: GameState) => s.family as FamilySlice;
const withFamily = (s: GameState, f: Partial<FamilySlice>) => ({ ...s, family: { ...family(s), ...f } }) as GameState;
const cashOf = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const withCash = (s: GameState, cash: number) =>
  ({ ...s, economy: { ...(s.economy as object), amounts: { cash } } }) as GameState;

/** A life that has just died, at a month's roll, as the ordinary city sees it. */
function died(seed: string): GameState {
  // A certain year is a twelfth of it each month: roll month by month until it comes.
  let s = play(game, deadly, game.init(seed, deadly), advance(60)).state;
  for (let m = 0; m < 120 && lives(s).died < 0; m++) s = play(game, deadly, s, advance(MONTH * MINUTES_PER_DAY)).state;
  expect(lives(s).died).toBeGreaterThan(0);
  return s;
}

const kid = (born: number, other: number, first = 'Ava'): Child => ({
  born,
  first,
  last: 'K',
  pronouns: 'she',
  carries: true,
  other,
  with: 'you',
  parted: -1,
});
const married = (person: number): Tie => ({ ...newTie(person, 6000, 0), status: 'married', living: true, since: 0 });
const PARTNER = LINKED.count + 10;
const FRIEND = LINKED.count + 20;

describe('the heir (M2.7 step 3, D20, D107, D109)', () => {
  it('goes by D20’s order: an adult child, a partner, a ward, a close friend, or nobody', () => {
    const s = died('heir-order');
    const day = fact(s, 'time.day') as number;
    const v = (x: GameState) => ({
      content: sim.content,
      fact: (id: string, a?: Record<string, unknown>) => fact(x, id, a ?? {}),
    });
    const friend = { ...newTie(FRIEND, 6000, 0), regard: estate.friend };
    const minor = kid(day - 5 * 365, PARTNER, 'Mae');
    const adult = kid(day - 20 * 365, PARTNER, 'Ann');
    const all = withFamily(withCircle(s, { ties: [married(PARTNER), friend] }), { children: [minor, adult] });
    expect(heirOf(v(all))?.kind).toBe('child');
    expect(heirOf(v(all))?.first).toBe('Ann');
    const noAdult = withFamily(all, { children: [minor] });
    expect(heirOf(v(noAdult))?.kind).toBe('partner');
    expect(heirOf(v(withCircle(noAdult, { ties: [friend] })))?.kind).toBe('ward');
    const friendOnly = withFamily(withCircle(s, { ties: [friend] }), { children: [] });
    expect(heirOf(v(friendOnly))).toMatchObject({ kind: 'friend', person: FRIEND });
    const notClose = withCircle(friendOnly, { ties: [{ ...friend, regard: estate.friend - 1 }] });
    expect(heirOf(v(notClose))).toBeNull();
    expect(game.options(notClose, sim)).toEqual([{ type: 'lives/start-over' }]);
    // A ward goes on too, after the jump (D108).
    const ward = withCircle(noAdult, { ties: [] });
    expect(game.options(ward, sim).map((a) => a.type)).toEqual(['lives/succeed']);
  });

  it('settles the estate: debts first, probate above the small-estate limit, nothing owed past it', () => {
    const s = withCircle(died('heir-estate'), { ties: [married(PARTNER)] });
    const rent = 50_000;
    const owing = { ...s, home: { owed: rent } } as GameState;
    const small = play(game, sim, withCash(owing, 200_000), { type: 'lives/succeed' });
    expect(cashOf(small.state)).toBe(150_000);
    expect(small.of('lives/succeeded')[0]).toMatchObject({ debts: rent, probate: 0, left: 150_000 });
    expect(fact(small.state, 'home.owed')).toBe(0);
    const big = estate.small + 10_000_000;
    const large = play(game, sim, withCash(owing, big + rent), { type: 'lives/succeed' });
    const probate = Math.floor((big * estate.probate) / 100);
    expect(cashOf(large.state)).toBe(big - probate);
    // Debts past what you left die with the estate.
    const poor = play(game, sim, withCash(owing, 10_000), { type: 'lives/succeed' });
    expect(cashOf(poor.state)).toBe(0);
    expect(fact(poor.state, 'home.owed')).toBe(0);
  });

  it('carries on as a spouse: their name, age and body, your children with them, the rest known', () => {
    const s0 = died('heir-partner');
    const day = fact(s0, 'time.day') as number;
    const other = { ...newTie(FRIEND, 6000, 0), status: 'dating' as const, regard: 90, since: 0 };
    let s = withCircle(s0, { ties: [married(PARTNER), other] });
    s = withFamily(s, { children: [kid(day - 365, PARTNER), kid(day - 700, FRIEND + 1, 'Bo')] });
    const name = fact(s, 'circle.name', { person: PARTNER }) as string;
    const age = fact(s, 'circle.age', { person: PARTNER }) as number;
    const carries = fact(s, 'circle.they-carry', { person: PARTNER }) as boolean;
    const was = (s.you as { first: string }).first;
    const r = play(game, sim, s, { type: 'lives/succeed' });
    s = r.state;
    expect(r.of('lives/succeeded')[0]).toMatchObject({ kind: 'partner', person: PARTNER, gen: 1, was });
    expect(r.of('lives/succeeded')[0]?.coworker).toBe(fact(s0, 'ties.name'));
    const line = lineFor(
      sim.content,
      r.beats.find((b) => b.type === 'lives/succeeded') as never,
      { you: name },
      DEFAULT_START,
    );
    expect(line).toBe(`${name}, the partner left behind, took up the family’s life, with $0.00 left to them.`);
    expect(`${(s.you as { first: string }).first} ${fact(s, 'you.last')}`).toBe(name);
    expect(fact(s, 'circle.your-age')).toBe(age);
    expect(fact(s, 'circle.carries')).toBe(carries);
    expect(fact(s, 'lives.dead')).toBe(false);
    expect(game.allowedActions(s)).toContain('life/do');
    // Their tie is gone, and their place is yours; the rest are people they know, nothing more.
    expect(circle(s).ties.map((t) => t.person)).toEqual([FRIEND]);
    expect(circle(s).self).toBe(PARTNER);
    expect(circle(s).ties[0]).toMatchObject({ status: 'known', living: false, since: -1 });
    expect(circle(s).ties[0]?.regard).toBe(90 + Math.trunc(((50 - 90) * estate.pull) / 100));
    // The child you had together is the heir's, with you who died as the other parent; the other went to theirs.
    expect(family(s).children).toEqual([{ ...kid(day - 365, PARTNER), other: OTHER_DIED }]);
    expect(fact(s, 'job.employed')).toBe(false);
    // The new life's months are rolled from today.
    expect(lives(s)).toMatchObject({ died: -1, gen: 1, settled: day });
  });

  it('carries on as an adult child: their name and age, and nobody’s children yet', () => {
    const s0 = died('heir-child');
    const day = fact(s0, 'time.day') as number;
    let s = withFamily(s0, { children: [kid(day - 19 * 365 - 10, PARTNER, 'Ann')] });
    s = withCircle(s, { ties: [married(PARTNER)] });
    s = play(game, sim, s, { type: 'lives/succeed' }).state;
    expect((s.you as { first: string }).first).toBe('Ann');
    expect(fact(s, 'circle.your-age')).toBe(19);
    expect(lives(s).born).toBe(day - 19 * 365 - 10);
    expect(family(s).children).toEqual([]);
    // Your spouse is their parent now, a person they know.
    expect(circle(s).ties[0]).toMatchObject({ person: PARTNER, status: 'known' });
    expect(circle(s).self).toBe(-1);
  });

  it('stops a free save at its year’s end once a ward’s jump has passed it (M2.11, D137)', () => {
    const s0 = died('heir-ward-free');
    const day = fact(s0, 'time.day') as number;
    const ward = {
      ...withFamily(withCircle(s0, { ties: [] }), { children: [kid(day - 5 * 365, PARTNER, 'Mae')] }),
      edition: { unlocked: false },
    } as GameState;
    const r = play(game, sim, ward, { type: 'lives/succeed' }, { type: 'lives/begin' });
    // Not inside the years: the ward wakes as you first.
    expect(r.of('edition/year-ended')).toEqual([]);
    const next = play(game, sim, r.state, advance(1));
    expect(next.of('edition/year-ended')).toHaveLength(1);
    expect(next.state.kernel.modes.at(-1)?.id).toBe('year-end');
  });

  it('passes a ward’s years to 8:00 on their 18th birthday, and they wake as you, the city’s timers set again', () => {
    const s0 = died('heir-ward');
    const day = fact(s0, 'time.day') as number;
    const owing = {
      ...withFamily(withCircle(s0, { ties: [] }), { children: [kid(day - 5 * 365, PARTNER, 'Mae')] }),
      home: { owed: 0 },
    } as GameState;
    const t0 = performance.now();
    const r = play(game, sim, withCash(owing, 300_000), { type: 'lives/succeed' }, { type: 'lives/begin' });
    const ms = performance.now() - t0;
    const s = r.state;
    expect(r.of('lives/succeeded')[0]).toMatchObject({ kind: 'ward', first: 'Mae' });
    expect(r.of('lives/came-of-age')[0]?.years).toBe(13);
    const aged = r.beats.find((b) => b.type === 'lives/came-of-age') as never;
    expect(lineFor(sim.content, aged, { you: 'Mae K' }, DEFAULT_START)).toBe(
      'Mae K came of age, 13 years on, and took up the family’s life.',
    );
    expect(fact(s, 'time.day')).toBe(day - 5 * 365 + 18 * 365);
    expect(fact(s, 'time.of-day')).toBe(8 * 60);
    expect(fact(s, 'circle.your-age')).toBe(18);
    expect((s.you as { first: string }).first).toBe('Mae');
    expect(game.allowedActions(s)).toContain('life/do');
    // No rent ran up while they were raised elsewhere, and the cash left them waited.
    expect(fact(s, 'home.owed')).toBe(0);
    expect(cashOf(s)).toBe(300_000);
    expect(fact(s, 'life.need', { need: 'food' })).toBe(fact(game.init('fresh', sim), 'life.need', { need: 'food' }));
    const timers = (s.time as { timers: { id: string; due: number }[] }).timers.map((t) => t.id).sort();
    expect(timers).toEqual(expect.arrayContaining(['midnight', 'rent']));
    // And the first midnight after comes that night, not 18 years of them at once.
    const next = play(game, sim, s, advance(MINUTES_PER_DAY));
    expect(next.of('time/fired').filter((b) => b.timer === 'midnight').length).toBe(1);
    // 13 years in about 13 ms; lived by the people and their jobs, 2 to 50 s (ROADMAP Readings).
    expect(ms).toBeLessThan(1000);
  });

  it('rolls neither death nor illness for a ward’s years, nor all of them at once after', () => {
    // Certain death a year, and illness at its rates: none of it is the ward's until they are 18.
    const harsh = sliceSim({ ...PACK.records, mortality: { [MORTALITY]: deadly.content.get('mortality', MORTALITY) } });
    const s0 = died('heir-ward-safe');
    const day = fact(s0, 'time.day') as number;
    const s1 = withFamily(withCircle(s0, { ties: [] }), { children: [kid(day - 2 * 365, PARTNER, 'Mae')] });
    const r = play(game, harsh, s1, { type: 'lives/succeed' }, { type: 'lives/begin' }, advance(MINUTES_PER_DAY));
    expect(r.of('lives/died')).toEqual([]);
    expect(r.of('health/fell-ill').length).toBeLessThanOrEqual(1);
    expect(lives(r.state).died).toBe(-1);
  });

  it('meets everyone at a place but yourself, once an heir who lived in the city is you', () => {
    // Everyone present is met each hour here, so whether you are is down to `self` alone.
    const pop = PACK.records.population as Record<string, { ties: object }>;
    const id = Object.keys(pop)[0] as string;
    const all = sliceSim({
      ...PACK.records,
      illness: {},
      population: { [id]: { ...pop[id], ties: { ...pop[id]?.ties, perHour: 1000 } } },
    });
    const { state, here } = atBar('heir-self');
    const me = here[0] as number;
    const s = withCircle(state, { ties: [], self: me });
    const after = play(game, all, s, { type: 'life/do', activity: 'socialize', minutes: 120 }).state;
    const met = circle(after).ties.map((t) => t.person);
    expect(met.length).toBeGreaterThan(0);
    expect(met).not.toContain(me);
  });

  it('keeps the first life’s age where it was', () => {
    const s = game.init('heir-first', sim);
    expect(fact(s, 'circle.your-age')).toBe(18);
    expect(lives(play(game, sim, s, advance(MINUTES_PER_DAY)).state).born).toBe(-18 * 365);
    expect(ESTATE).toBe('michigan');
  });
});
