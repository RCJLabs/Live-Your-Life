/**
 * What the stage is given to draw: plain data, laid out from the seed and templates by
 * whoever builds the block (M0.3's spike, then M1.1's generator). Nothing here is a closure,
 * so the templates that make it can become content files (CLAUDE.md, "Content is data").
 */

import type { Pt, Rect } from './geom.ts';
import type { Ground } from './ground.ts';
import type { Look } from './person/look.ts';
import type { Pose } from './person/poses.ts';

/** Which way a thing's front faces: north (−y), east (+x), south (+y), west (−x). */
export type Facing = 'n' | 'e' | 's' | 'w';

export const YAW: Readonly<Record<Facing, number>> = {
  e: 0,
  s: Math.PI / 2,
  w: Math.PI,
  n: -Math.PI / 2,
};

export type BuildingKind = 'diner' | 'apartment' | 'storefront';

export interface Sign {
  readonly text: string;
  readonly color: string;
  readonly ink: string;
}

export interface Awning {
  readonly color: string;
  readonly stripe: string;
}

export interface Facade {
  readonly wall: string;
  readonly trim: string;
  readonly roof: string;
  /** Window bays across the front of each storey above the ground floor. */
  readonly bays: number;
  /** How the ground floor meets the street; `back` is a rear wall, windows on every storey. */
  readonly ground: 'diner' | 'shop' | 'stoop' | 'back';
  readonly sign?: Sign;
  readonly awning?: Awning;
  /** A card in a shop window ("FOR LEASE"). */
  readonly card?: string;
  /** Which upper windows are lit at night: bits drawn from the seed. */
  readonly litBits: number;
}

export type FixtureKind =
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
  | 'kitchenette';

export interface Fixture {
  readonly id: string;
  readonly kind: FixtureKind;
  /** The middle of its footprint, in metres. */
  readonly x: number;
  readonly y: number;
  /** Its footprint along x and along y. */
  readonly w: number;
  readonly d: number;
  readonly facing: Facing;
}

export interface Interior {
  readonly floor: 'checker' | 'wood';
  readonly wall: string;
  readonly fixtures: readonly Fixture[];
  /** The front door's middle, metres east of the building's west wall; the cut leaves a gap there. */
  readonly door: number;
}

export interface Building {
  readonly id: string;
  readonly kind: BuildingKind;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly storeys: number;
  readonly storeyHeight: number;
  readonly facade: Facade;
  /** Only a building with an interior template can be cut away (D18). */
  readonly interior?: Interior;
}

export type PropKind = 'lamp' | 'tree' | 'bench' | 'pole-sign' | 'patio-table' | 'patio-chair' | 'hydrant';

export interface Prop {
  readonly id: string;
  readonly kind: PropKind;
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  /** A tree's size, a lamp's height: 1 is the usual. */
  readonly size?: number;
  readonly sign?: Sign;
}

export type BubbleKind = 'argue' | 'sleep';

/** A person where they are this frame. The stage moves nobody; it draws what it is told. */
export interface Actor {
  readonly id: string;
  readonly look: Look;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Radians: 0 faces east (+x), π/2 faces south (+y). */
  readonly yaw: number;
  readonly pose: Pose;
  readonly bubble: BubbleKind | null;
  /** Lying in this bed: the bed draws them, under its blanket. */
  readonly bed?: string;
}

export interface Scene {
  readonly ground: Ground;
  readonly buildings: readonly Building[];
  readonly props: readonly Prop[];
  /** The ground the camera may look at. */
  readonly bounds: Rect;
}

/** Light the night pass lets through: a window, a lamp's pool, a lit room. */
export type Light =
  | { readonly kind: 'shape'; readonly points: readonly Pt[]; readonly strength: number }
  | {
      readonly kind: 'pool';
      readonly at: Pt;
      readonly radius: number;
      readonly strength: number;
      /** Lying on the ground: an ellipse half as tall as wide, as the view flattens a circle. */
      readonly flat?: boolean;
      /** Also a warm glow added over the dark, at a lamp's head or a lit sign. */
      readonly glow?: boolean;
    };

/** What changes from frame to frame, beside the camera. */
export interface Frame {
  /** 0 by day, 1 at full night (light.ts, `daylight`). */
  readonly dark: number;
  readonly warm: number;
  /** Seconds of stage time: what animation reads. It stops while the game is paused. */
  readonly time: number;
  /** Filled while drawing: what the night pass lets through. */
  readonly lights: Light[];
  /** People lying in beds, by bed id: the bed draws them. */
  readonly sleepers: ReadonlyMap<string, Actor>;
  /** Filled while drawing: the top of each person's head on the screen, where bubbles go. */
  readonly heads: Map<string, Pt>;
  /** The ink's width in screen pixels at this zoom. */
  readonly ink: number;
}
