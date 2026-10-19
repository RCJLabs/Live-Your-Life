import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceSim, tickOf } from '../../test/slice.ts';
import { START_CASH } from '../dials.ts';
import { createLifeGame } from '../game.ts';
import { shopOn, stockOf } from './shop.ts';
import type { Case, LawSlice } from './state.ts';

// No job: the law alone. Monday 2 June 2025, 07:00, is tick 0.
const game = createLifeGame();
const sim = sliceSim();
const law = (state: GameState) => state.law as LawSlice;
const tick = (state: GameState) => (state.time as { tick: number }).tick;
const to = (state: GameState, day: number, hour: number, minute = 0) =>
  advance(tickOf(day, hour, minute) - tick(state));
const chance = (rolled: Record<string, unknown> | undefined) =>
  rolled?.outcome === 0 ? (rolled.chance as number) : 100 - (rolled?.chance as number);

const CASE: Case = { id: 1, offence: 'retail-fraud-3', value: 1999, evidence: 'held', court: 3, warrant: false };

/** A life with a case to answer on day 3, and `changes` to its record. */
function withCase(seed: string, kase: Partial<Case> = {}, changes: Partial<LawSlice> = {}): GameState {
  const state = game.init(seed, sim);
  return { ...state, law: { ...law(state), cases: [{ ...CASE, ...kase }], next: 2, ...changes } };
}

/** In court on the case's date. */
function inCourt(seed: string, kase: Partial<Case> = {}, changes: Partial<LawSlice> = {}) {
  const start = withCase(seed, kase, changes);
  const there = play(game, sim, start, to(start, 3, 9));
  return play(game, sim, there.state, { type: 'law/attend' });
}

describe('the court date (D47)', () => {
  it('is open on its day within the court’s hours, and a hearing allows only a plea', () => {
    const start = withCase('hours');
    const early = play(game, sim, start, to(start, 3, 7, 59)).state;
    expect(game.options(early, sim).some((a) => a.type === 'law/attend')).toBe(false);
    expect(refusal(game, sim, early, { type: 'law/attend' })).toBe('no-hearing-now');
    const court = inCourt('hours');
    expect(court.state.kernel.modes.at(-1)).toEqual({ id: 'court', data: { case: 1 } });
    expect(game.options(court.state, sim)).toEqual([
      { type: 'law/plead', plea: 'guilty' },
      { type: 'law/plead', plea: 'hyta' },
      { type: 'law/plead', plea: 'contest' },
    ]);
    const late = play(game, sim, start, to(start, 3, 12)).state;
    expect(game.options(late, sim).some((a) => a.type === 'law/attend')).toBe(false);
  });

  it('a guilty plea: a conviction, its fine and costs owed', () => {
    const guilty = play(game, sim, inCourt('guilty').state, { type: 'law/plead', plea: 'guilty' });
    expect(guilty.of('law/convicted')).toEqual([
      { type: 'law/convicted', offence: 'retail-fraud-3', why: 'plea', owed: 32500 },
    ]);
    expect([guilty.fact('law.convictions'), guilty.fact('law.owed'), guilty.fact('law.cases')]).toEqual([1, 32500, 0]);
    expect(guilty.state.kernel.modes.at(-1)?.id).toBe('world');
  });

  it('offers HYTA on a first offence only, below 26, and once', { timeout: 60_000 }, () => {
    const second = inCourt('second', {}, { convictions: 1 });
    expect(game.options(second.state, sim).map((a) => a.plea)).toEqual(['guilty', 'contest']);
    expect(refusal(game, sim, second.state, { type: 'law/plead', plea: 'hyta' })).toBe('not-offered');
    const again = inCourt('again', {}, { hyta: 'done' });
    expect(game.options(again.state, sim).map((a) => a.plea)).toEqual(['guilty', 'contest']);
    // Eight years on, 26: past HYTA's age.
    const day = 8 * 365;
    const start = withCase('old', { court: day });
    const old = play(game, sim, play(game, sim, start, to(start, day, 9)).state, { type: 'law/attend' });
    expect(game.options(old.state, sim).map((a) => a.plea)).toEqual(['guilty', 'contest']);
  });

  it('HYTA: probation, a check-in every 30 days with its fee, and no record when it is done', () => {
    const trainee = play(game, sim, inCourt('hyta').state, { type: 'law/plead', plea: 'hyta' });
    expect(law(trainee.state).probation).toEqual({ until: 183, next: 33, offence: 'retail-fraud-3' });
    expect(trainee.fact('law.convictions')).toBe(0);
    let state = trainee.state;
    for (const day of [33, 63, 93, 123, 153]) {
      state = play(game, sim, state, to(state, day, 10)).state;
      expect(refusal(game, sim, state, { type: 'law/plead', plea: 'guilty' })).toBe('mode');
      state = play(game, sim, state, { type: 'law/check-in' }).state;
    }
    expect(law(state).owed.court).toBe(5 * 3000);
    const done = play(game, sim, state, to(state, 183, 0, 1));
    expect(done.of('law/discharged').length).toBe(1);
    expect([law(done.state).hyta, done.fact('law.convictions'), done.fact('law.probation')]).toEqual([
      'done',
      0,
      false,
    ]);
  });

  it('HYTA ends at a missed check-in, and the conviction it held off is entered', () => {
    const trainee = play(game, sim, inCourt('miss').state, { type: 'law/plead', plea: 'hyta' }).state;
    const missed = play(game, sim, trainee, to(trainee, 34, 0, 1));
    expect(missed.of('law/revoked')).toEqual([{ type: 'law/revoked', why: 'missed-check-in' }]);
    expect([law(missed.state).hyta, missed.fact('law.convictions')]).toEqual(['revoked', 1]);
    const early = play(game, sim, trainee, to(trainee, 33, 23, 59));
    expect(early.of('law/revoked')).toEqual([]);
  });

  it('HYTA ends at a new offence, and the conviction it held off is entered', () => {
    for (let i = 0; i < 100; i++) {
      const trainee = play(game, sim, inCourt(`new-${i}`).state, { type: 'law/plead', plea: 'hyta' }).state;
      const sight = shopOn(sim.content, law(trainee).block);
      const clerk = sight.watchers.find((w) => w.who === 'clerk')?.id;
      const spot = sight.spots.find((x) => x.seenBy.includes(clerk ?? ''));
      const shelf = stockOf(sim.content, law(trainee).block).find((x) => x.spot === spot?.id);
      if (!shelf) continue;
      const taken = play(game, sim, trainee, { type: 'law/take', ...shelf });
      if (taken.of('law/held').length === 0) continue;
      const ticketed = play(game, sim, taken.state, { type: 'law/wait' });
      expect(ticketed.of('law/revoked')).toEqual([{ type: 'law/revoked', why: 'new-offence' }]);
      expect([law(ticketed.state).hyta, ticketed.fact('law.convictions'), ticketed.fact('law.cases')]).toEqual([
        'revoked',
        1,
        1,
      ]);
      // The new case is charged before the old conviction is entered: the third degree still.
      expect(law(ticketed.state).cases[0]?.offence).toBe('retail-fraud-3');
      return;
    }
    throw new Error('never held');
  });

  it('contesting it rolls the odds the evidence sets, as its preview shows', () => {
    const seen = new Set<string>();
    for (const evidence of ['held', 'camera', 'sale'] as const) {
      for (let i = 0; i < 40; i++) {
        const court = inCourt(`contest-${evidence}-${i}`, { evidence });
        const [preview] = game.preview(court.state, [{ effect: 'contest', case: 1 }], sim);
        expect(preview?.chance).toBe(evidence === 'held' ? 10 : 30);
        const tried = play(game, sim, court.state, { type: 'law/plead', plea: 'contest' });
        expect(chance(tried.of('logic/rolled')[0])).toBe(preview?.chance);
        const dismissed = tried.of('law/dismissed').length === 1;
        expect(tried.fact('law.convictions')).toBe(dismissed ? 0 : 1);
        seen.add(dismissed ? 'dismissed' : 'convicted');
      }
    }
    expect([...seen].sort()).toEqual(['convicted', 'dismissed']);
  });
});

describe('a missed court date (D46)', () => {
  it('is a warrant at midnight, and an arrest at a time you are told', () => {
    const start = withCase('warrant');
    const before = play(game, sim, start, to(start, 3, 23, 59));
    expect(before.of('law/warrant')).toEqual([]);
    const after = play(game, sim, before.state, to(before.state, 4, 0, 1));
    expect(after.of('law/warrant')).toEqual([{ type: 'law/warrant', case: 1 }]);
    expect(after.fact('law.warrant')).toBe(true);
    const [notice] = after.of('law/notice');
    expect(notice?.what).toBe('arrest');
    const arrested = play(game, sim, after.state, advance((notice?.tick as number) - tick(after.state)));
    expect(arrested.of('law/arrested')).toEqual([{ type: 'law/arrested', case: 1 }]);
    expect(arrested.state.kernel.modes.at(-1)?.id).toBe('held');
    // Twelve hours in the cells, then the hearing and a plea.
    const heard = play(game, sim, arrested.state, { type: 'law/wait' });
    expect(heard.of('law/hearing')).toEqual([{ type: 'law/hearing', case: 1 }]);
    expect(heard.state.kernel.modes.at(-1)).toEqual({ id: 'court', data: { case: 1 } });
    expect(tick(heard.state) - tick(arrested.state)).toBe(720);
    const pleaded = play(game, sim, heard.state, { type: 'law/plead', plea: 'guilty' });
    expect([pleaded.fact('law.warrant'), pleaded.fact('law.cases')]).toEqual([false, 0]);
  });
});

describe('what you owe', () => {
  it('is paid all at once, when you have it', () => {
    const start = withCase('pay', {}, { cases: [], owed: { demand: 5000, court: 12500 } });
    const pay = game.options(start, sim).filter((a) => a.type === 'law/pay');
    expect(pay).toEqual([{ type: 'law/pay' }]);
    const paid = play(game, sim, start, { type: 'law/pay' });
    expect(paid.fact('economy.amount', { resource: 'cash' })).toBe(START_CASH - 17500);
    expect(paid.fact('law.owed')).toBe(0);
    const broke = withCase('broke', {}, { cases: [], owed: { demand: 0, court: START_CASH + 1 } });
    expect(game.options(broke, sim).filter((a) => a.type === 'law/pay')).toEqual([]);
    expect(refusal(game, sim, broke, { type: 'law/pay' })).toBe('not-enough');
  });
});
