import type { LawState } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { blockScene } from '../city/scene.ts';
import { itemsAt } from './menus.ts';
import { type Place, placesOf } from './places.ts';
import { Life } from './session.ts';

/** A life and its block's places, as the page has them. */
function setUp(seed: string) {
  const life = new Life(seed);
  const law = life.state.law as LawState;
  const block = blockScene(law.block);
  const places = placesOf(life.sim.content, block.plan, block.grid, law.block);
  const find = (label: string, building?: string) =>
    places.all.find((p) => p.label === label && (!building || p.building === building)) as Place;
  return { life, places, find };
}

describe('what a place offers (M1.6)', () => {
  it('offers at a fixture only what it serves, as the game offers it now', () => {
    const { life, find } = setUp('menus');
    const at = (label: string) => itemsAt(life, find(label)).map((i) => i.action.activity);
    expect(at('Kitchenette')).toEqual(['eat']);
    expect(at('Bed')).toEqual(['sleep']);
    expect(at('Couch')).toEqual(['relax']);
    expect(at('Shower')).toEqual(['wash']);
    expect(at('Stool')).toEqual(['eat', 'socialize']);
    // Off shift, the griddle has nothing: work is offered only on a shift.
    expect(at('Griddle')).toEqual([]);
  });

  it('offers a shelf’s goods with the odds the preview gives, and the fence nothing while you carry nothing', () => {
    const { life, places } = setUp('shelves');
    const shelves = places.all.filter((p) => p.kind === 'shelf');
    expect(shelves.length).toBe(9);
    for (const shelf of shelves) {
      const [take] = itemsAt(life, shelf);
      expect(take?.action).toEqual({ type: 'law/take', spot: shelf.take?.spot, item: shelf.take?.item });
      const p = life.peek<{ held: number }>({ effect: 'theft', spot: shelf.take?.spot, item: shelf.take?.item });
      expect(take?.note).toContain(`about ${p.held} in 100`);
    }
    expect(itemsAt(life, places.all.find((p) => p.kind === 'fence') as Place)).toEqual([]);
  });

  it('puts you in a flat of the walk-up, the same for a block, with your bed in it', () => {
    const a = setUp('home').places;
    const b = setUp('home').places;
    expect(a.home).toBe(b.home);
    expect(a.bed.building).toBe('apartment');
    expect(
      a.all.filter((p) => p.building === 'apartment' && p.kind === 'fixture').every((p) => p.id.includes(`/${a.home}`)),
    ).toBe(true);
  });
});
