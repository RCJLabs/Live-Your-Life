/**
 * The block's templates as packages/content holds them (types/street.json, facade.json,
 * building.json, block.json), read from a record store. The compiler has already checked each
 * field; what it can't check is that a range's min is not above its max, so that is checked
 * here, once, as the templates are read.
 */
import type { RecordStore } from '@eb/core';
import {
  type FixtureRecord,
  type InteriorRecord,
  type InteriorTemplates,
  type RoomRecord,
  readInterior,
} from './interiorRecords.ts';

export interface Range {
  readonly min: number;
  readonly max: number;
}

export type GroundKind = 'diner' | 'shop' | 'stoop';
export type WindowKind = 'single' | 'pair';
export type CorniceKind = 'band' | 'bracketed' | 'parapet';
export type OpenKind = 'verge' | 'car-park';
export type Use = 'home' | 'restaurant' | 'shop';

export interface Paint {
  readonly text: string;
  readonly colour: string;
  readonly ink: string;
}

export interface Awning {
  readonly colour: string;
  readonly stripe: string;
}

export interface StreetRecord {
  readonly lotDepth: number;
  readonly sidewalk: number;
  readonly curb: number;
  readonly roadway: number;
  readonly open: { readonly sidewalk: number; readonly depth: number; readonly kinds: readonly OpenKind[] };
  readonly alley: number;
  readonly yards: number;
  readonly run: number;
  readonly lampEvery: number;
  readonly trees: number;
}

export interface FacadeRecord {
  readonly ground: GroundKind;
  readonly bays: Range;
  readonly windows: readonly WindowKind[];
  readonly cornices: readonly CorniceKind[];
  readonly sills: boolean;
  readonly sides: 'party' | 'windows';
  readonly sign?: Paint;
  readonly awnings?: readonly Awning[];
  readonly wear: Range;
}

export interface BuildingRecord {
  readonly name: string;
  readonly use: Use;
  readonly width: Range;
  readonly depth: number;
  readonly storeys: Range;
  readonly storeyHeight: number;
  readonly walls: readonly string[];
  readonly trim: string;
  readonly door: Range;
  readonly facade: string;
  readonly poleSign?: Paint;
  readonly interior?: string;
}

export interface BackRowRecord {
  readonly width: Range;
  readonly gap: Range;
  readonly depth: number;
  readonly storeys: Range;
  readonly storeyHeight: number;
  readonly walls: readonly string[];
  readonly trim: string;
}

export interface BlockRecord {
  readonly name: string;
  readonly street: string;
  readonly lots: Range;
  readonly needs: readonly string[];
  readonly ends?: readonly string[];
  readonly fill: Readonly<Record<string, number>>;
  readonly vacant?: { readonly weight: number; readonly width: Range };
  readonly gap: Range;
  readonly backRow: BackRowRecord;
}

/** A block's record with everything it names, read and checked. */
export interface BlockTemplates extends InteriorTemplates {
  readonly id: string;
  readonly block: BlockRecord;
  readonly street: StreetRecord;
  readonly buildings: ReadonlyMap<string, BuildingRecord>;
  readonly facades: ReadonlyMap<string, FacadeRecord>;
}

function checkRange(range: Range, where: string): void {
  if (range.min > range.max) throw new Error(`content: ${where}: min ${range.min} is above max ${range.max}`);
}

function checkBuilding(id: string, b: BuildingRecord, facade: FacadeRecord): void {
  for (const [name, range] of [
    ['width', b.width],
    ['storeys', b.storeys],
    ['door', b.door],
  ] as const) {
    checkRange(range, `building/${id} ${name}`);
  }
  checkRange(facade.bays, `facade/${b.facade} bays`);
  checkRange(facade.wear, `facade/${b.facade} wear`);
}

/** Reads block `id` and the street, buildings and facades it names. Throws on a range that runs backwards. */
export function blockTemplates(store: RecordStore, id: string): BlockTemplates {
  const block = store.getOrThrow<BlockRecord>('block', id);
  checkRange(block.lots, `block/${id} lots`);
  checkRange(block.gap, `block/${id} gap`);
  for (const [name, range] of Object.entries(block.backRow).filter(([, v]) => typeof v === 'object' && 'min' in v)) {
    checkRange(range as Range, `block/${id} backRow ${name}`);
  }
  if (block.vacant) checkRange(block.vacant.width, `block/${id} vacant width`);
  if (block.needs.length > block.lots.min) {
    throw new Error(
      `content: block/${id} needs ${block.needs.length} buildings but may have only ${block.lots.min} lots`,
    );
  }
  const buildings = new Map<string, BuildingRecord>();
  const facades = new Map<string, FacadeRecord>();
  const inside = {
    interiors: new Map<string, InteriorRecord>(),
    rooms: new Map<string, RoomRecord>(),
    fixtures: new Map<string, FixtureRecord>(),
  };
  for (const name of [...block.needs, ...Object.keys(block.fill)]) {
    const b = store.getOrThrow<BuildingRecord>('building', name);
    const facade = store.getOrThrow<FacadeRecord>('facade', b.facade);
    checkBuilding(name, b, facade);
    buildings.set(name, b);
    facades.set(b.facade, facade);
    if (b.interior) readInterior(store, b.interior, inside);
  }
  return { id, block, street: store.getOrThrow<StreetRecord>('street', block.street), buildings, facades, ...inside };
}
