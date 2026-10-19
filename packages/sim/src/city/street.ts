/**
 * What stands along the street, by rule: lamps along both curbs, a hydrant, a bench, trees on a
 * verge, a pole sign by the curb for a building that has one. None stands in a doorway, so every
 * door keeps its way to the street (walk.ts holds the block to that).
 */
import type { Rng } from '@eb/core';
import type { BuildingPlan, StreetPlan } from './block.ts';
import type { Paint, StreetRecord } from './records.ts';

export type PropKind = 'lamp' | 'tree' | 'bench' | 'pole-sign' | 'hydrant';
export type Facing = 'n' | 'e' | 's' | 'w';

export interface PropPlan {
  readonly id: string;
  readonly kind: PropKind;
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** A tree's size: 1 is the usual. */
  readonly size?: number;
  readonly sign?: Paint;
}

/** The ground each prop takes, along x and along y, as the walk grid's obstacles (tune). A tree blocks only its trunk. */
export const FOOTPRINT: Readonly<Record<PropKind, { readonly w: number; readonly d: number }>> = {
  lamp: { w: 0.3, d: 0.3 },
  tree: { w: 0.45, d: 0.45 },
  bench: { w: 1.6, d: 0.5 },
  'pole-sign': { w: 0.3, d: 0.3 },
  hydrant: { w: 0.35, d: 0.35 },
};

/** Kept clear either side of a door's middle, along the sidewalk, in metres (tune). */
export const DOORWAY = 1.4;

const tenth = (rng: Rng, min: number, max: number): number => rng.int(Math.round(min * 10), Math.round(max * 10)) / 10;

/** The first x at or east of `x`, by half metres, where a prop of half-width `half` stands clear of every door. */
function clearOf(doors: readonly number[], x: number, half: number): number {
  let at = x;
  while (doors.some((d) => Math.abs(d - at) < DOORWAY + half)) at += 0.5;
  return at;
}

function lamps(s: StreetRecord, street: StreetPlan, doors: readonly number[]): PropPlan[] {
  const out: PropPlan[] = [];
  for (let x = street.xa + 4, i = 0; x < street.xb - 2; x += s.lampEvery, i++) {
    const near = clearOf(doors, x, FOOTPRINT.lamp.w / 2);
    out.push({ id: `lamp-n-${i}`, kind: 'lamp', x: near, y: street.curb - 0.45, facing: 's' });
    out.push({ id: `lamp-s-${i}`, kind: 'lamp', x: x + s.lampEvery / 2, y: street.farCurb + 0.45, facing: 'n' });
  }
  return out;
}

function poleSigns(street: StreetPlan, buildings: readonly BuildingPlan[], doors: readonly number[]): PropPlan[] {
  return buildings.flatMap((b): PropPlan[] => {
    if (!b.poleSign) return [];
    // By the curb at the building's west end, or its east end when the door is at the west.
    const west = clearOf(doors, b.x0 + 1.5, FOOTPRINT['pole-sign'].w / 2);
    const x = west < b.x1 - 1 ? west : b.x1 - 1.5;
    return [{ id: `pole-sign-${b.id}`, kind: 'pole-sign', x, y: street.curb - 0.6, facing: 's', sign: b.poleSign }];
  });
}

function openSide(s: StreetRecord, street: StreetPlan, rng: Rng): PropPlan[] {
  const out: PropPlan[] = [];
  const mid = (street.xa + street.xb) / 2;
  out.push({ id: 'bench', kind: 'bench', x: mid + tenth(rng, -6, 6), y: street.farCurb + 1.2, facing: 'n' });
  if (street.open !== 'verge') return out;
  const span = street.xb - street.xa - 6;
  for (let i = 0; i < s.trees; i++) {
    const x = street.xa + 3 + (span * (i + 0.5)) / s.trees + tenth(rng, -1.5, 1.5);
    const y = street.openFront + Math.min(2.5, (street.openBack - street.openFront) / 2);
    out.push({ id: `tree-${i}`, kind: 'tree', x, y, facing: 's', size: tenth(rng, 0.85, 1.15) });
  }
  return out;
}

export function streetProps(
  s: StreetRecord,
  street: StreetPlan,
  buildings: readonly BuildingPlan[],
  rng: Rng,
): PropPlan[] {
  const doors = buildings.map((b) => b.door);
  const hydrant = clearOf(doors, tenth(rng, street.xa + 6, street.xb - 6), FOOTPRINT.hydrant.w / 2);
  return [
    ...lamps(s, street, doors),
    ...poleSigns(street, buildings, doors),
    { id: 'hydrant', kind: 'hydrant', x: hydrant, y: street.curb - 0.4, facing: 's' },
    ...openSide(s, street, rng.fork('open')),
  ];
}
