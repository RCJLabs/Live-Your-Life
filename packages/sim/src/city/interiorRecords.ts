/**
 * Interiors as packages/content holds them (types/fixture.json, room.json, interior.json), read
 * from a record store. The compiler checks each field and every ref; what it can't check is
 * checked here, once, as the records are read: names that point inside an interior, and a
 * fixture placed by exactly one rule.
 */
import type { RecordStore } from '@eb/core';
import type { Activity } from '../needs.ts';
import type { Facing } from './street.ts';

export type { Facing };
/** What a place can be for: any activity but being awake, which happens anywhere. */
export type PlaceActivity = Exclude<Activity, 'awake'>;
/** Where a person goes to use a fixture, as it faces: left and right are its own. */
export type Side = 'front' | 'back' | 'left' | 'right';
export type FloorKind = 'checker' | 'wood' | 'tile';
export type UsePose = 'stand' | 'sit' | 'eat' | 'lie' | 'cook';
export type DrawKind =
  | 'stove'
  | 'fridge'
  | 'prep'
  | 'counter'
  | 'stool'
  | 'booth'
  | 'table'
  | 'chair'
  | 'bed'
  | 'nightstand'
  | 'couch'
  | 'tv'
  | 'rug'
  | 'kitchenette'
  | 'shower'
  | 'toilet'
  | 'sink'
  | 'dish'
  | 'shelves'
  | 'stairs'
  | 'camera';

export interface UseRecord {
  readonly side: Side;
  readonly gap: number;
  readonly serves: readonly PlaceActivity[];
  readonly pose: UsePose;
}

/** Whoever or whatever watches from a fixture (D45): a clerk from its use spot, or a camera from itself. */
export interface WatchRecord {
  readonly from: 'use' | 'itself';
  /** All the way round, or within a quarter turn either side of the way it faces. */
  readonly field: 'around' | 'ahead';
  readonly range: number;
  readonly who: 'clerk' | 'camera';
}

export interface FixtureRecord {
  readonly name: string;
  readonly draw: DrawKind;
  readonly width: number;
  readonly depth: number;
  readonly blocks: boolean;
  /** Tall enough to hide someone behind it. */
  readonly screens?: boolean;
  /** The kind of goods a shop keeps on it (D48). */
  readonly stock?: string;
  readonly watch?: WatchRecord;
  readonly use?: UseRecord;
}

export interface FixtureRule {
  readonly fixture: string;
  readonly facing: Facing;
  readonly line: number;
  readonly x?: number;
  readonly at?: number;
  readonly span?: { readonly from: number; readonly to: number };
  readonly every?: number;
  readonly width?: number;
  readonly depth?: number;
  readonly id?: string;
  readonly side?: Side;
}

export interface RoomRecord {
  readonly name: string;
  readonly floor: FloorKind;
  readonly walls: readonly string[];
  readonly fixtures: readonly FixtureRule[];
}

export interface Edge {
  readonly from: 'west' | 'east' | 'back' | 'front' | 'door';
  readonly by: number;
}

export interface RoomPlacement {
  readonly id: string;
  readonly room: string;
  readonly mirror?: boolean;
  readonly west: Edge;
  readonly east: Edge;
  readonly back: Edge;
  readonly front: Edge;
}

export interface DoorRecord {
  readonly room: string;
  readonly side: Facing;
  readonly at: number;
  readonly width?: number;
}

export interface UnitRecord {
  readonly id: string;
  readonly rooms: readonly string[];
  readonly needs: readonly PlaceActivity[];
}

export interface InteriorRecord {
  readonly name: string;
  readonly rooms: readonly RoomPlacement[];
  readonly doors: readonly DoorRecord[];
  readonly units: readonly UnitRecord[];
}

/** Every interior the block's buildings name, with the rooms and fixtures those name. */
export interface InteriorTemplates {
  readonly interiors: ReadonlyMap<string, InteriorRecord>;
  readonly rooms: ReadonlyMap<string, RoomRecord>;
  readonly fixtures: ReadonlyMap<string, FixtureRecord>;
}

const fail = (where: string, what: string): never => {
  throw new Error(`content: ${where}: ${what}`);
};

function checkRule(where: string, rule: FixtureRule, fixture: FixtureRecord): void {
  const ways = [rule.x, rule.at, rule.span].filter((w) => w !== undefined).length;
  if (ways !== 1) fail(where, `${rule.fixture} needs exactly one of x, at and span, not ${ways}`);
  if (rule.every !== undefined && !rule.span) fail(where, `${rule.fixture} repeats every ${rule.every} m with no span`);
  if (rule.side && !fixture.use) fail(where, `${rule.fixture} has a side to use it from, but no use`);
}

function checkInterior(id: string, t: InteriorRecord): void {
  const where = `interior/${id}`;
  const ids = new Set<string>();
  for (const r of t.rooms) {
    if (ids.has(r.id)) fail(where, `room ${r.id} is named twice`);
    ids.add(r.id);
  }
  for (const d of t.doors) if (!ids.has(d.room)) fail(where, `a door is in room ${d.room}, which it has no room by`);
  const owned = new Set<string>();
  for (const u of t.units) {
    for (const r of u.rooms) {
      if (!ids.has(r)) fail(where, `unit ${u.id} names room ${r}, which it has no room by`);
      if (owned.has(r)) fail(where, `room ${r} is in two units`);
      owned.add(r);
    }
  }
}

/** Reads interior `id`, its rooms and their fixtures into `into`, checking what the compiler can't. */
export function readInterior(
  store: RecordStore,
  id: string,
  into: {
    interiors: Map<string, InteriorRecord>;
    rooms: Map<string, RoomRecord>;
    fixtures: Map<string, FixtureRecord>;
  },
): void {
  if (into.interiors.has(id)) return;
  const interior = store.getOrThrow<InteriorRecord>('interior', id);
  checkInterior(id, interior);
  into.interiors.set(id, interior);
  for (const placed of interior.rooms) {
    if (into.rooms.has(placed.room)) continue;
    const room = store.getOrThrow<RoomRecord>('room', placed.room);
    for (const rule of room.fixtures) {
      const fixture = store.getOrThrow<FixtureRecord>('fixture', rule.fixture);
      checkRule(`room/${placed.room}`, rule, fixture);
      into.fixtures.set(rule.fixture, fixture);
    }
    into.rooms.set(placed.room, room);
  }
}
