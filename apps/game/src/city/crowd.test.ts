import { contentStore } from '@lyl/content';
import { careerRoster, HOURS, hourOf, LINKED, rosterWith } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { along, lookOf, makeCrowd } from './crowd.ts';
import { townScene } from './town.ts';

const SEED = 4242;
const N = 1000;

describe('the tier-1 people in the town (M2.2, D69)', () => {
  const town = townScene('block-77');
  const crowd = makeCrowd(town, SEED, N);
  const never = () => false;

  it('curves walkers round a corner instead of turning them on the spot', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 15 },
    ];
    let last = along(path, 0);
    let largestTurn = 0;
    let largestStep = 0;
    let nearest = Number.POSITIVE_INFINITY;
    for (let m = 0.1; m <= 35; m += 0.1) {
      const now = along(path, m);
      const turn = Math.abs(Math.atan2(Math.sin(now.yaw - last.yaw), Math.cos(now.yaw - last.yaw)));
      largestTurn = Math.max(largestTurn, turn);
      largestStep = Math.max(largestStep, Math.hypot(now.at.x - last.at.x, now.at.y - last.at.y));
      nearest = Math.min(nearest, Math.hypot(now.at.x - 20, now.at.y));
      last = now;
    }
    // A quarter turn over 4 m of curve: about 0.04 rad a 0.1 m step, never the whole turn at once.
    expect(largestTurn).toBeLessThan(0.1);
    expect(largestStep).toBeLessThan(0.15);
    // The corner itself is cut, not walked to.
    expect(nearest).toBeGreaterThan(0.5);
    expect(along(path, 0).at).toEqual({ x: 0, y: 0 });
    expect(along(path, 35).at).toEqual({ x: 20, y: 15 });
  });

  it('draws each person the same every time', () => {
    expect(lookOf(SEED, 12)).toEqual(lookOf(SEED, 12));
    expect(lookOf(SEED, 12)).not.toEqual(lookOf(SEED, 13));
  });

  it('puts walkers in the town on its streets, never inside a building, and only in their hour on the way', () => {
    const roster = careerRoster(contentStore(), SEED, N);
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

  it('draws someone between jobs (M2.3) on no way to work', () => {
    const store = contentStore();
    // The first commuter seen in the town in a working week.
    let seen: { i: number; minute: number } | null = null;
    for (let minute = 5 * 60; minute < 5 * 1440 && !seen; minute += 1) {
      const a = crowd.actorsAt(minute, 0, 0, never).find((x) => x.id.startsWith('person-'));
      if (a) seen = { i: Number(a.id.slice('person-'.length)), minute };
    }
    expect(seen, 'a commuter in the town').not.toBeNull();
    if (!seen) return;
    const who = seen.i;
    const left = makeCrowd(town, SEED, N, () => rosterWith(store, SEED, N, [who, -1], 1));
    expect(left.actorsAt(seen.minute, 0, 0, never).some((a) => a.id === `person-${who}`)).toBe(false);
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
