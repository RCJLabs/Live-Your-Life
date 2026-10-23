import { HOURS, hourOf, LINKED, rosterOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { lookOf, makeCrowd } from './crowd.ts';
import { townScene } from './town.ts';

const SEED = 4242;
const N = 1000;

describe('the tier-1 people in the town (M2.2, D69)', () => {
  const town = townScene('block-77');
  const crowd = makeCrowd(town, SEED, N);
  const never = () => false;

  it('draws each person the same every time', () => {
    expect(lookOf(SEED, 12)).toEqual(lookOf(SEED, 12));
    expect(lookOf(SEED, 12)).not.toEqual(lookOf(SEED, 13));
  });

  it('puts walkers in the town on its streets, never inside a building, and only in their hour on the way', () => {
    const roster = rosterOf(SEED, N);
    let seen = 0;
    // A working week's mornings and afternoons.
    for (let day = 0; day < 5; day++) {
      for (let hour = 5; hour < 20; hour++) {
        // Every minute: a long way to work crosses the town in a minute or two.
        for (let m = 0; m < 60; m++) {
          const minute = day * 1440 + hour * 60 + m;
          for (const a of crowd.actorsAt(minute, 0, 0, never)) {
            seen++;
            const i = Number(a.id.slice('person-'.length));
            const p = roster.people[i];
            expect(p && hourOf(p, SEED, i, day, day % 7, hour)).toBe(HOURS.commute);
            for (const b of town.scene.buildings) {
              const inside = a.x > b.x0 && a.x < b.x1 && a.y > b.y0 && a.y < b.y1;
              expect(inside, `${a.id} in ${b.id}`).toBe(false);
            }
          }
        }
      }
    }
    expect(seen, 'someone walks through the town in a week').toBeGreaterThan(0);
  });

  it('stands the coworker at the griddle and the fence behind the diner, when their modules say so', () => {
    const at = (i: number) => crowd.actorsAt(9 * 60, 0, 0, (k) => k === i).find((a) => a.id === `person-${i}`);
    const diner = town.plan.buildings.find((b) => b.interior?.template === 'diner');
    const cook = at(LINKED.coworker);
    expect(cook && diner && cook.x > diner.x0 && cook.x < diner.x1 && cook.y > diner.y0 && cook.y < diner.y1).toBe(
      true,
    );
    const fence = at(LINKED.fence);
    expect(fence && diner && fence.y < diner.y0).toBe(true);
    expect(crowd.actorsAt(9 * 60, 0, 0, never).some((a) => a.id === `person-${LINKED.coworker}`)).toBe(false);
  });
});
