/**
 * A building's ground floor (M1.2, D18, D34, D35): its rooms, the walls and doors between them,
 * its fixtures and the homes or businesses they make, planned from the seed and its interior
 * record. Worked out whenever it is needed, never stored, like the block it stands in.
 */
import type { Rng } from '@eb/core';
import { type FixturePlan, furnish } from './furnish.ts';
import type { InteriorRecord, InteriorTemplates, PlaceActivity, RoomRecord } from './interiorRecords.ts';
import { type DoorPlan, doorsOf, frameOf, type Rect, type RoomPlan, roomsOf, type WallPlan, wallsOf } from './rooms.ts';

export interface UnitPlan {
  readonly id: string;
  readonly rooms: readonly string[];
  readonly needs: readonly PlaceActivity[];
}

export interface InteriorPlan {
  readonly template: string;
  readonly rooms: readonly RoomPlan[];
  readonly walls: readonly WallPlan[];
  /** The front door first, then the record's. */
  readonly doors: readonly DoorPlan[];
  readonly fixtures: readonly FixturePlan[];
  readonly units: readonly UnitPlan[];
}

/** Interior `id` laid out in building `b`'s footprint. */
export function planInterior(
  t: InteriorTemplates,
  id: string,
  b: Rect & { readonly id: string; readonly door: number },
  rng: Rng,
): InteriorPlan {
  const record = t.interiors.get(id) as InteriorRecord;
  const frame = frameOf(b);
  const rooms = roomsOf(record, t.rooms, frame, rng.fork('walls'));
  const doors = doorsOf(record, rooms, frame);
  return {
    template: id,
    rooms,
    walls: wallsOf(rooms, doors, frame),
    doors,
    fixtures: rooms.flatMap((r) => furnish(r, (t.rooms.get(r.template) as RoomRecord).fixtures, t.fixtures, b.id)),
    units: record.units.map((u) => ({ id: u.id, rooms: u.rooms, needs: u.needs })),
  };
}
