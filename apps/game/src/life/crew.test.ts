import type { GameState } from '@eb/core';
import { type DealSlice, tradeOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { crewItems, crewLines } from './crew.ts';
import { Life } from './session.ts';
import { cornerItems, cornerLead } from './street.ts';

const changed = (life: Life, change: (s: GameState) => object): Life =>
  new Life({ state: { ...life.state, ...change(life.state) } as GameState, kept: [] });

const deal = (life: Life) => life.state.deal as DealSlice;
const standing = { warned: 0, stretch: -1, off: -1 };
const member = (person: number, more: object = {}) => ({
  person,
  since: 0,
  held: 0,
  owed: 0,
  due: -1,
  taken: 0,
  cutOff: false,
  rival: standing,
  ...more,
});

/** A life in the supplier's crew with the connect met, holding an ounce or more, with `members` and the people they are known. */
function boss(seed: string, members: ReturnType<typeof member>[], hour = 12): Life {
  const life = new Life(seed);
  const now = life.fact('time.of-day') as number;
  life.act({ type: 'time/advance', minutes: (hour * 60 - now + 1440) % 1440 || 1440 });
  const circle = life.state.circle as { ties: object[] };
  const ties = [11, 12, 13].map((p) => ({ ...(circle.ties[0] ?? {}), ...knownWell(p) }));
  return changed(life, (s) => ({
    deal: { ...(s.deal as object), crew: true, connect: true, held: 2000, members },
    circle: { ...(s.circle as object), ties },
    economy: { ...(s.economy as object), amounts: { cash: 5_000_000 } },
  }));
}

const knownWell = (person: number) => ({
  person,
  together: 6000,
  regard: 80,
  met: 0,
  status: 'known',
  asked: -1,
  date: null,
  seen: 0,
  talked: -1,
  since: -1,
  living: false,
  dated: -1,
  nights: 0,
  proposed: -1,
  licence: null,
  hearing: -1,
  night: -1,
});

describe('a crew of your own on the page (M4.1 step 5)', () => {
  it('offers the connect’s lots at their hours, every price and weight from the trade', () => {
    const life = boss('connect', [], tradeOf(new Life('x').sim.content).boss.connect.hours.from);
    const t = tradeOf(life.sim.content);
    const lots = crewItems(life).filter((i) => i.action.type === 'deal/wholesale');
    expect(lots.map((i) => i.action.lot)).toEqual(t.boss.connect.sells.map((l) => l.id));
    expect(lots[0]?.label).toBe('Buy 250 grams from the connect for $8,500.00');
  });

  it('names the people you can bring in, and the front you would give them', () => {
    const life = boss('take', []);
    const items = crewItems(life).filter((i) => i.action.type === 'deal/take-on');
    expect(items.length).toBe(3);
    const f = tradeOf(life.sim.content).boss.crew.front;
    expect(items[0]?.note).toContain(`${f.days} days`);
    expect(items[0]?.label).toContain(life.fact('circle.name', { person: 11 }) as string);
  });

  it('tells each member’s front and debt, and offers collecting with the odds the sim rolls', () => {
    const today = 0;
    const life = boss('collect', [
      member(11, { owed: 140_000, due: today + 3, cutOff: true }),
      member(12, { held: 283 }),
    ]);
    const lines = crewLines(life);
    expect(lines[0]).toContain('owes you $1,400.00');
    expect(lines[0]).toContain('cut off');
    expect(lines[1]).toContain('holds 28.3 grams');
    const collect = crewItems(life).find((i) => i.action.type === 'deal/collect');
    const p = life.peek<{ win: number; reported: number }>({ effect: 'collect-roll', person: 11 });
    expect(collect?.note).toContain(`about ${p.win} in 100`);
    expect(collect?.note).toContain(`reported about ${p.reported} in 100`);
    expect(cornerLead(life)).toContain('Your crew:');
  });

  it('tells the odds of being robbed in an hour on the corner, as the preview has them', () => {
    const life = boss('robbed', [], 22);
    const hour = cornerItems(life).find((i) => i.action.type === 'deal/corner');
    const p = life.peek<{ robbed: number }>({ effect: 'corner-hour' });
    expect(p.robbed).toBeGreaterThan(0);
    expect(hour?.note).toContain(`robbed about ${p.robbed} in 100`);
  });

  it('says how much of your cash is the trade’s', () => {
    const life = boss('dirty', []);
    const dirty = changed(life, (s) => ({ deal: { ...(s.deal as object), dirty: 250_000 } }));
    expect(cornerLead(dirty)).toContain("$2,500.00 of your cash is the trade's");
    expect(deal(dirty).dirty).toBe(250_000);
  });
});
