/**
 * The six people, frame by frame: their looks drawn once from the seed, and what each is doing
 * at a moment of stage time. Scripted for the spike; the sim's people and schedules come with
 * M0.4 and M2.2. The stage draws whatever this hands it.
 */
import { Rng } from '@eb/core';
import { type Actor, CLOTH, HAIR, type Look, type Pose, SHOES, SKIN } from '@lyl/stage';
import type { Block, Placement } from './block.ts';
import type { Role } from './templates.ts';

const WALK_SPEED = 1.3;
/** Metres a full stride covers: two steps. */
const STRIDE = 1.4;
const TURN_PAUSE = 1.6;

const HAIRSTYLES = ['short', 'short', 'long', 'bun', 'bald'] as const;

/** Looks for the six, from the seed: every top a different colour, the cook in whites. */
export function castLooks(seed: string): Readonly<Record<Role, Look>> {
  const rng = Rng.create(`looks:${seed}`);
  const tops = rng.shuffle(CLOTH.filter((c) => c !== '#E9E5DA'));
  const roles: Role[] = ['cook', 'sleeper', 'arguer', 'answerer', 'walker', 'sitter'];
  const looks = {} as Record<Role, Look>;
  roles.forEach((role, i) => {
    const r = rng.fork(role);
    const base: Look = {
      skin: r.pick(SKIN),
      hair: r.pick(HAIR),
      hairStyle: r.pick(HAIRSTYLES),
      top: tops[i % tops.length] as string,
      sleeve: r.chance(1, 2) ? 'long' : 'short',
      bottom: r.pick(CLOTH),
      shoe: r.pick(SHOES),
      height: r.int(160, 190) / 100,
      build: r.int(88, 115) / 100,
    };
    looks[role] =
      role === 'cook'
        ? {
            ...base,
            top: '#F2F0EA',
            sleeve: 'long',
            bottom: '#2E2E33',
            apron: '#3A3A40',
            cap: '#F7F5EF',
            hairStyle: base.hairStyle === 'long' ? 'bun' : base.hairStyle,
          }
        : base;
  });
  return looks;
}

/** Where the walker is along their beat at time t, which way they face, how far they've walked. */
function pace(p: Placement, time: number): { x: number; yaw: number; walked: number; walking: boolean } {
  const [a, b] = p.path ?? [p.x, p.x];
  const leg = Math.max(0.1, b - a);
  const legTime = leg / WALK_SPEED;
  const cycle = 2 * (legTime + TURN_PAUSE);
  // Start halfway along the beat, walking east, so the walker is in the first frame.
  const t = time + legTime / 2;
  const u = t % cycle;
  const laps = Math.floor(t / cycle) * 2 * leg;
  if (u < legTime) return { x: a + u * WALK_SPEED, yaw: 0, walked: laps + u * WALK_SPEED, walking: true };
  if (u < legTime + TURN_PAUSE) return { x: b, yaw: Math.PI, walked: laps + leg, walking: false };
  const back = u - legTime - TURN_PAUSE;
  if (back < legTime)
    return { x: b - back * WALK_SPEED, yaw: Math.PI, walked: laps + leg + back * WALK_SPEED, walking: true };
  return { x: a, yaw: 0, walked: laps + 2 * leg, walking: false };
}

const POSE: Readonly<Record<Exclude<Role, 'walker'>, Pose['kind']>> = {
  cook: 'cook',
  sleeper: 'lie',
  arguer: 'argue',
  answerer: 'answer',
  sitter: 'eat',
};

/** Everyone as the stage should draw them at stage time t. */
export function actorsAt(block: Block, looks: Readonly<Record<Role, Look>>, t: number): Actor[] {
  return block.people.map((p) => {
    const look = looks[p.role];
    if (p.role === 'walker') {
      const step = pace(p, t);
      return {
        id: p.role,
        look,
        x: step.x,
        y: p.y,
        z: 0,
        yaw: step.yaw,
        pose: step.walking ? { kind: 'walk', t, stride: (step.walked / STRIDE) % 1 } : { kind: 'stand', t },
        bubble: null,
      };
    }
    return {
      id: p.role,
      look,
      x: p.x,
      y: p.y,
      z: 0,
      yaw: p.yaw,
      pose: { kind: POSE[p.role], t },
      bubble: p.role === 'sleeper' ? 'sleep' : p.role === 'arguer' || p.role === 'answerer' ? 'argue' : null,
      ...(p.bed ? { bed: p.bed } : {}),
    };
  });
}
