/**
 * The rig: a skeleton in 3D, solved from a pose's targets with two-bone IK, then turned and
 * placed in the world. Dirtbag's rig is two-bone IK in a side view (`people.ts`, `ik2`); this
 * one adds a pole vector, so knees and elbows bend the right way from any facing
 * (climbing-world-traveler's `core.js` and Space-Wrecked's `bones.js` solve it the same way).
 */
import { add, clamp, cross, dot, length, normalize, rotateZ, scale, sub, type Vec3 } from '../geom.ts';
import { BODY, type Look, STANDARD_HEIGHT } from './look.ts';
import { type Pose, targetsFor } from './poses.ts';

export interface Skeleton {
  readonly pelvis: Vec3;
  readonly hipL: Vec3;
  readonly hipR: Vec3;
  readonly kneeL: Vec3;
  readonly kneeR: Vec3;
  readonly ankleL: Vec3;
  readonly ankleR: Vec3;
  readonly toeL: Vec3;
  readonly toeR: Vec3;
  readonly chest: Vec3;
  readonly shoulderL: Vec3;
  readonly shoulderR: Vec3;
  readonly elbowL: Vec3;
  readonly elbowR: Vec3;
  readonly wristL: Vec3;
  readonly wristR: Vec3;
  readonly neck: Vec3;
  readonly head: Vec3;
  /** The body's axes in the world: forward, to its right, and along its spine. */
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  /** Where the face points. */
  readonly face: Vec3;
  /** Height against the standard figure: lengths and radii scale by it. */
  readonly k: number;
}

/**
 * Two-bone IK: where the middle joint (a knee, an elbow) sits for a limb from `root` reaching
 * `target`, with bones `a` and `b`, bending toward `pole`. Out of reach, the limb straightens
 * toward the target.
 */
export function solveTwoBone(root: Vec3, target: Vec3, a: number, b: number, pole: Vec3): { mid: Vec3; end: Vec3 } {
  const toTarget = sub(target, root);
  const reach = length(toTarget);
  const axis = reach > 1e-9 ? scale(toTarget, 1 / reach) : { x: 0, y: 0, z: -1 };
  const d = clamp(reach, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const along = (a * a - b * b + d * d) / (2 * d);
  const out = Math.sqrt(Math.max(0, a * a - along * along));
  // The bend's direction: the pole with its part along the limb taken out.
  let bend = sub(pole, scale(axis, dot(pole, axis)));
  if (length(bend) < 1e-6) bend = cross(axis, Math.abs(axis.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 });
  bend = normalize(bend);
  const mid = add(root, add(scale(axis, along), scale(bend, out)));
  const end = add(root, scale(axis, d));
  return { mid, end };
}

/** The skeleton in the body's own frame: x forward, y to the right, z up. */
function local(look: Look, pose: Pose) {
  const k = look.height / STANDARD_HEIGHT;
  const t = targetsFor(pose);
  const at = (p: Vec3) => scale(p, k);
  const pelvis = at(t.pelvis);
  const spineDir = { x: Math.sin(t.lean), y: 0, z: Math.cos(t.lean) };
  const chest = add(pelvis, scale(spineDir, BODY.spine * k));
  const hipW = BODY.hipHalf * look.build * k;
  const shoulderW = BODY.shoulderHalf * look.build * k;
  const hipL = add(pelvis, { x: 0, y: -hipW, z: 0 });
  const hipR = add(pelvis, { x: 0, y: hipW, z: 0 });
  const shoulderL = add(chest, { x: 0, y: -shoulderW, z: -0.02 * k });
  const shoulderR = add(chest, { x: 0, y: shoulderW, z: -0.02 * k });
  const neck = add(chest, scale(spineDir, BODY.neck * k));
  const head = add(neck, scale(spineDir, BODY.head * k * 0.95));
  // Knees bend forward; sitting, forward and up. Elbows bend back, out and down.
  const kneePole = { x: 1, y: 0, z: pose.kind === 'sit' || pose.kind === 'eat' ? 0.6 : 0.1 };
  const leg = (hip: Vec3, foot: Vec3) => solveTwoBone(hip, at(foot), BODY.thigh * k, BODY.shin * k, kneePole);
  const arm = (shoulder: Vec3, hand: Vec3, side: number) =>
    solveTwoBone(shoulder, at(hand), BODY.upperArm * k, BODY.forearm * k, { x: -0.7, y: side * 0.55, z: -0.6 });
  const legL = leg(hipL, t.footL);
  const legR = leg(hipR, t.footR);
  const armL = arm(shoulderL, t.handL, -1);
  const armR = arm(shoulderR, t.handR, 1);
  const toe = (ankle: Vec3) => add(ankle, { x: BODY.foot * k, y: 0, z: -0.04 * k });
  const face = { x: Math.cos(t.nod + t.lean), y: 0, z: -Math.sin(t.nod + t.lean) };
  return {
    pelvis,
    hipL,
    hipR,
    kneeL: legL.mid,
    kneeR: legR.mid,
    ankleL: legL.end,
    ankleR: legR.end,
    toeL: toe(legL.end),
    toeR: toe(legR.end),
    chest,
    shoulderL,
    shoulderR,
    elbowL: armL.mid,
    elbowR: armR.mid,
    wristL: armL.end,
    wristR: armR.end,
    neck,
    head,
    up: spineDir,
    face,
    k,
  };
}

/**
 * Lying on the back: the standing body turned so its spine runs along x (head first) and its
 * front faces up. A proper rotation, half a turn about (1, 0, 1), so left and right stay true.
 */
const LIE_BACK = 0.6;
const flatten = (p: Vec3, k: number): Vec3 => ({ x: p.z - 0.92 * k, y: -p.y, z: p.x + LIE_BACK });

export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}

/** The skeleton in the world, for a look, a pose and where the person is. */
export function rig(look: Look, pose: Pose, at: Placement): Skeleton {
  const body = local(look, pose);
  const lying = pose.kind === 'lie';
  const place = (p: Vec3): Vec3 => {
    const q = lying ? flatten(p, body.k) : p;
    return add(rotateZ(q, at.yaw), { x: at.x, y: at.y, z: at.z });
  };
  const turn = (v: Vec3): Vec3 => rotateZ(lying ? { x: v.z, y: -v.y, z: v.x } : v, at.yaw);
  const joints = Object.fromEntries(
    (Object.entries(body) as [string, Vec3 | number][])
      .filter(([name]) => name !== 'up' && name !== 'face' && name !== 'k')
      .map(([name, p]) => [name, place(p as Vec3)]),
  ) as Omit<Skeleton, 'forward' | 'right' | 'up' | 'face' | 'k'>;
  return {
    ...joints,
    forward: turn({ x: 1, y: 0, z: 0 }),
    right: turn({ x: 0, y: 1, z: 0 }),
    up: turn(body.up),
    face: turn(body.face),
    k: body.k,
  };
}
