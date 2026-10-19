/**
 * The spike's templates (D27): one street, three kinds of building, two interiors and six
 * roles, as data. The block's generator (block.ts) lays them out from the seed; nothing is
 * placed by hand (CLAUDE.md). Sizes are metres and (tune). These become content files with
 * schemas when `packages/content` arrives; M1.1's generator replaces the layout.
 */
import { BUILDING, type BuildingKind, type Facing, type FixtureKind, INSIDE } from '@lyl/stage';

/** The street's cross-section, north to south, in metres. */
export const STREET = {
  /** Lots run from y = 0 to this; buildings stand at the front of them. */
  lotDepth: 12,
  sidewalk: 3.5,
  curb: 0.18,
  roadway: 8.4,
  /** The far sidewalk and the strip of grass beyond it. */
  farSidewalk: 3.2,
  verge: 6,
  /** The alley behind the lots and the yards beyond it. */
  alley: 4,
  yards: 6,
  /** Street ends past the lots, so a pan never runs out of street. */
  run: 9,
  /** Gaps between buildings: a gangway, from the seed. */
  gap: [1, 2.5] as const,
  /** Lamps along the near curb, every so many metres. */
  lampEvery: 14,
} as const;

export interface BuildingTemplate {
  readonly width: readonly [number, number];
  readonly depth: number;
  readonly storeys: number;
  readonly storeyHeight: number;
  readonly walls: readonly string[];
  readonly trim: string;
  readonly bays: number;
  readonly ground: 'diner' | 'shop' | 'stoop';
  /** Where the front door is, as a share of the width from the west wall. */
  readonly door: readonly [number, number];
}

export const BUILDINGS: Readonly<Record<BuildingKind, BuildingTemplate>> = {
  diner: {
    width: [10, 12],
    depth: 8.5,
    storeys: 1,
    storeyHeight: 4.2,
    walls: [BUILDING.stucco, BUILDING.dinerTeal],
    trim: BUILDING.chrome,
    bays: 0,
    ground: 'diner',
    door: [0.66, 0.78],
  },
  apartment: {
    width: [8, 9],
    depth: 9,
    storeys: 3,
    storeyHeight: 3,
    walls: [BUILDING.brick, BUILDING.siding],
    trim: BUILDING.cornice,
    bays: 3,
    ground: 'stoop',
    door: [0.5, 0.5],
  },
  storefront: {
    width: [8, 10],
    depth: 9,
    storeys: 2,
    storeyHeight: 3.5,
    walls: [BUILDING.brick, BUILDING.stucco],
    trim: '#6F7F5A',
    bays: 3,
    ground: 'shop',
    door: [0.72, 0.8],
  },
};

/** The row behind the alley: the next street's buildings, seen from the back. */
export const BACK_ROW = {
  width: [7, 13] as const,
  gap: [0.4, 2] as const,
  depth: 9,
  storeys: [2, 4] as const,
  storeyHeight: 3.2,
  walls: [BUILDING.brick, BUILDING.stucco, BUILDING.siding, '#B9A48A', '#8C7B6B'],
} as const;

/** A fixture's place in a room, by rule: along a wall, or in a line some way out from the back. */
export interface FixtureRule {
  readonly kind: FixtureKind;
  readonly facing: Facing;
  /** Its size across the way it faces, and its depth. A span instead stretches it between two shares of the room's width. */
  readonly width?: number;
  readonly span?: readonly [number, number];
  readonly depth: number;
  /** Metres out from the back wall to its middle; negative counts from the front wall. */
  readonly line: number;
  /** Share of the room's width from its west wall to its middle, when it has no span. */
  readonly at?: number;
  /** Repeat along the line, every so many metres, within the span. */
  readonly every?: number;
  /** Named, so a role can find it (the cook's griddle, the sleeper's bed). */
  readonly id?: string;
}

export interface InteriorTemplate {
  readonly floor: 'checker' | 'wood';
  readonly wall: string;
  readonly rules: readonly FixtureRule[];
}

export const INTERIORS: Readonly<Partial<Record<BuildingKind, InteriorTemplate>>> = {
  diner: {
    floor: 'checker',
    wall: INSIDE.dinerWall,
    rules: [
      { kind: 'fridge', facing: 's', width: 0.9, depth: 0.7, line: 0.4, at: 0.06 },
      { kind: 'prep', facing: 's', span: [0.14, 0.94], depth: 0.65, line: 0.37 },
      // The griddle stands out from the back wall; the cook works it from behind, facing the room.
      { kind: 'stove', facing: 'n', span: [0.3, 0.62], depth: 0.8, line: 1.95, id: 'griddle' },
      { kind: 'counter', facing: 's', span: [0.06, 0.74], depth: 0.6, line: 3.55 },
      { kind: 'stool', facing: 's', width: 0.4, span: [0.1, 0.72], depth: 0.4, line: 4.25, every: 0.85 },
      // Tables by the front windows, a chair either side of each.
      { kind: 'table', facing: 's', width: 0.95, span: [0.04, 0.6], depth: 0.75, line: -1.4, every: 2.6 },
      { kind: 'chair', facing: 's', width: 0.45, span: [0.04, 0.6], depth: 0.45, line: -2.12, every: 2.6 },
      { kind: 'chair', facing: 'n', width: 0.45, span: [0.04, 0.6], depth: 0.45, line: -0.68, every: 2.6 },
    ],
  },
  apartment: {
    floor: 'wood',
    wall: INSIDE.flatWall,
    rules: [
      { kind: 'bed', facing: 's', width: 1.5, depth: 2.05, line: 1.05, at: 0.16, id: 'bed' },
      { kind: 'nightstand', facing: 's', width: 0.45, depth: 0.42, line: 0.24, at: 0.33 },
      { kind: 'kitchenette', facing: 's', span: [0.56, 0.97], depth: 0.6, line: 0.33 },
      { kind: 'rug', facing: 's', width: 2.4, depth: 1.8, line: -2.15, at: 0.3 },
      { kind: 'couch', facing: 'n', width: 2.0, depth: 0.85, line: -0.75, at: 0.3 },
      { kind: 'tv', facing: 's', width: 1.1, depth: 0.45, line: 3.45, at: 0.3 },
      { kind: 'table', facing: 's', width: 0.8, depth: 0.8, line: 2.6, at: 0.8 },
    ],
  },
};

/** The six people (D27, D28): what each is doing and where, by the place they do it. */
export type Role = 'cook' | 'sleeper' | 'arguer' | 'answerer' | 'walker' | 'sitter';

export const ROLES: readonly Role[] = ['cook', 'sleeper', 'arguer', 'answerer', 'walker', 'sitter'];
