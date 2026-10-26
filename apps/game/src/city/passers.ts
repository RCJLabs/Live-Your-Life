/**
 * Passers-by (M2.2, D72): the city's tier-2 people, its statistics (D9), drawn walking the town's
 * sidewalks. Nobody in particular and nothing in the save: how many are out follows the hour and
 * the district's density, and who walks where follows from the seed, the sidewalk and the hour,
 * so the same minute always shows the same people. Meeting one, and their becoming tier-1, is a
 * later milestone's.
 */
import { mix } from '@lyl/sim';
import type { Actor, Look } from '@lyl/stage';
import { lookOf } from './crowd.ts';
import type { Walkway } from './town.ts';

/**
 * Passers-by an hour along 100 m of sidewalk where 45 people live to the hectare, the inner ring's
 * (tune): few at night, the most at the morning and evening rush.
 */
export const BY_HOUR = [1, 0, 0, 0, 0, 1, 3, 8, 12, 8, 6, 6, 8, 7, 6, 6, 8, 12, 10, 7, 5, 4, 3, 2] as const;
const DENSITY = 45;
/**
 * Metres a game minute the passers-by move on screen: the pace a walk is drawn at with the clock
 * at rest (life/player.ts: 3.9 m a stage second, 2 game minutes to one). Drawn only; the sim's
 * walking is at the real pace (D119), and they are scenery to it.
 */
const PACE = 1.95;
const STRIDE = 1.6;
/** How many hours back a walk can have started and still be under way: the longest sidewalk's (tune). */
const BACK = 3;

/** Offsets off a walker's line tried in turn when a lamp post or a bench is in the way. */
const ASIDE = [0, 0.5, -0.5, 1, -1, 1.5, -1.5] as const;

/**
 * Who of the passers-by is out at a minute of the life, at stage time t. `free` says where people
 * can stand (the town's walk grid); a walker steps round whatever stands on the sidewalk.
 */
export function passersAt(
  ways: readonly Walkway[],
  seed: number,
  minute: number,
  t: number,
  looks: Map<number, Look>,
  free: (x: number, y: number) => boolean = () => true,
): Actor[] {
  const out: Actor[] = [];
  const now = Math.floor(minute / 60);
  ways.forEach((w, s) => {
    const length = w.x1 - w.x0 + (w.y1 - w.y0);
    const minutes = length / PACE;
    const along = w.x1 - w.x0 >= w.y1 - w.y0;
    for (let h = now - BACK; h <= now; h++) {
      const rate = (BY_HOUR[((h % 24) + 24) % 24] as number) * (w.density / DENSITY) * (length / 100);
      // Whole walkers, and one more by chance for the fraction left: the same for the same hour.
      const whole = Math.floor(rate);
      const count = whole + (mix(seed, 30, s, h) % 1000 < (rate - whole) * 1000 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const roll = mix(seed, 31, s, h, k);
        const start = h * 60 + (roll % 60);
        const gone = minute - start;
        if (gone < 0 || gone >= minutes) continue;
        const back = (roll >>> 8) % 2 === 1;
        const f = back ? 1 - gone / minutes : gone / minutes;
        // A step or so either side of the sidewalk's middle, the same all the way.
        const side = (((roll >>> 10) % 13) - 6) / 8;
        const lx = along ? w.x0 + (w.x1 - w.x0) * f : w.x0 + side;
        const ly = along ? w.y0 + side : w.y0 + (w.y1 - w.y0) * f;
        const step = ASIDE.find((a) => free(along ? lx : lx + a, along ? ly + a : ly));
        if (step === undefined) continue;
        const x = along ? lx : lx + step;
        const y = along ? ly + step : ly;
        const yaw = along ? (back ? Math.PI : 0) : back ? -Math.PI / 2 : Math.PI / 2;
        const id = (roll >>> 1) % 1_000_000;
        const look = looks.get(id) ?? (looks.set(id, lookOf(seed + 1, id)).get(id) as Look);
        out.push({
          id: `passer-${s}-${h}-${k}`,
          look,
          x,
          y,
          z: 0,
          yaw,
          pose: { kind: 'walk', t, stride: ((gone * PACE) / STRIDE) % 1 },
          bubble: null,
        });
      }
    }
  });
  return out;
}
