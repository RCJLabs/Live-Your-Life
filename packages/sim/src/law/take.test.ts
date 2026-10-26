import type { GameState, TimeSlice } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceSim, tickOf, waitUntil } from '../../test/slice.ts';
import { createLifeGame } from '../game.ts';
import { shopOn, stockOf } from './shop.ts';
import type { Hold, LawSlice } from './state.ts';

// No job: the law alone. Monday 2 June 2025, 07:00, is tick 0, and the shop opens at 07:00.
const game = createLifeGame({ events: false, unlocked: true, people: 0 });
const sim = sliceSim();
const law = (state: GameState) => state.law as LawSlice;
const tick = (state: GameState) => (state.time as { tick: number }).tick;
const to = (state: GameState, day: number, hour: number, minute = 0) =>
  advance(tickOf(day, hour, minute) - tick(state));

type Kind = 'clerk' | 'camera' | 'none';
const kindOf = (state: GameState, seenBy: readonly string[]): Kind => {
  const sight = shopOn(sim.content, law(state).block);
  const who = seenBy.map((id) => sight.watchers.find((w) => w.id === id)?.who);
  return who.includes('clerk') ? 'clerk' : who.includes('camera') ? 'camera' : 'none';
};

/** A life whose shop has a shelf seen as `kind`, and a take there. */
function lifeWith(kind: Kind, from = 0) {
  for (let i = from; i < from + 200; i++) {
    const state = game.init(`take-${kind}-${i}`, sim);
    const spot = shopOn(sim.content, law(state).block).spots.find((s) => kindOf(state, s.seenBy) === kind);
    if (!spot) continue;
    const item = stockOf(sim.content, law(state).block).find((s) => s.spot === spot.id)?.item as string;
    return { state, spot, item, take: { type: 'law/take', spot: spot.id, item } };
  }
  throw new Error(`no shop with a shelf seen as ${kind}`);
}

const chance = (rolled: Record<string, unknown> | undefined) =>
  rolled?.outcome === 0 ? (rolled.chance as number) : 100 - (rolled?.chance as number);

describe('taking from a shelf (D45)', () => {
  it('offers each shelf’s goods while the shop is open, every good somewhere, and nothing once it shuts', () => {
    const { state } = lifeWith('none');
    const takes = game.options(state, sim).filter((a) => a.type === 'law/take');
    const sight = shopOn(sim.content, law(state).block);
    expect(takes.map((t) => t.spot)).toEqual(sight.spots.map((s) => s.id));
    expect(new Set(takes.map((t) => t.item))).toEqual(new Set(sim.content.ids('item')));
    const other = takes.find((t) => t.item !== takes[0]?.item);
    expect(refusal(game, sim, state, { ...takes[0], item: other?.item } as never)).toBe('not-on-that-shelf');
    const shut = play(game, sim, state, to(state, 0, 23)).state;
    expect(game.options(shut, sim).filter((a) => a.type === 'law/take')).toEqual([]);
    expect(refusal(game, sim, shut, takes[0] as never)).toBe('shop-shut');
    expect(refusal(game, sim, state, { type: 'law/take', spot: 'nowhere', item: 'bread' })).toBe('not-on-that-shelf');
  });

  it('rolls the odds the preview shows: the clerk’s where they see, a chance where nobody does, and footage', () => {
    for (const kind of ['clerk', 'camera', 'none'] as const) {
      const seen = new Set<string>();
      for (let i = 0; i < 40; i++) {
        const { state, spot, take } = lifeWith(kind, i * 7);
        const [preview] = game.preview(state, [{ effect: 'theft', spot: spot.id, item: take.item }], sim);
        expect(preview?.held).toBe(kind === 'clerk' ? 22 : 4);
        expect(preview?.filmed).toBe(kind === 'none' ? 0 : 17);
        const step = play(game, sim, state, take);
        const rolls = step.of('logic/rolled');
        expect(chance(rolls[0])).toBe(preview?.held);
        const held = step.of('law/held').length === 1;
        seen.add(held ? 'held' : 'took');
        if (!held && kind !== 'none') expect(chance(rolls[1])).toBe(preview?.filmed);
        if (!held && kind === 'none') expect(rolls.length).toBe(1);
      }
      expect(seen.has('took'), kind).toBe(true);
    }
  });

  it('adds a point of odds for every two of heat, and keeps heat at 100 at most', () => {
    const { state, spot, take } = lifeWith('clerk');
    const hot = { ...state, law: { ...law(state), heat: 40 } };
    const [preview] = game.preview(hot, [{ effect: 'theft', spot: spot.id, item: take.item }], sim);
    expect(preview?.held).toBe(22 + 20);
    // A theft adds 15 and being held 40, either way past 100 from 90.
    let checked = 0;
    for (let i = 0; i < 40; i++) {
      const life = lifeWith('clerk', i);
      const hotter = { ...life.state, law: { ...law(life.state), heat: 90 } };
      const step = play(game, sim, hotter, life.take);
      expect(law(step.state).heat).toBe(100);
      if (step.of('law/held').length === 1) checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('puts what you take in your bag, and adds heat', () => {
    for (let i = 0; i < 30; i++) {
      const { state, take } = lifeWith('none', i);
      const step = play(game, sim, state, take);
      if (step.of('law/held').length > 0) continue;
      expect(step.fact('inventory.count', { item: take.item })).toBe(1);
      expect(law(step.state).heat).toBe(15);
      return;
    }
    throw new Error('held every time');
  });
});

/** A life held at the till: the first seed where the clerk holds you. */
function held() {
  for (let i = 0; i < 200; i++) {
    const { state, take } = lifeWith('clerk', i);
    const step = play(game, sim, state, take);
    if (step.of('law/held').length === 1) return { ...step, item: take.item };
  }
  throw new Error('never held');
}

describe('held by the clerk (D46)', () => {
  it('stops you until the police come, at a time you are told, and allows only waiting', () => {
    const { state, of } = held();
    const hold = state.kernel.modes.at(-1);
    expect(hold?.id).toBe('held');
    const until = (hold?.data as Hold | undefined)?.until as number;
    expect(until - tick(state)).toBeGreaterThanOrEqual(20);
    expect(until - tick(state)).toBeLessThanOrEqual(40);
    expect(of('law/notice')).toEqual([{ type: 'law/notice', what: 'police', timer: 'law-police', tick: until }]);
    expect(game.options(state, sim).map((a) => a.type)).toEqual(['law/wait', 'time/advance', 'time/elapse']);
    expect(refusal(game, sim, state, waitUntil(12))).toBe('mode');
    expect(law(state).heat).toBe(55);
  });

  it('ends in an appearance ticket, a court date 14 to 42 days on, the demand by letter, and a bar', () => {
    const { state, item } = held();
    const waited = play(game, sim, state, { type: 'law/wait' });
    const [ticket] = waited.of('law/ticketed');
    expect(waited.state.kernel.modes.at(-1)?.id).toBe('world');
    expect(ticket?.offence).toBe('retail-fraud-3');
    expect(ticket?.court as number).toBeGreaterThanOrEqual(14);
    expect(ticket?.court as number).toBeLessThanOrEqual(42);
    const price = (sim.content.get('item', item) as { value: number }).value;
    // Ten times the price, within $50 and $200; the goods were recovered.
    expect(ticket?.demand).toBe(Math.min(20000, Math.max(5000, 10 * price)));
    expect(waited.fact('law.owed')).toBe(ticket?.demand);
    expect(waited.of('law/notice')[0]).toMatchObject({ what: 'court', case: ticket?.case });
    expect(waited.fact('inventory.count', { item })).toBe(0);
    expect(game.options(waited.state, sim).filter((a) => a.type === 'law/take')).toEqual([]);
    const barred = { type: 'law/take', spot: law(waited.state).block, item };
    expect(refusal(game, sim, waited.state, barred)).toBe('barred');
  });
  it('puts off a visit that falls while you are held to the next day, and tells you', () => {
    const { state } = held();
    const time = state.time as TimeSlice;
    const due = tick(state) + 5;
    const timer = { id: 'law-visit-9', due, effects: [{ effect: 'visit', visit: 9 }], seq: time.next };
    const visits = [{ id: 9, why: 'camera', item: 'soda', case: 0 }];
    const set = {
      ...state,
      time: { ...time, next: time.next + 1, timers: [...time.timers, timer].sort((a, b) => a.due - b.due) },
      law: { ...law(state), visits },
    } as GameState;
    const waited = play(game, sim, set, { type: 'law/wait' });
    const notice = waited.of('law/notice').find((n) => n.timer === 'law-visit-9');
    expect(notice?.what).toBe('visit');
    expect(Math.floor(((notice?.tick as number) + 7 * 60) / 1440)).toBe(1);
    expect(law(waited.state).visits.map((v) => v.id)).toEqual([9]);
    expect(waited.of('law/ticketed').length).toBe(1);
  });
});

describe('seen on camera (D46)', () => {
  /** A theft the camera caught, not held. */
  function filmed() {
    for (let i = 0; i < 400; i++) {
      const { state, take } = lifeWith('camera', i);
      const step = play(game, sim, state, take);
      if (step.of('law/held').length === 0 && law(step.state).filmed.length === 1) return { ...step, item: take.item };
    }
    throw new Error('never filmed');
  }

  it('is reviewed at close, and the police are set to come 2 to 5 days on, at a time you are told', () => {
    const { state, of, item } = filmed();
    expect(of('law/notice')).toEqual([
      { type: 'law/notice', what: 'review', timer: 'law-review', tick: tickOf(0, 23) },
    ]);
    const closed = play(game, sim, state, to(state, 0, 23, 1));
    const [notice] = closed.of('law/notice');
    expect(notice?.what).toBe('visit');
    const day = Math.floor(((notice?.tick as number) + 7 * 60) / 1440);
    expect(day).toBeGreaterThanOrEqual(2);
    expect(day).toBeLessThanOrEqual(5);
    const came = play(game, sim, closed.state, advance((notice?.tick as number) - tick(closed.state) + 1));
    const [ticket] = came.of('law/ticketed');
    // Still in the bag: taken back, and not owed for.
    expect(came.fact('inventory.count', { item })).toBe(0);
    const price = (sim.content.get('item', item) as { value: number }).value;
    expect(ticket?.demand).toBe(Math.min(20000, Math.max(5000, 10 * price)));
  });

  it('owes the price as well when the goods are gone', () => {
    const { state, item } = filmed();
    const price = (sim.content.get('item', item) as { value: number }).value;
    // Sold before the police come: nothing to recover.
    const gone = { ...state, inventory: { bag: {} } };
    const closed = play(game, sim, gone, to(gone, 0, 23, 1));
    const at = closed.of('law/notice')[0]?.tick as number;
    const came = play(game, sim, closed.state, advance(at - tick(closed.state) + 1));
    expect(came.of('law/ticketed')[0]?.demand).toBe(Math.min(20000, Math.max(5000, 10 * price)) + price);
  });
});
