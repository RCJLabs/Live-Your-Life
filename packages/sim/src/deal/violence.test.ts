import { type Beat, type GameState, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim, waitUntil, withoutRivals } from '../../test/slice.ts';
import { lifeYear } from '../../test/year.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { type CircleSlice, newTie } from '../circle/state.ts';
import type { LawSlice } from '../law/state.ts';
import { tradeOf } from './records.ts';
import { holder, noStanding, YOURS } from './rivals.ts';
import type { DealSlice } from './state.ts';

const open = sliceSim(withoutRivals());
const rivals = sliceSim();
const game = sliceGame({ people: 1000 });
const v = tradeOf(open.content).violence;
const deal = (s: GameState) => s.deal as DealSlice;
const law = (s: GameState) => s.law as LawSlice;
const cash = (s: GameState, sim = open) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;

/** A life at `hour` holding `held`, with `money`. */
function life(seed: string, hour: number, held = 400, money = 100_000, sim = open): GameState {
  const s = play(game, sim, game.init(seed, sim), waitUntil(hour)).state;
  return {
    ...s,
    deal: { ...deal(s), held },
    economy: { ...(s.economy as object), amounts: { cash: money } },
  } as GameState;
}

const shown = (s: GameState, effect: string, sim = open) =>
  turnFor(game, sim, s, Rng.create('shown'), 0).preview([{ effect }])[0] as unknown as Record<string, number>;

describe('violence (M4.1 step 3, D146)', () => {
  it('adds a beating to the illness record without moving anyone else’s illnesses: it is never drawn by chance', {
    timeout: 300_000,
  }, () => {
    const records = withoutRivals();
    const illness = records.illness as Record<string, { kinds: { id: string }[] }>;
    const mi = illness.michigan as { kinds: { id: string }[] };
    const before = sliceSim({
      ...records,
      illness: { michigan: { ...mi, kinds: mi.kinds.filter((k) => k.id !== v.hurt) } },
    });
    // A year kept fed and rested (test/year.ts), so illness comes as it would.
    let seen = 0;
    for (let i = 0; i < 2; i++) {
      const now = lifeYear(`ill-${i}`, 30, open).ill;
      expect(now).toEqual(lifeYear(`ill-${i}`, 30, before).ill);
      seen += Object.values(now).reduce((a, b) => a + b, 0);
    }
    // Some illness came, so the days' draws were there to move.
    expect(seen).toBeGreaterThan(0);
  });

  it('shows the odds of being robbed, more for what you hold and on a held corner, up to a most', () => {
    const little = life('odds', 21, 10);
    expect(shown(little, 'corner-hour').robbed).toBe(v.robbed.base);
    const more = life('odds', 21, 1000);
    expect(shown(more, 'corner-hour').robbed).toBe(
      Math.min(v.robbed.most, v.robbed.base + Math.floor(1000 / v.robbed.per)),
    );
    const lots = life('odds', 21, 9000);
    expect(shown(lots, 'corner-hour').robbed).toBe(v.robbed.most);
    for (let i = 0; i < 100; i++) {
      const s = life(`held-${i}`, 21, 10, 100_000, rivals);
      const view = { content: rivals.content, fact: (id: string, a?: object) => game.fact(s, id, a as never, rivals) };
      if (holder(view as never, YOURS) === -1) continue;
      expect(shown(s, 'corner-hour', rivals).robbed).toBe(v.robbed.base + v.robbed.held);
      return;
    }
    throw new Error('no held corner in 100 seeds');
  });

  it('robs you at the odds rolled: what you hold, cash up to the most, and sometimes a beating', {
    timeout: 120_000,
  }, () => {
    let robbed = 0;
    let beaten = 0;
    for (let i = 0; i < 120; i++) {
      const s = life(`robbed-${i}`, 21, 9000, 500_000);
      const r = play(game, open, s, { type: 'deal/corner' });
      // The first roll is the robbery's, at the odds the preview showed: the chance of the outcome it took.
      const first = r.of('logic/rolled')[0] as unknown as { outcome: number; chance: number };
      expect(first.outcome === 0 ? first.chance : 100 - first.chance).toBe(v.robbed.most);
      for (const b of r.of('deal/robbed')) {
        robbed++;
        expect(b).toMatchObject({ grams: 9000, cash: v.robbed.cash });
        expect(deal(r.state).held).toBe(0);
        expect(cash(r.state)).toBe(500_000 - v.robbed.cash);
      }
      if (r.of('deal/beaten').length > 0) {
        beaten++;
        expect(r.of('health/fell-ill')).toMatchObject([{ kind: v.hurt }]);
      }
    }
    expect(robbed).toBeGreaterThan(5);
    expect(robbed).toBeLessThan(35);
    expect(beaten).toBeGreaterThan(0);
    expect(beaten).toBeLessThan(robbed);
  });

  it('beats you sometimes when the supplier’s front goes unpaid', { timeout: 120_000 }, () => {
    let beaten = 0;
    for (let i = 0; i < 40; i++) {
      const s0 = life(`unpaid-${i}`, 12);
      const s = { ...s0, deal: { ...deal(s0), crew: true, owed: 100_000, due: 0 } } as GameState;
      const r = play(game, open, s, advance(2 * MINUTES_PER_DAY));
      expect(r.of('deal/cut-off')).toHaveLength(1);
      if (r.of('deal/beaten').some((b) => b.by === 'supplier')) beaten++;
    }
    expect(beaten).toBeGreaterThan(5);
    expect(beaten).toBeLessThan(30);
  });

  /** A member who owes you and is cut off, someone you know. */
  const owing = (seed: string) => {
    const s = life(seed, 12);
    const member = {
      person: 31,
      since: 0,
      held: 0,
      owed: 140_000,
      due: 1,
      taken: 0,
      cutOff: true,
      rival: noStanding(),
    };
    return {
      ...s,
      deal: { ...deal(s), connect: true, members: [member] },
      circle: { ...(s.circle as CircleSlice), ties: [{ ...newTie(31, 6000, 0), regard: 70 }] },
    } as GameState;
  };

  it('collects an unpaid front by force at the odds shown: the money or a fight, and they are gone either way', {
    timeout: 120_000,
  }, () => {
    expect(refusal(game, open, life('none', 12), { type: 'deal/collect', person: 31 })).toBe('nothing-to-collect');
    expect(shown(owing('shown'), 'collect-roll')).toMatchObject({ win: v.collect.win, reported: v.collect.reported });
    let won = 0;
    let lost = 0;
    let reported = 0;
    for (let i = 0; i < 60; i++) {
      const s = owing(`collect-${i}`);
      const r = play(game, open, s, { type: 'deal/collect', person: 31 });
      expect(deal(r.state).members).toEqual([]);
      expect((r.state.circle as CircleSlice).ties[0]?.regard).toBe(0);
      if (r.of('deal/collected').length) {
        won++;
        expect(cash(r.state)).toBe(100_000 + 140_000);
      } else lost++;
      if (law(r.state).visits.some((x) => x.why === 'report')) reported++;
    }
    expect(won).toBeGreaterThan(lost / 2);
    expect(lost).toBeGreaterThan(0);
    expect(reported).toBeGreaterThan(0);
    expect(reported).toBeLessThan(won);
  });

  it('robs a rival’s seller only on a held corner, and a report brings the police and a robbery charge', {
    timeout: 120_000,
  }, () => {
    expect(refusal(game, open, life('rob', 22), { type: 'deal/rob' })).toBe('nobody-to-rob');
    let charged = 0;
    for (let i = 0; i < 200 && charged === 0; i++) {
      const s = life(`rob-${i}`, 22, 0, 0, rivals);
      if (game.options(s, rivals).every((a) => a.type !== 'deal/rob')) continue;
      const r = play(game, rivals, s, { type: 'deal/rob' });
      for (const b of r.of('deal/robbed-them')) {
        expect(b.cash as number).toBeGreaterThanOrEqual(v.rob.min);
        expect(b.cash as number).toBeLessThanOrEqual(v.rob.max);
      }
      if (!law(r.state).visits.some((x) => x.why === 'report' && x.item === v.rob.robbery)) continue;
      const later = play(game, rivals, r.state, advance(10 * MINUTES_PER_DAY));
      const c = later.of('law/charged');
      expect(c).toMatchObject([{ offence: v.rob.robbery }]);
      expect(law(later.state).cases[0]?.evidence).toBe('reported');
      charged++;
    }
    expect(charged).toBe(1);
  });
});

export type { Beat };
