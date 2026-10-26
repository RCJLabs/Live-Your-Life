import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, lineCook, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import type { CareerRecord } from '../job/records.ts';
import type { Listing, MarketSlice } from './module.ts';
import { hireOdds, OFFER_DAYS, REPUTATION } from './odds.ts';

// A second career, worked off screen, that bars a record: what the market needs to be tried on.
const CLERK = 'test-clerk';
const clerk = (changes: Partial<CareerRecord> = {}): CareerRecord => {
  const { place: _, crew: __, ...rest } = lineCook();
  return {
    ...rest,
    name: 'Test clerk',
    // Hours no diner shift starts at, so the coworker taking yours would show.
    shifts: [{ id: 'office', hour: 9, minute: 0, minutes: 480 }],
    // Enough staff that every life has a clerk's job going on its first day.
    employers: { districts: ['downtown'], staff: 200, turnover: 60, share: 50 },
    requires: { record: 'no-theft' },
    hiring: { base: 60, record: 30, reputation: 20 },
    ...changes,
  };
};
const records = (c: CareerRecord = clerk()): RecordPack => ({
  ...PACK.records,
  career: { ...PACK.records.career, [CLERK]: c },
});
const sim = sliceSim(records());
const game = sliceGame();

const market = (s: GameState) => s.market as MarketSlice;
const listed = (s: GameState, at = sim): Listing[] => game.fact(s, 'market.openings', undefined, at) as Listing[];
const firstFor = (s: GameState, career: string) => listed(s).find((l) => l.career === career && l.problem === null);
const apply = (opening: string) => ({ type: 'market/apply', opening });

describe('the labor market (M2.3, D74)', () => {
  it('starts the slice’s cook at the diner on your block, with a middling reputation', () => {
    const s = game.init('start', sim);
    expect(market(s).employer).toBe('line-cook-home');
    expect(market(s).reputation).toBe(REPUTATION.start);
    expect(game.fact(s, 'market.at-diner', undefined, sim)).toBe(true);
    expect(listed(s).some((l) => l.career === CLERK)).toBe(true);
  });

  it('answers an application in one to three days, at the odds it showed, and the odds come up as often', () => {
    let offered = 0;
    let shown = 0;
    const runs = 300;
    for (let i = 0; i < runs; i++) {
      const s = game.init(`apply-${i}`, sim);
      const l = firstFor(s, CLERK) as Listing;
      shown += l.odds;
      const r = play(game, sim, s, apply(l.opening));
      const a = market(r.state).applications[0];
      expect(a?.odds).toBe(l.odds);
      const after = (a?.answer as number) - (r.state.time as { tick: number }).tick;
      expect(after).toBeGreaterThanOrEqual(MINUTES_PER_DAY);
      expect(after).toBeLessThanOrEqual(3 * MINUTES_PER_DAY);
      const answered = play(game, sim, r.state, advance(3 * MINUTES_PER_DAY));
      expect(answered.of('market/offered').length + answered.of('market/turned-down').length).toBe(1);
      offered += answered.of('market/offered').length;
    }
    // 300 rolls at about 60%: within about four standard errors.
    expect(offered / runs).toBeGreaterThan(shown / runs / 100 - 0.12);
    expect(offered / runs).toBeLessThan(shown / runs / 100 + 0.12);
  });

  it('starts the job on taking an offer, pays what the old one owed, and leaves the coworker behind', () => {
    for (let i = 0; i < 40; i++) {
      const s = game.init(`take-${i}`, sim);
      const l = firstFor(s, CLERK) as Listing;
      const r = play(game, sim, s, apply(l.opening), advance(3 * MINUTES_PER_DAY));
      if (market(r.state).offers.length === 0) continue;
      // Two hours worked at the diner and not yet paid: the final paycheck comes with the move.
      const owed = { ...r.state, job: { ...(r.state.job as object), unpaid: 120 } } as GameState;
      const took = play(game, sim, owed, { type: 'market/accept', opening: l.opening });
      expect(took.of('job/paid').length).toBe(1);
      expect(took.fact('job.unpaid')).toBe(0);
      expect(took.of('job/hired')).toEqual([{ type: 'job/hired', career: CLERK }]);
      expect((took.state.job as { career: string }).career).toBe(CLERK);
      expect(market(took.state).employer).toBe(l.employer);
      // The opening is yours: the people's moves won't give it to anyone else (people/work.ts).
      expect((took.state['people-work'] as { taken: string[] }).taken).toContain(l.opening);
      expect(took.fact('market.at-diner')).toBe(false);
      expect(took.fact('ties.beside')).toBe(false);
      // They still work their own days at the diner, on its shifts, not on your new one.
      const posted = (took.state.job as { posted: { day: number }[] }).posted.map((p) => p.day);
      const signed = play(game, sim, took.state, ...posted.map((day) => ({ type: 'job/sign-up', day })));
      let worked = 0;
      for (const day of posted) {
        expect(signed.fact('job.shift-start', { day })).toBe(9 * 60);
        const theirs = signed.fact('ties.their-start', { day }) as number;
        if (theirs < 0) continue;
        worked++;
        expect(lineCook().shifts.some((k) => k.hour * 60 + k.minute === theirs)).toBe(true);
      }
      expect(worked).toBeGreaterThan(0);
      return;
    }
    throw new Error('no offer in 40 lives');
  });

  it('lets an offer lapse after two days', () => {
    for (let i = 0; i < 40; i++) {
      const s = game.init(`lapse-${i}`, sim);
      const l = firstFor(s, CLERK) as Listing;
      const r = play(game, sim, s, apply(l.opening), advance(3 * MINUTES_PER_DAY));
      if (market(r.state).offers.length === 0) continue;
      const gone = play(game, sim, r.state, advance(OFFER_DAYS * MINUTES_PER_DAY + 1));
      expect(gone.of('market/lapsed').length).toBe(1);
      expect(market(gone.state).offers).toEqual([]);
      return;
    }
    throw new Error('no offer in 40 lives');
  });

  it('costs reputation to quit, and refuses an application twice or past five at once', () => {
    const s = game.init('quit', sim);
    const q = play(game, sim, s, { type: 'job/quit' });
    expect(market(q.state).reputation).toBe(REPUTATION.start + REPUTATION.quit);
    expect(market(q.state).employer).toBeNull();
    expect(q.fact('job.employed')).toBe(false);
    const open = listed(q.state).filter((l) => l.problem === null);
    const once = play(game, sim, q.state, apply((open[0] as Listing).opening));
    expect(refusal(game, sim, once.state, apply((open[0] as Listing).opening))).toBe('applied');
    const five = play(game, sim, q.state, ...open.slice(0, 5).map((l) => apply(l.opening)));
    expect(refusal(game, sim, five.state, apply((open[5] as Listing).opening))).toBe('too-many');
  });

  it('bars a career that bars a record, and lowers the odds of one that only minds it', () => {
    // A life with a cook's job going elsewhere than your own diner.
    const convicted = Array.from({ length: 40 }, (_, i) => {
      const s = game.init(`record-${i}`, sim);
      return { ...s, law: { ...(s.law as object), convictions: 1 } } as GameState;
    }).find((s) => listed(s).some((x) => x.career === 'line-cook' && x.problem === null)) as GameState;
    const l = listed(convicted).find((x) => x.career === CLERK) as Listing;
    expect(l.problem).toBe('record');
    expect(refusal(game, sim, convicted, apply(l.opening))).toBe('record');
    const cook = listed(convicted).find((x) => x.career === 'line-cook' && x.problem === null) as Listing;
    expect(cook.odds).toBe(
      hireOdds(lineCook(), { convictions: 1, felonies: 0, reputation: REPUTATION.start, schooling: 'diploma' }),
    );
    expect(cook.odds).toBe(lineCook().hiring.base - lineCook().hiring.record);
  });
});
