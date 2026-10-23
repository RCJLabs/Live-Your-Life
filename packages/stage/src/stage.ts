/**
 * The stage: draws a scene for a camera, a light and the people in it, each frame. The sim
 * decides who is where and what they do; the stage only draws it (CLAUDE.md, "The sim decides;
 * the stage renders").
 *
 * Almost nothing moves: six people and a griddle's flames. So the still picture (the ground,
 * every building, prop and fixture in the painter's order) is painted once into a layer and
 * kept until the camera, the cutaway or the lights change; each frame copies it, draws what
 * moves, and redraws, clipped to each mover, the still pieces in front of it. The night is
 * kept the same way. Measured in docs/research/art-spike.md; `cache: false` is the plain
 * painter's order, every piece every frame, which the kept picture must match.
 */
import { drawBubbles } from './bubble.ts';
import { buildingPieces, heightOf } from './building.ts';
import { fixturePiece } from './furniture.ts';
import { type Box3, box, overlaps, type Pt } from './geom.ts';
import { drawGround } from './ground.ts';
import { nearness, project, screenRect, type View } from './iso.ts';
import { LIGHTS_ON } from './light.ts';
import { compositeNight, drawDusk, type Layer, paintNight, readyLayer, type Size } from './night.ts';
import { GROUND } from './palette.ts';
import { drawPerson, hull, squareScale } from './person/draw.ts';
import { rig } from './person/rig.ts';
import { propPiece } from './props.ts';
import { drawRoomFloor } from './rooms.ts';
import { before, behind, insertPiece, type Ordered, orderPieces, type Piece, slotOf, unitRect } from './sort.ts';
import type { Actor, Building, Frame, Light, Scene } from './types.ts';

export interface Moment {
  /** Which buildings are cut away: to their ground floor with an interior, else to their sills (D64). */
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
  /** Pieces drawn this frame: the still picture's, when it was repainted, and the movers'. */
  readonly pieces: number;
}

/** The ink's width for a zoom: one weight across the figure, a little heavier up close. */
export const inkFor = (view: View): number => Math.min(1.6, Math.max(0.7, 0.03 * squareScale(view)));

const PERSON_HALF = 0.18;
/** How far a mover's limbs and shadow reach past the box it sorts by, in metres. */
const REACH = 0.5;

const grow = (b: Box3, by: number): Box3 =>
  box(b.x0 - by, b.y0 - by, Math.max(0, b.z0 - by), b.x1 + by, b.y1 + by, b.z1 + by);
const middle = (b: Box3) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: (b.z0 + b.z1) / 2 });

/**
 * The still pieces to draw again over a mover: those its reach overlaps on screen that the
 * painter's order puts in front of it. The reach (limbs, a shadow) is the mover's box grown by
 * `REACH`; it chooses where to look, while in front or behind is decided on the mover's own
 * box, as the full order decides it, so the kept picture matches it.
 */
export function occludersOf(order: Ordered, mover: Piece): Piece[] {
  const reachRect = unitRect(grow(mover.box, REACH));
  return order.pieces.filter(
    (still, i) => overlaps(reachRect, order.rects[i] as typeof reachRect) && before(mover, still),
  );
}

const UNIT_VIEW: View = { u: 1, ox: 0, oy: 0, width: 0, height: 0 };

const cornersOf = (b: Box3): Pt[] => {
  const out: Pt[] = [];
  for (const x of [b.x0, b.x1])
    for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) out.push(project(UNIT_VIEW, { x, y, z }));
  return out;
};

/** Whether a point lies inside a convex outline, its corners in order either way round. */
function within(outline: readonly Pt[], p: Pt): boolean {
  let turn = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i] as Pt;
    const b = outline[(i + 1) % outline.length] as Pt;
    const side = Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    if (side === 0) continue;
    if (turn === 0) turn = side;
    else if (side !== turn) return false;
  }
  return true;
}

/**
 * The buildings that stand in front of a box on the screen, hiding some of whoever is in it: what a
 * cutaway opens when someone is behind a building (DESIGN.md, Interiors). A building hides them
 * when the depth sort puts it nearer and a corner of their box falls inside its outline.
 */
export function hiding(buildings: readonly Building[], who: Box3): string[] {
  const theirs = cornersOf(who);
  return buildings
    .filter((b) => {
      const whole = box(b.x0, b.y0, 0, b.x1, b.y1, heightOf(b));
      if (behind(who, whole) !== true) return false;
      const outline = hull(cornersOf(whole));
      return theirs.some((p) => within(outline, p));
    })
    .map((b) => b.id);
}

export class Stage {
  readonly scene: Scene;
  readonly #cache: boolean;
  readonly #still: Layer;
  readonly #night: Layer;
  readonly #glow: Layer;
  #cutKey: string | null = null;
  #order: Ordered = { pieces: [], rects: [] };
  #movingFixtures: Piece[] = [];
  #stillKey: string | null = null;
  #nightKey: string | null = null;
  #lights: Light[] = [];
  #stillHeads = new Map<string, Pt>();

  constructor(scene: Scene, makeLayer: () => Layer, options: { readonly cache?: boolean } = {}) {
    this.scene = scene;
    this.#cache = options.cache ?? true;
    this.#still = makeLayer();
    this.#night = makeLayer();
    this.#glow = makeLayer();
  }

  /** The still pieces in the painter's order, and the fixtures that move, for a cutaway. */
  #pieces(cut: ReadonlySet<string>): void {
    const key = [...cut].sort().join('|');
    if (key === this.#cutKey) return;
    const pieces: Piece[] = [];
    for (const b of this.scene.buildings) {
      const open = cut.has(b.id) && b.interior !== undefined;
      pieces.push(...buildingPieces(b, cut.has(b.id)));
      if (open) for (const f of b.interior?.fixtures ?? []) if (f.kind !== 'rug') pieces.push(fixturePiece(f));
    }
    for (const p of this.scene.props) pieces.push(propPiece(p));
    this.#order = orderPieces(pieces.filter((p) => !p.moving));
    this.#movingFixtures = pieces.filter((p) => p.moving);
    this.#cutKey = key;
    this.#stillKey = null;
  }

  /** Everything that keeps still, painted in order: the ground, cut rooms' floors, the pieces. */
  #paintStill(
    ctx: CanvasRenderingContext2D,
    view: View,
    size: Size,
    frame: Frame,
    open: (b: Building) => boolean,
  ): void {
    ctx.fillStyle = GROUND.lot;
    ctx.fillRect(0, 0, size.width, size.height);
    drawGround(ctx, view, this.scene.ground);
    for (const b of this.scene.buildings) if (open(b)) drawRoomFloor(ctx, view, b, frame);
    for (const p of this.#order.pieces) p.draw(ctx, view, frame);
  }

  /** Draws the movers over the still picture, each followed by the still pieces in front of it. */
  #drawMovers(ctx: CanvasRenderingContext2D, view: View, frame: Frame, movers: readonly Piece[]): void {
    const order = this.#order;
    const slotted = movers
      .map((piece) => ({ piece, slot: slotOf(order, piece) }))
      .sort((a, b) => a.slot - b.slot || nearness(middle(a.piece.box)) - nearness(middle(b.piece.box)));
    const scratch: Frame = { ...frame, lights: [], heads: new Map() };
    for (const { piece } of slotted) {
      piece.draw(ctx, view, frame);
      const front = occludersOf(order, piece);
      if (front.length === 0) continue;
      const clip = screenRect(view, grow(piece.box, REACH));
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x0, clip.y0, clip.x1 - clip.x0, clip.y1 - clip.y0);
      ctx.clip();
      for (const still of front) still.draw(ctx, view, scratch);
      ctx.restore();
    }
  }

  render(ctx: CanvasRenderingContext2D, view: View, size: Size, look: Moment, actors: readonly Actor[]): Rendered {
    const open = (b: Building) => look.cut.has(b.id) && b.interior !== undefined;
    // A sleeper is drawn by their bed, and only when the room is cut open; nobody inside a
    // whole building is drawn at all.
    const hidden = (a: Actor) =>
      this.scene.buildings.some((b) => !open(b) && a.x > b.x0 && a.x < b.x1 && a.y > b.y0 && a.y < b.y1);
    const sleepers = new Map<string, Actor>();
    for (const a of actors) if (a.bed) sleepers.set(a.bed, a);
    const frame: Frame = {
      dark: look.dark,
      warm: look.warm,
      time: look.time,
      lights: [],
      sleepers,
      heads: new Map(),
      ink: inkFor(view),
    };
    this.#pieces(look.cut);
    const heights = new Map<string, number>();
    const movers = [
      ...this.#movingFixtures,
      ...actors.filter((a) => !a.bed && !hidden(a)).map((a) => this.#actorPiece(a, heights)),
    ];
    let pieces = movers.length;
    const stillKey = [view.u, view.ox, view.oy, size.width, size.height, size.dpr, this.#cutKey, look.dark > LIGHTS_ON]
      .map((v) => (typeof v === 'number' ? v.toFixed(4) : String(v)))
      .join('|');
    if (this.#cache) {
      if (stillKey !== this.#stillKey) {
        const stillFrame: Frame = { ...frame, lights: [], heads: new Map() };
        readyLayer(this.#still, size);
        this.#paintStill(this.#still.ctx as CanvasRenderingContext2D, view, size, stillFrame, open);
        this.#lights = stillFrame.lights;
        this.#stillHeads = stillFrame.heads;
        this.#stillKey = stillKey;
        this.#nightKey = null;
        pieces += this.#order.pieces.length;
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.#still.canvas, 0, 0);
      ctx.restore();
      for (const [id, head] of this.#stillHeads) frame.heads.set(id, head);
      this.#drawMovers(ctx, view, frame, movers);
    } else {
      // The plain painter's order, every piece every frame: what the kept picture must match.
      const everything: Ordered = { pieces: [...this.#order.pieces], rects: [...this.#order.rects] };
      for (const mover of movers) insertPiece(everything, mover);
      ctx.fillStyle = GROUND.lot;
      ctx.fillRect(0, 0, size.width, size.height);
      drawGround(ctx, view, this.scene.ground);
      for (const b of this.scene.buildings) if (open(b)) drawRoomFloor(ctx, view, b, frame);
      for (const p of everything.pieces) p.draw(ctx, view, frame);
      this.#lights = frame.lights;
      this.#nightKey = null;
      pieces = everything.pieces.length;
    }
    drawDusk(ctx, size, frame);
    if (look.dark > 0.01) {
      const nightKey = `${stillKey}|${look.dark.toFixed(2)}`;
      if (nightKey !== this.#nightKey) {
        paintNight(this.#night, this.#glow, size, look.dark, this.#lights);
        this.#nightKey = nightKey;
      }
      compositeNight(ctx, this.#night, this.#glow);
    }
    if (look.bubbles) drawBubbles(ctx, view, frame, actors);
    return { heights, pieces };
  }

  #actorPiece(a: Actor, heights: Map<string, number>): Piece {
    return {
      box: box(a.x - PERSON_HALF, a.y - PERSON_HALF, a.z, a.x + PERSON_HALF, a.y + PERSON_HALF, a.z + a.look.height),
      bias: 0.05,
      moving: true,
      draw(ctx, view, frame) {
        const sk = rig(a.look, a.pose, { x: a.x, y: a.y, z: a.z, yaw: a.yaw });
        const drawn = drawPerson(ctx, view, sk, a.look, frame.ink);
        frame.heads.set(a.id, drawn.headTop);
        if (a.pose.kind !== 'sit' && a.pose.kind !== 'eat') heights.set(a.id, drawn.height);
      },
    };
  }
}
