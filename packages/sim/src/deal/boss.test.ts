import type { Beat, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { type CircleSlice, newTie } from '../circle/state.ts';
import { chargeFor, tradeOf } from './records.ts';
import type { DealSlice } from './state.ts';
import { MOST_HELD } from './trade.ts';

const sim = sliceSim();
const game = sliceGame({ people: 1000 });
const trade = tradeOf(sim.content);
const boss = trade.boss;
const deal = (s: GameState) => s.deal as DealSlice;
const cash = (s: GameState) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
const PEOPLE = [11, 12, 13, 14, 15];

/** A life in the supplier's crew at `hour`, knowing PEOPLE well, with what you hold and cash. */
function life(seed: string, hour: number, changes: Partial<DealSlice> = {}, money = 5_000_000, regard = 80): GameState {
  const s = play(game, sim, game.init(seed, sim), waitUntil(hour)).state;
  const ties = PEOPLE.map((p) => ({ ...newTie(p, 6000, 0), regard }));
  return {
    ...s,
    deal: { ...deal(s), crew: true, trust: boss.connect.trust, ...changes },
    circle: { ...(s.circle as CircleSlice), ties },
    economy: { ...(s.economy as object), amounts: { cash: money } },
  } as GameState;
}

function days(s: GameState, n: number) {
  const beats: Beat[] = [];
  let now = s;
  for (let d = 0; d < n; d++) {
    const r = play(game, sim, now, advance(MINUTES_PER_DAY));
    beats.push(...r.beats);
    now = r.state;
  }
  return { state: now, of: (t: string) => beats.filter((b) => b.type === t) };
}

const withCrew = (s: GameState, people: number[], held = boss.crew.front.grams * people.length) =>
  ({
    ...s,
    deal: {
      ...deal(s),
      connect: true,
      held,
      members: people.map((person) => ({ person, since: 0, held: 0, owed: 0, due: -1, taken: 0, cutOff: false })),
    },
  }) as GameState;

describe('a crew of your own (M4.1 step 1, D145)', () => {
  it('meets the connect through the supplier once trusted, and not while hot', () => {
    const evening = trade.supplier.hours.from;
    expect(refusal(game, sim, life('meet', evening, { trust: 1 }), { type: 'deal/meet-connect' })).toBe('not-trusted');
    expect(
      refusal(game, sim, life('meet', evening, { heat: boss.connect.heat + 1, asOf: 0 }), {
        type: 'deal/meet-connect',
      }),
    ).toBe('too-hot');
    expect(refusal(game, sim, life('meet', 10), { type: 'deal/meet-connect' })).toBe('no-supplier-now');
    const r = play(game, sim, life('meet', evening), { type: 'deal/meet-connect' });
    expect(r.of('deal/met-connect')).toHaveLength(1);
    expect(deal(r.state).connect).toBe(true);
  });

  it('buys weight at wholesale at the connect’s hours, past what the supplier would let you hold', () => {
    const s = life('wholesale', boss.connect.hours.from, { connect: true });
    const quarter = boss.connect.sells[0];
    const r = play(game, sim, s, { type: 'deal/wholesale', lot: quarter?.id });
    expect(deal(r.state).held).toBe(quarter?.grams);
    expect(deal(r.state).held).toBeGreaterThan(MOST_HELD);
    expect(cash(r.state)).toBe(5_000_000 - (quarter?.price as number));
    const full = { ...r.state, deal: { ...deal(r.state), held: boss.connect.most } } as GameState;
    expect(refusal(game, sim, full, { type: 'deal/wholesale', lot: quarter?.id })).toBe('holding-too-much');
    expect(refusal(game, sim, life('w', 10, { connect: true }), { type: 'deal/wholesale', lot: quarter?.id })).toBe(
      'no-connect-now',
    );
    expect(refusal(game, sim, life('w', boss.connect.hours.from), { type: 'deal/wholesale', lot: quarter?.id })).toBe(
      'no-connect',
    );
  });

  it('takes on people you know well who think well of you, up to the crew’s most', () => {
    const s = life('take', 12, { connect: true });
    expect(refusal(game, sim, s, { type: 'deal/take-on', person: 99 })).toBe('not-known');
    expect(
      refusal(game, sim, life('take', 12, { connect: true }, 0, boss.crew.regard - 1), {
        type: 'deal/take-on',
        person: 11,
      }),
    ).toBe('not-enough-regard');
    let r = s;
    for (const p of PEOPLE.slice(0, boss.crew.most)) r = play(game, sim, r, { type: 'deal/take-on', person: p }).state;
    expect(deal(r).members.map((m) => m.person)).toEqual(PEOPLE.slice(0, boss.crew.most));
    expect(refusal(game, sim, r, { type: 'deal/take-on', person: PEOPLE[boss.crew.most] })).toBe('crew-full');
    expect(refusal(game, sim, r, { type: 'deal/take-on', person: 11 })).toBe('in-your-crew');
  });

  it('fronts a member an ounce owed by a day, and is paid as they sell it', () => {
    const s = withCrew(life('front', 12), [11]);
    const r = play(game, sim, s, { type: 'deal/front-to', person: 11 });
    const m = deal(r.state).members[0];
    expect(m).toMatchObject({ held: boss.crew.front.grams, owed: boss.crew.front.price, due: boss.crew.front.days });
    expect(deal(r.state).held).toBe(0);
    expect(refusal(game, sim, r.state, { type: 'deal/front-to', person: 11 })).toBe('still-owed');
    const later = days(r.state, boss.crew.front.days);
    const paid = later.of('deal/member-paid');
    const arrested = later.of('deal/member-arrested');
    // Either they sold enough and paid, or they were taken in on the way.
    expect(paid.length + arrested.length).toBe(1);
    if (paid.length === 1) expect(cash(later.state)).toBe(cash(r.state) + boss.crew.front.price);
  });

  it('pays across lives as often as most members meet their front, and cuts off one who does not', {
    timeout: 120_000,
  }, () => {
    let paid = 0;
    let unpaid = 0;
    let arrested = 0;
    for (let i = 0; i < 20; i++) {
      const s = play(game, sim, withCrew(life(`fronts-${i}`, 12), [11]), { type: 'deal/front-to', person: 11 }).state;
      const later = days(s, boss.crew.front.days + 2);
      paid += later.of('deal/member-paid').length;
      unpaid += later.of('deal/member-unpaid').length;
      arrested += later.of('deal/member-arrested').length;
      for (const b of later.of('deal/member-unpaid')) {
        const m = deal(later.state).members.find((x) => x.person === b.person);
        expect(m?.cutOff).toBe(true);
      }
    }
    expect(paid + unpaid + arrested).toBeGreaterThanOrEqual(20);
    expect(paid).toBeGreaterThan(unpaid);
  });

  it('is named by a member taken in more often the less they think of you', { timeout: 180_000 }, () => {
    const namedAt = (regard: number) => {
      let named = 0;
      let taken = 0;
      for (let i = 0; i < 40 && taken < 15; i++) {
        const base = life(`named-${regard}-${i}`, 12, {}, 5_000_000, regard);
        const s = play(game, sim, withCrew(base, [11]), { type: 'deal/front-to', person: 11 }).state;
        const later = days(s, boss.crew.front.days);
        for (const b of later.of('deal/member-arrested')) {
          taken++;
          if (b.named === true) {
            named++;
            expect(deal(later.state).seen.length).toBeGreaterThanOrEqual(2);
          }
        }
      }
      return { named, taken };
    };
    expect(namedAt(100).named).toBe(0);
    // Their regard fallen to nothing since they came in: named at the record's odds, most times.
    const low = namedAt(0);
    expect(low.taken).toBeGreaterThan(5);
    expect(low.named).toBeGreaterThan(low.taken / 2);
  });

  it('cuts off a member whose front comes due unpaid, until they pay it', () => {
    const fronted = play(game, sim, withCrew(life('unpaid', 12), [11]), { type: 'deal/front-to', person: 11 }).state;
    // What they held is gone (lost, used, given away): nothing to pay you from.
    const d = deal(fronted);
    const lost = { ...fronted, deal: { ...d, members: d.members.map((m) => ({ ...m, held: 0 })) } } as GameState;
    const later = days(lost, boss.crew.front.days + 1);
    expect(later.of('deal/member-unpaid')).toMatchObject([{ person: 11, owed: boss.crew.front.price }]);
    expect(deal(later.state).members[0]?.cutOff).toBe(true);
    const more = { ...later.state, deal: { ...deal(later.state), held: boss.crew.front.grams } } as GameState;
    expect(refusal(game, sim, more, { type: 'deal/front-to', person: 11 })).toBe('cut-off');
  });

  it('lets a member go, with what they owe', () => {
    const s = play(game, sim, withCrew(life('go', 12), [11]), { type: 'deal/front-to', person: 11 }).state;
    const r = play(game, sim, s, { type: 'deal/let-go', person: 11 });
    expect(r.of('deal/let-go')[0]).toMatchObject({ person: 11, owed: boss.crew.front.price, forgiven: true });
    expect(deal(r.state).members).toEqual([]);
  });

  it('charges the heavier weights by Michigan’s brackets', () => {
    expect(chargeFor(sim.content, trade.possession, 2500, 0)).toBe('possession-cocaine-450');
    expect(chargeFor(sim.content, trade.possession, 5000, 0)).toBe('possession-cocaine-1000');
    expect(chargeFor(sim.content, trade.possession, 12000, 0)).toBe('possession-cocaine-kilo');
    expect(chargeFor(sim.content, trade.delivery, 600, 0)).toBe('delivery-cocaine-450');
    expect(chargeFor(sim.content, trade.delivery, 10000, 0)).toBe('delivery-cocaine-kilo');
  });
});
