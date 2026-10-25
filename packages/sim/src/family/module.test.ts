import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { circle, dating, fact, game, offered, rolled, shown, sim, withCircle } from '../../test/couple.ts';
import { doing, play, refusal, waitUntil } from '../../test/slice.ts';
import { newTie } from '../circle/state.ts';
import { nightChance, pregnancyOf } from './records.ts';
import { type FamilySlice, type Pregnancy, YOU } from './state.ts';

const rec = pregnancyOf(sim.content);
const family = (s: GameState) => (s as unknown as { family: FamilySlice }).family;
const withFamily = (s: GameState, f: Partial<FamilySlice>) => ({ ...s, family: { ...family(s), ...f } }) as GameState;
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const withCash = (s: GameState, cents: number) => {
  const economy = (s as unknown as { economy: { amounts: Record<string, number> } }).economy;
  return { ...s, economy: { ...economy, amounts: { ...economy.amounts, cash: cents } } } as GameState;
};
/** Just back from a date with them: what lets you ask to stay the night. */
const justDated = (s: GameState, who: number) => {
  const now = (fact(s, 'time.day') as number) * 1440 + (fact(s, 'time.of-day') as number);
  return withCircle(s, { ties: circle(s).ties.map((t) => (t.person === who ? { ...t, dated: now } : t)) });
};
const sleepTo = (s: GameState, hour: number) => play(game, sim, s, doing('sleep', 600), waitUntil(hour)).state;

/** Dating someone whose body differs from yours, you carrying if `youCarry`: the tie set by hand. */
function couple(youCarry: boolean): { state: GameState; who: number } {
  const { state } = dating();
  const s = play(game, sim, state, { type: 'circle/carries', carries: youCarry }).state;
  let who = 3;
  while (fact(s, 'circle.they-carry', { person: who }) === youCarry) who++;
  return { state: withCircle(s, { ties: [{ ...newTie(who, 6000, 0), status: 'dating', since: 0, regard: 80 }] }), who };
}

/** A pregnancy set by hand, as a night would have begun it, `days` ago. */
function pregnant(
  s: GameState,
  carrier: number,
  other: number,
  days: number,
  change: Partial<Pregnancy> = {},
): GameState {
  const today = fact(s, 'time.day') as number;
  const p: Pregnancy = {
    carrier,
    other,
    conceived: today - days,
    known: false,
    choice: 'open',
    loss: -1,
    due: today - days + 280,
    ...change,
  };
  return withFamily(s, { pregnancy: p, settled: today });
}

describe('bodies and pregnancy (M2.6 step 4, D96, D97)', () => {
  it('shows a night’s chance of a pregnancy with and without protection, and none between bodies alike', () => {
    const { state, who } = couple(true);
    const after = justDated(sleepTo(state, 22), who);
    const stays = game.options(after, sim).filter((a) => a.type === 'circle/stay-night');
    expect(stays.map((a) => a.protect).sort()).toEqual([false, true]);
    const age = fact(after, 'circle.your-age') as number;
    for (const protect of [true, false]) {
      const p = (shown(after, 'night-roll', who) as unknown as { pregnancy: number }).pregnancy;
      expect(fact(after, 'family.chance', { person: who, protect })).toBe(nightChance(rec, protect, age));
      if (!protect) expect(p).toBe(nightChance(rec, false, age));
    }
    expect(nightChance(rec, false, 18)).toBe(rec.night.none);
    expect(nightChance(rec, true, 18)).toBe(rec.night.protected);
    expect(nightChance(rec, false, 50)).toBe(0);
    const alike = play(game, sim, after, {
      type: 'circle/carries',
      carries: !(fact(after, 'circle.carries') as boolean),
    }).state;
    if (fact(alike, 'circle.they-carry', { person: who }) === fact(alike, 'circle.carries'))
      expect(fact(alike, 'family.chance', { person: who, protect: false })).toBe(0);
  });

  it('rolls a chance under one in a hundred as two percent rolls, at the odds shown', () => {
    const { state, who } = couple(true);
    const after = justDated(sleepTo(state, 22), who);
    // Willing, so the night happens: regard set to the top.
    const sure = withCircle(after, {
      ties: circle(after).ties.map((t) => (t.person === who ? { ...t, regard: 100 } : t)),
    });
    const r = play(game, sim, sure, { type: 'circle/stay-night', person: who, protect: true });
    if (r.of('circle/stayed')[0]?.yes !== true) return;
    const rolls = rolled(r.beats).slice(1);
    expect(rolls[0]?.chance === 10 || rolls[0]?.chance === 90).toBe(true);
    if (rolls[0]?.chance === 10)
      expect([rec.night.protected / 10, 100 - rec.night.protected / 10]).toContain(rolls[1]?.chance);
  });

  it('is known at its week; yours to go on with or to end at a clinic in its hours, by pills or a procedure', () => {
    const { state, who } = couple(true);
    const s = withCash(pregnant(sleepTo(state, 10), YOU, who, rec.known * 7 - 1), 200_000);
    expect(offered(s, 'family/continue')).toEqual([]);
    const r = play(game, sim, s, doing('sleep', 600), waitUntil(10));
    expect(r.of('family/pregnant')).toHaveLength(1);
    expect(fact(r.state, 'family.pregnant')).toBe(true);
    const weekday = fact(r.state, 'time.weekday') as string;
    if (weekday === 'saturday' || weekday === 'sunday') return;
    expect(
      game
        .options(r.state, sim)
        .filter((a) => a.type.startsWith('family/'))
        .map((a) => a.type)
        .sort(),
    ).toEqual(['family/continue', 'family/end']);
    const before = cash(r.state);
    const ended = play(game, sim, r.state, { type: 'family/end' });
    expect(cash(ended.state)).toBe(before - rec.end.pillCost);
    expect(family(ended.state).pregnancy).toBeNull();
    // After the pills' weeks, the clinic's procedure; past the limit, nothing.
    const later = pregnant(r.state, YOU, who, (rec.end.pills + 1) * 7, { known: true });
    const procedure = play(
      game,
      sim,
      { ...later, economy: (r.state as unknown as { economy: unknown }).economy } as GameState,
      { type: 'family/end' },
    );
    expect(before - cash(procedure.state)).toBe(rec.end.clinicCost);
    const past = pregnant(r.state, YOU, who, (rec.end.limit + 1) * 7, { known: true });
    expect(refusal(game, sim, past, { type: 'family/end' })).toBe('cannot-end');
    const night = play(game, sim, r.state, waitUntil(22)).state;
    expect(refusal(game, sim, night, { type: 'family/end' })).toBe('clinic-closed');
  });

  it('is born when due, in your household, the birth paid or owed', () => {
    const { state, who } = couple(true);
    const s = pregnant(sleepTo(state, 10), YOU, who, 270, {
      known: true,
      choice: 'continue',
      due: (fact(state, 'time.day') as number) + 1,
    });
    const r = play(game, sim, s, doing('sleep', 600), waitUntil(10), doing('sleep', 600), waitUntil(10));
    expect(r.of('family/born')).toHaveLength(1);
    const child = family(r.state).children[0];
    expect(child?.with).toBe('you');
    expect(child?.other).toBe(who);
    const paid = cash(s) - cash(r.state) >= rec.birth;
    expect(paid || family(r.state).owed === rec.birth).toBe(true);
  });

  it('a partner who carries chooses for themself', () => {
    let goOn = 0;
    let end = 0;
    for (let i = 0; i < 12; i++) {
      const { state, who } = couple(false);
      const s = pregnant(
        play(game, sim, state, { type: 'time/advance', minutes: i }).state,
        who,
        YOU,
        rec.known * 7 - 1,
      );
      const r = play(game, sim, s, doing('sleep', 600), waitUntil(10));
      const chose = r.of('family/their-choice')[0];
      expect(chose).toBeDefined();
      expect(offered(r.state, 'family/continue')).toEqual([]);
      if (chose?.continue) goOn++;
      else end++;
    }
    expect(goOn).toBeGreaterThan(end);
  });

  it('loses about the record’s share of known pregnancies, mostly early', () => {
    let lost = 0;
    let early = 0;
    const n = 200;
    for (let i = 0; i < n; i++) {
      // A life of its own for each, so each rolls from its own stream.
      const start = play(game, sim, game.init(`loss-${i}`, sim), { type: 'circle/carries', carries: true }).state;
      const s = pregnant(start, YOU, 3, rec.known * 7 - 1);
      const r = play(game, sim, s, { type: 'time/advance', minutes: 2 * 1440 });
      const p = family(r.state).pregnancy;
      if (p && p.loss >= 0) {
        lost++;
        if (p.loss - p.conceived <= 13 * 7) early++;
      }
    }
    expect(Math.abs(lost / n - rec.loss.chance / 1000)).toBeLessThan(0.05);
    expect(early).toBeGreaterThan(lost / 2);
  }, 60_000);
});
