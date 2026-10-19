/**
 * The stage: draws a scene for a camera, a light and the people in it, each frame. The sim
 * decides who is where and what they do; the stage only draws it (CLAUDE.md, "The sim decides;
 * the stage renders").
 *
 * A frame: the ground, then cut rooms' floors; then every standing thing in the painter's
 * order, the still ones sorted once per cutaway and the people slotted in; then dusk and
 * night; then bubbles, above everything.
 */

import { bubbleSize, drawBubble } from './bubble.ts';
import { buildingPieces, WALL } from './building.ts';
import { fixturePiece } from './furniture.ts';
import { box, type Pt } from './geom.ts';
import { drawFloor, drawGround, drawPatch } from './ground.ts';
import { project, type View } from './iso.ts';
import { drawDusk, drawNight, type Layer, type Size } from './night.ts';
import { GROUND, INSIDE } from './palette.ts';
import { drawPerson, hull, squareScale } from './person/draw.ts';
import { speaking, TURN } from './person/poses.ts';
import { rig } from './person/rig.ts';
import { propPiece } from './props.ts';
import { insertPiece, type Ordered, orderPieces, type Piece } from './sort.ts';
import type { Actor, Building, Frame, Scene } from './types.ts';

export interface Moment {
  /** Which buildings are cut away; only those with interiors can be. */
  readonly cut: ReadonlySet<string>;
  readonly bubbles: boolean;
  /** 0 by day, 1 at night; and dusk's warmth (light.ts, `daylight`). */
  readonly dark: number;
  readonly warm: number;
  /** Stage seconds, for animation. */
  readonly time: number;
}

export interface Rendered {
  /** Each standing or walking person's height on the screen, in CSS pixels. */
  readonly heights: ReadonlyMap<string, number>;
  readonly pieces: number;
}

/** The ink's width for a zoom: one weight across the figure, a little heavier up close. */
export const inkFor = (view: View): number => Math.min(1.6, Math.max(0.7, 0.03 * squareScale(view)));

const PERSON_HALF = 0.18;

export class Stage {
  readonly scene: Scene;
  readonly #layer: Layer;
  #cutKey: string | null = null;
  #statics: Ordered = { pieces: [], rects: [] };

  constructor(scene: Scene, layer: Layer) {
    this.scene = scene;
    this.#layer = layer;
  }

  #still(cut: ReadonlySet<string>): Ordered {
    const key = [...cut].sort().join('|');
    if (key !== this.#cutKey) {
      const pieces: Piece[] = [];
      for (const b of this.scene.buildings) {
        const isCut = cut.has(b.id) && b.interior !== undefined;
        pieces.push(...buildingPieces(b, isCut));
        if (isCut) for (const f of b.interior?.fixtures ?? []) if (f.kind !== 'rug') pieces.push(fixturePiece(f));
      }
      for (const p of this.scene.props) pieces.push(propPiece(p));
      this.#statics = orderPieces(pieces);
      this.#cutKey = key;
    }
    return { pieces: [...this.#statics.pieces], rects: [...this.#statics.rects] };
  }

  render(ctx: CanvasRenderingContext2D, view: View, size: Size, look: Moment, actors: readonly Actor[]): Rendered {
    // A sleeper is drawn by their bed, and only when the bed's room is cut open; nobody
    // inside a whole building is drawn at all.
    const sleepers = new Map<string, Actor>();
    for (const a of actors) if (a.bed) sleepers.set(a.bed, a);
    const open = (b: Building) => look.cut.has(b.id) && b.interior !== undefined;
    const hidden = (a: Actor) =>
      this.scene.buildings.some((b) => !open(b) && a.x > b.x0 && a.x < b.x1 && a.y > b.y0 && a.y < b.y1);
    const ink = inkFor(view);
    const frame: Frame = {
      dark: look.dark,
      warm: look.warm,
      time: look.time,
      lights: [],
      sleepers,
      heads: new Map(),
      ink,
    };
    ctx.fillStyle = GROUND.lot;
    ctx.fillRect(0, 0, size.width, size.height);
    drawGround(ctx, view, this.scene.ground);
    const cutBuildings = this.scene.buildings.filter(open);
    for (const b of cutBuildings) this.#floor(ctx, view, b, frame);
    const ordered = this.#still(look.cut);
    const heights = new Map<string, number>();
    for (const a of actors) {
      if (a.bed || hidden(a)) continue;
      insertPiece(ordered, this.#actorPiece(a, heights));
    }
    for (const p of ordered.pieces) p.draw(ctx, view, frame);
    drawDusk(ctx, size, frame);
    drawNight(ctx, this.#layer, size, frame);
    if (look.bubbles) this.#bubbles(ctx, view, frame, actors);
    return { heights, pieces: ordered.pieces.length };
  }

  #floor(ctx: CanvasRenderingContext2D, view: View, b: Building, frame: Frame): void {
    const interior = b.interior;
    if (!interior) return;
    const area = { x0: b.x0 + WALL, y0: b.y0 + WALL, x1: b.x1 - WALL, y1: b.y1 - WALL };
    drawFloor(ctx, view, area, interior.floor);
    for (const f of interior.fixtures) {
      if (f.kind !== 'rug') continue;
      drawPatch(
        ctx,
        view,
        { x0: f.x - f.w / 2, y0: f.y - f.d / 2, x1: f.x + f.w / 2, y1: f.y + f.d / 2, color: INSIDE.rug },
        0.03,
      );
      drawPatch(
        ctx,
        view,
        {
          x0: f.x - f.w / 2 + 0.15,
          y0: f.y - f.d / 2 + 0.15,
          x1: f.x + f.w / 2 - 0.15,
          y1: f.y + f.d / 2 - 0.15,
          color: '#A9705F',
        },
        0.035,
      );
    }
    if (frame.dark > 0.05) {
      // The room's lights are on: the night lets it through.
      const room = box(b.x0, b.y0, 0, b.x1, b.y1, b.storeyHeight);
      const corners: Pt[] = [];
      for (const x of [room.x0, room.x1])
        for (const y of [room.y0, room.y1])
          for (const z of [room.z0, room.z1]) corners.push(project(view, { x, y, z }));
      frame.lights.push({ kind: 'shape', points: hull(corners), strength: 0.82 });
    }
  }

  #actorPiece(a: Actor, heights: Map<string, number>): Piece {
    return {
      box: box(a.x - PERSON_HALF, a.y - PERSON_HALF, a.z, a.x + PERSON_HALF, a.y + PERSON_HALF, a.z + a.look.height),
      bias: 0.05,
      draw(ctx, view, frame) {
        const sk = rig(a.look, a.pose, { x: a.x, y: a.y, z: a.z, yaw: a.yaw });
        const drawn = drawPerson(ctx, view, sk, a.look, frame.ink);
        frame.heads.set(a.id, drawn.headTop);
        if (a.pose.kind !== 'sit' && a.pose.kind !== 'eat') heights.set(a.id, drawn.height);
      },
    };
  }

  #bubbles(ctx: CanvasRenderingContext2D, view: View, frame: Frame, actors: readonly Actor[]): void {
    const size = bubbleSize(squareScale(view));
    for (const a of actors) {
      const head = frame.heads.get(a.id);
      if (!head || !a.bubble) continue;
      if (a.bubble === 'argue' && !speaking(a.pose)) continue;
      const since = a.bubble === 'argue' ? (a.pose.t + (a.pose.kind === 'answer' ? TURN : 0)) % TURN : a.pose.t;
      drawBubble(ctx, a.bubble, head, size, since, frame.ink);
    }
  }
}
