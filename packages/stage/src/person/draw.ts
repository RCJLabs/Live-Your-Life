/**
 * A person drawn through the isometric view: the rig's joints projected, each body mass inked
 * as one silhouette (Dirtbag's `inked`), the far limbs a shade darker as Dirtbag's are. Groups
 * draw from far to near, so a cook's arms reaching over a griddle come in front of the chest
 * and a walker's far arm stays behind it.
 */
import { lit } from '../color.ts';
import { add, type Pt, scale, type Vec3 } from '../geom.ts';
import { nearness, project, type View } from '../iso.ts';
import { INK } from '../palette.ts';
import { capsule, disc, fillShape, type Inked, inked, oval, poly } from '../shape.ts';
import { drawHead } from './head.ts';
import { BODY, type Look } from './look.ts';
import type { Skeleton } from './rig.ts';

const FAR = 0.84;

/** Screen pixels for a metre seen square to the view: a sphere of radius r draws as a circle of r times this. */
export const squareScale = (view: View): number => Math.SQRT2 * view.u;

/** The convex hull of screen points (monotone chain): a box's silhouette from any side. */
export function hull(points: readonly Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2] as Pt, lower[lower.length - 1] as Pt, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2] as Pt, upper[upper.length - 1] as Pt, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

interface Group {
  readonly key: number;
  readonly pieces: Inked[];
}

/** A tapered block from the waist to the shoulders, as its silhouette on the screen. */
function torsoShape(view: View, sk: Skeleton, look: Look): Pt[] {
  const depth = (BODY.torsoDepth / 2) * sk.k;
  const waist = BODY.waistHalf * look.build * sk.k;
  const shoulders = (BODY.shoulderHalf + 0.005) * look.build * sk.k;
  const corners: Vec3[] = [];
  for (const [base, half] of [
    [add(sk.pelvis, scale(sk.up, 0.02 * sk.k)), waist],
    [add(sk.chest, scale(sk.up, 0.04 * sk.k)), shoulders],
  ] as const) {
    for (const f of [-depth, depth]) {
      for (const r of [-half, half]) corners.push(add(base, add(scale(sk.forward, f), scale(sk.right, r))));
    }
  }
  return hull(corners.map((p) => project(view, p)));
}

export interface Drawn {
  /** The top of the head on the screen, where a bubble attaches. */
  readonly headTop: Pt;
  /** The figure's height on the screen, in CSS pixels. */
  readonly height: number;
}

export function drawPerson(
  ctx: CanvasRenderingContext2D,
  view: View,
  sk: Skeleton,
  look: Look,
  ink: number,
  shadow = true,
): Drawn {
  const s = squareScale(view);
  const P = (p: Vec3) => project(view, p);
  const R = (r: number) => r * sk.k * s;
  if (shadow) {
    const ground = P({ x: sk.pelvis.x, y: sk.pelvis.y, z: 0 });
    fillShape(ctx, oval(ground, R(0.3), R(0.15)), 'rgba(20,18,30,0.22)');
  }
  const farLeft = nearness(sk.hipL) < nearness(sk.hipR);
  const farArmLeft = nearness(sk.shoulderL) < nearness(sk.shoulderR);
  const tone = (hex: string, far: boolean) => (far ? lit(hex, FAR) : hex);
  const sleeve = (far: boolean) => tone(look.sleeve === 'long' ? look.top : look.skin, far);
  const leg = (hip: Vec3, knee: Vec3, ankle: Vec3, toe: Vec3, far: boolean): Group => ({
    key: nearness(knee),
    pieces: [
      { shape: capsule(P(hip), R(BODY.thighR), P(knee), R(BODY.shinR * 1.05)), fill: tone(look.bottom, far) },
      { shape: capsule(P(knee), R(BODY.shinR), P(ankle), R(BODY.shinR * 0.9)), fill: tone(look.bottom, far) },
      { shape: capsule(P(ankle), R(BODY.shoeR), P(toe), R(BODY.shoeR * 0.85)), fill: tone(look.shoe, far) },
    ],
  });
  const arm = (shoulder: Vec3, elbow: Vec3, wrist: Vec3, far: boolean): Group => ({
    key: Math.max(nearness(elbow), nearness(wrist)),
    pieces: [
      { shape: capsule(P(shoulder), R(BODY.upperArmR), P(elbow), R(BODY.forearmR * 1.05)), fill: tone(look.top, far) },
      { shape: capsule(P(elbow), R(BODY.forearmR), P(wrist), R(BODY.forearmR * 0.85)), fill: sleeve(far) },
      { shape: disc(P(wrist), R(BODY.handR)), fill: tone(look.skin, far) },
    ],
  });
  const torso: Group = {
    key: nearness(sk.chest),
    pieces: [
      { shape: capsule(P(sk.hipL), R(BODY.thighR * 1.1), P(sk.hipR), R(BODY.thighR * 1.1)), fill: look.bottom },
      { shape: poly(torsoShape(view, sk, look)), fill: look.top },
      { shape: capsule(P(sk.chest), R(0.05), P(sk.head), R(0.05)), fill: look.skin },
    ],
  };
  const groups: Group[] = [
    farLeft ? leg(sk.hipL, sk.kneeL, sk.ankleL, sk.toeL, true) : leg(sk.hipR, sk.kneeR, sk.ankleR, sk.toeR, true),
    farLeft ? leg(sk.hipR, sk.kneeR, sk.ankleR, sk.toeR, false) : leg(sk.hipL, sk.kneeL, sk.ankleL, sk.toeL, false),
    farArmLeft ? arm(sk.shoulderL, sk.elbowL, sk.wristL, true) : arm(sk.shoulderR, sk.elbowR, sk.wristR, true),
    farArmLeft ? arm(sk.shoulderR, sk.elbowR, sk.wristR, false) : arm(sk.shoulderL, sk.elbowL, sk.wristL, false),
    torso,
  ];
  groups.sort((a, b) => a.key - b.key);
  // The apron hangs over the thighs, so it follows whichever of the torso and the legs is last.
  const body = groups.slice(0, 2).concat(torso);
  const apronAfter = Math.max(...body.map((g) => groups.indexOf(g)));
  groups.forEach((g, i) => {
    inked(ctx, g.pieces, INK, ink);
    if (i === apronAfter && look.apron) drawApron(ctx, view, sk, look, ink);
  });
  drawHead(ctx, view, sk, look, ink, s);
  const top = P(add(sk.head, scale(sk.up, BODY.head * sk.k)));
  const feet = P({ x: sk.pelvis.x, y: sk.pelvis.y, z: 0 });
  return { headTop: top, height: Math.abs(feet.y - top.y) };
}

/** An apron on the front of the body, seen when the front is. */
function drawApron(ctx: CanvasRenderingContext2D, view: View, sk: Skeleton, look: Look, ink: number): void {
  const front = (BODY.torsoDepth / 2 + 0.01) * sk.k;
  const showing = nearness(add(sk.chest, scale(sk.forward, 1))) > nearness(sk.chest);
  if (!showing || !look.apron) return;
  const half = BODY.waistHalf * 0.85 * look.build * sk.k;
  const at = (base: Vec3, r: number, down: number) =>
    project(view, add(base, add(scale(sk.forward, front), add(scale(sk.right, r), scale(sk.up, down)))));
  const shape = poly([
    at(sk.chest, -half * 0.7, -0.06 * sk.k),
    at(sk.chest, half * 0.7, -0.06 * sk.k),
    at(sk.pelvis, half, -0.32 * sk.k),
    at(sk.pelvis, -half, -0.32 * sk.k),
  ]);
  inked(ctx, [{ shape, fill: look.apron }], INK, ink * 0.8);
}
