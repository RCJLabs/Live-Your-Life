/**
 * Poses as targets, as Dirtbag's figures are (`people.ts`, `PersonAt`): where the hips, feet
 * and hands go and how the body leans, in the body's own frame. The rig's IK finds the knees
 * and elbows. Body frame: x forward, y to the person's right, z up, from the ground between
 * the feet. A new pose is new targets, nothing more.
 */
import type { Vec3 } from '../geom.ts';
import { BODY } from './look.ts';

export type PoseKind = 'stand' | 'walk' | 'sit' | 'eat' | 'lie' | 'cook' | 'argue' | 'answer';

export interface Pose {
  readonly kind: PoseKind;
  /** Seconds into the pose: breathing, stirring, gesturing. */
  readonly t: number;
  /** 0 to 1 through a stride, from the distance walked. */
  readonly stride?: number;
}

export interface Targets {
  readonly pelvis: Vec3;
  /** Forward pitch of the spine, radians. */
  readonly lean: number;
  /** The head's nod, radians, down positive. */
  readonly nod: number;
  readonly footL: Vec3;
  readonly footR: Vec3;
  readonly handL: Vec3;
  readonly handR: Vec3;
}

const TAU = Math.PI * 2;
const HIP = BODY.ankle + BODY.shin + BODY.thigh;
const SHOULDER = HIP + BODY.spine;
const wave = (t: number, period: number, phase = 0) => Math.sin((TAU * t) / period + phase);

/** Hands hanging at the sides, a little forward. */
const hanging = (side: number): Vec3 => ({ x: 0.05, y: side * 0.24, z: HIP - 0.07 });

function stand(t: number): Targets {
  const breath = 0.004 * wave(t, 3.6);
  return {
    pelvis: { x: 0, y: 0, z: HIP - 0.01 + breath },
    lean: 0.02,
    nod: 0.05,
    footL: { x: 0.02, y: -0.11, z: BODY.ankle },
    footR: { x: -0.02, y: 0.11, z: BODY.ankle },
    handL: hanging(-1),
    handR: hanging(1),
  };
}

function walk(stride: number): Targets {
  const a = TAU * stride;
  const reach = 0.3;
  const foot = (phase: number, side: number): Vec3 => ({
    x: reach * Math.cos(a + phase),
    y: side * 0.1,
    // The foot moving back is planted; the one swinging forward lifts.
    z: BODY.ankle + 0.11 * Math.max(0, -Math.sin(a + phase)),
  });
  const swing = (phase: number, side: number): Vec3 => ({
    x: 0.05 - 0.2 * Math.cos(a + phase),
    y: side * 0.25,
    z: HIP - 0.06 + 0.03 * Math.abs(Math.sin(a + phase)),
  });
  return {
    pelvis: { x: 0, y: 0, z: HIP - 0.04 + 0.022 * Math.cos(2 * a) },
    lean: 0.07,
    nod: 0.04,
    footL: foot(0, -1),
    footR: foot(Math.PI, 1),
    // Arms swing against the legs.
    handL: swing(Math.PI, -1),
    handR: swing(0, 1),
  };
}

const SEAT = 0.46;

function sit(t: number, eating: boolean): Targets {
  // A bite every four seconds: the right hand from the table to the mouth and back.
  const cycle = (t % 4) / 4;
  const lift = eating ? Math.max(0, Math.sin(Math.PI * Math.min(1, cycle / 0.35))) : 0;
  const table: Vec3 = { x: 0.36, y: 0.16, z: SEAT + 0.3 };
  const mouth: Vec3 = { x: 0.16, y: 0.06, z: SHOULDER + 0.12 };
  return {
    pelvis: { x: -0.06, y: 0, z: SEAT + 0.05 },
    lean: -0.04 + 0.1 * lift,
    nod: 0.12,
    footL: { x: 0.42, y: -0.13, z: BODY.ankle },
    footR: { x: 0.42, y: 0.13, z: BODY.ankle },
    handL: eating ? { x: 0.34, y: -0.17, z: SEAT + 0.3 } : { x: 0.24, y: -0.18, z: SEAT + 0.12 },
    handR: eating
      ? {
          x: table.x + (mouth.x - table.x) * lift,
          y: table.y + (mouth.y - table.y) * lift,
          z: table.z + (mouth.z - table.z) * lift,
        }
      : { x: 0.24, y: 0.18, z: SEAT + 0.12 },
  };
}

function cook(t: number): Targets {
  // One hand holds the pan; the other works the spatula, quick and short.
  const stir = 0.06 * wave(t, 0.9);
  const flip = 0.04 * Math.max(0, wave(t, 2.7));
  return {
    pelvis: { x: 0, y: 0, z: HIP - 0.02 },
    lean: 0.16,
    nod: 0.42,
    footL: { x: 0.04, y: -0.13, z: BODY.ankle },
    footR: { x: -0.02, y: 0.13, z: BODY.ankle },
    handL: { x: 0.42, y: -0.16, z: 1.02 + flip },
    handR: { x: 0.46 + stir, y: 0.12 + 0.6 * stir, z: 1.0 + 0.5 * Math.abs(stir) },
  };
}

/** Seconds each of two arguing people holds the floor. */
export const TURN = 2.6;

/** Whether an arguing person is the one speaking now: their bubble shows, the other's doesn't. */
export const speaking = (pose: Pose): boolean =>
  (pose.kind === 'argue' || pose.kind === 'answer') &&
  (pose.t + (pose.kind === 'answer' ? TURN : 0)) % (2 * TURN) < TURN;

/**
 * Two people arguing take turns: one jabs a finger and leans in while the other throws up
 * open hands, then they swap. `answer` is the same argument half a turn later.
 */
function argue(t: number, offset: number): Targets {
  const turn = TURN;
  const speaking = (t + offset) % (2 * turn) < turn;
  const beat = wave(t, 0.42);
  if (speaking) {
    return {
      pelvis: { x: 0.02, y: 0, z: HIP - 0.02 },
      lean: 0.15,
      nod: -0.05,
      footL: { x: 0.12, y: -0.12, z: BODY.ankle },
      footR: { x: -0.1, y: 0.13, z: BODY.ankle },
      handL: { x: -0.02, y: -0.3, z: HIP + 0.04 },
      handR: { x: 0.44 + 0.06 * beat, y: 0.16, z: SHOULDER - 0.05 + 0.06 * beat },
    };
  }
  const shrug = 0.05 * Math.abs(beat);
  return {
    pelvis: { x: -0.02, y: 0, z: HIP - 0.01 },
    lean: -0.06,
    nod: -0.1,
    footL: { x: 0.04, y: -0.14, z: BODY.ankle },
    footR: { x: -0.06, y: 0.14, z: BODY.ankle },
    handL: { x: 0.24, y: -0.44, z: SHOULDER - 0.2 + shrug },
    handR: { x: 0.24, y: 0.44, z: SHOULDER - 0.2 + shrug },
  };
}

/** Lying on the back, arms at the sides. The rig turns this standing body flat (rig.ts). */
function lie(t: number): Targets {
  const breath = 0.006 * wave(t, 4.8);
  return {
    pelvis: { x: 0, y: 0, z: HIP },
    lean: breath,
    nod: -0.15,
    footL: { x: 0.02, y: -0.12, z: BODY.ankle },
    footR: { x: 0.02, y: 0.12, z: BODY.ankle },
    handL: { x: 0.06, y: -0.25, z: HIP - 0.05 },
    handR: { x: 0.06, y: 0.25, z: HIP - 0.05 },
  };
}

export function targetsFor(pose: Pose): Targets {
  switch (pose.kind) {
    case 'stand':
      return stand(pose.t);
    case 'walk':
      return walk(pose.stride ?? 0);
    case 'sit':
      return sit(pose.t, false);
    case 'eat':
      return sit(pose.t, true);
    case 'cook':
      return cook(pose.t);
    case 'argue':
      return argue(pose.t, 0);
    case 'answer':
      return argue(pose.t, TURN);
    case 'lie':
      return lie(pose.t);
  }
}
