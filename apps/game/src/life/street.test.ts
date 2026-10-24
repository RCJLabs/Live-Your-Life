import type { GameState } from '@eb/core';
import { type DealSlice, type LawState, offenceOf, tradeOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { blockScene } from '../city/scene.ts';
import { itemsAt, modeSheet } from './menus.ts';
import { type Place, placesOf } from './places.ts';
import { Life } from './session.ts';
import { PASS_DAYS, passOneDay } from './street.ts';

/** A life with its state changed: what a save of it would hold. */
const changed = (life: Life, change: (s: GameState) => object): Life =>
  new Life({ state: { ...life.state, ...change(life.state) } as GameState, kept: [] });

function setUp(seed: string) {
  const life = new Life(seed);
  const law = life.state.law as LawState;
  const block = blockScene(law.block);
  const places = placesOf(life.sim.content, block.plan, block.grid, law.block);
  return { life, corner: places.all.find((p) => p.kind === 'corner') as Place, grid: block.grid };
}

const deal = (life: Life) => life.state.deal as DealSlice;
const withDeal = (life: Life, d: Partial<DealSlice>, cash?: number) =>
  changed(life, (s) => ({
    deal: { ...(s.deal as object), ...d },
    ...(cash === undefined ? {} : { economy: { ...(s.economy as object), amounts: { cash } } }),
  }));

/** The life at an hour of today or tomorrow. */
function at(life: Life, hour: number): Life {
  const now = life.fact('time.of-day') as number;
  life.act({ type: 'time/advance', minutes: (hour * 60 - now + 1440) % 1440 || 1440 });
  return life;
}

describe('the street trade on the page (M2.4)', () => {
  it('lays out a corner on the sidewalk by the corner shop, which can be walked to', () => {
    const { corner, grid } = setUp('corner');
    expect(corner.label).toBe('The corner');
    expect(grid.cost[corner.cell]).toBeLessThan(Number.POSITIVE_INFINITY);
  });

  it('sells by the supplier’s lots at their hours, every price and weight from the trade', () => {
    const { life, corner } = setUp('buy');
    expect(itemsAt(life, corner)).toEqual([]);
    const evening = at(life, tradeOf(life.sim.content).supplier.hours.from);
    const labels = itemsAt(evening, corner).map((i) => i.label);
    expect(labels).toContain('Buy 3.5 grams for $180.00');
    expect(labels).not.toContain('Buy 28.3 grams for $1,200.00');
  });

  it('offers an hour on the corner with the odds the preview gives', () => {
    const { life, corner } = setUp('sell');
    const holding = withDeal(at(life, 22), { held: 50 });
    const [hour] = itemsAt(holding, corner).filter((i) => i.action.type === 'deal/corner');
    const p = holding.peek<{ buyer: number; seen: number }>({ effect: 'corner-hour' });
    expect(hour?.note).toContain(`about ${p.buyer} in 100 each ten minutes`);
    expect(hour?.note).toContain(`seen about ${p.seen} in 100`);
  });

  it('offers the crew’s steps as the sim allows them', () => {
    const { life, corner } = setUp('crew');
    const t = tradeOf(life.sim.content);
    const evening = at(life, t.supplier.hours.from);
    const trusted = withDeal(evening, { trust: t.crew.trust });
    expect(itemsAt(trusted, corner).some((i) => i.action.type === 'deal/join')).toBe(true);
    const inCrew = withDeal(evening, { trust: t.crew.trust, crew: true });
    const front = itemsAt(inCrew, corner).find((i) => i.action.type === 'deal/front');
    expect(front?.note).toContain('$1,000.00');
    const owing = withDeal(evening, { crew: true, owed: t.crew.front.price, due: 14 }, 200_000);
    expect(itemsAt(owing, corner).map((i) => i.label)).toContain(`Pay ${deal(owing).supplier?.first} back $1,000.00`);
  });

  it('shows arraignment with the bond the trade sets, and prison with the parole board’s odds', {
    timeout: 60_000,
  }, () => {
    const { life } = setUp('caught');
    const t = tradeOf(life.sim.content);
    const seen = Array.from({ length: t.police.enough - 1 }, () => ({ day: 0, hour: 22, grams: 5, passing: 0 }));
    const now = withDeal(at(life, 21), { held: 200, seen, heat: 100, asOf: 0 }, 0);
    for (let h = 0; h < 40 && !(now.state.law as LawState).visits.some((v) => v.why === 'raid'); h++)
      now.act({ type: 'deal/corner' });
    for (let d = 0; d < 12 && now.mode.id === 'world'; d++) now.act({ type: 'time/advance', minutes: 1440 });
    for (let i = 0; i < 4 && now.mode.id === 'held'; i++) now.act({ type: 'law/wait' });
    const bail = modeSheet(now);
    expect(bail?.title).toBe('Arraigned');
    expect(bail?.lead).toContain('Bail is $5,000.00: $500.00 posted');
    expect(bail?.items.map((i) => i.label)).toEqual(['Stay in jail until the court date']);
    now.act({ type: 'law/remand' });
    now.act({ type: 'law/wait' });
    const court = modeSheet(now);
    const offence = offenceOf(now.sim.content, 'delivery-cocaine-50');
    expect(court?.items.find((i) => i.label === 'Plead guilty')?.note).toContain(
      `up to ${offence.first?.jail.max} days`,
    );
    const repeat = changed(now, (s) => ({ law: { ...(s.law as object), convictions: 1 } }));
    const sentenced = changed(repeat, () => ({}));
    sentenced.act({ type: 'law/plead', plea: 'guilty' });
    // A standing off the start, so its odds are its own.
    const worked = changed(sentenced, (st) => ({ prison: { ...(st.prison as object), standing: 80 } }));
    const inside = modeSheet(worked);
    expect(inside?.title).toBe('In prison');
    const chance = worked.peek<{ chance: number }>({ effect: 'parole-odds' }).chance;
    expect(chance).not.toBe(sentenced.peek<{ chance: number }>({ effect: 'parole-odds' }).chance);
    expect(inside?.lead).toContain(`about ${chance} in 100`);
    expect(inside?.items[0]?.action.type).toBe(PASS_DAYS);
    // A day a frame. It stops for what there is to tell, news from outside too (rent owed), and
    // the player lets the days pass again, until the parole board's hearing.
    const hearing = sentenced.fact('prison.to-hearing') as number;
    const day0 = sentenced.fact('time.day') as number;
    let stops = 0;
    for (let frame = 0; frame <= hearing && sentenced.mode.id === 'prison'; frame++) {
      const before = sentenced.fact('time.day') as number;
      // Stopped while still inside: for something told.
      if (!passOneDay(sentenced) && sentenced.mode.id === 'prison') stops++;
      expect(sentenced.fact('time.day')).toBe(before + 1);
      if (sentenced.fresh.some((l) => /parole board|paroled/.test(l))) break;
    }
    expect(sentenced.fact('time.day')).toBe(day0 + hearing);
    expect(stops).toBeGreaterThan(0);
    expect(sentenced.fresh.some((l) => /parole board|paroled/.test(l))).toBe(true);
  });
});
