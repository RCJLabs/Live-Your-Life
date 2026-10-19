/**
 * You on the block (M1.6): tap-to-go along the walk grid's routes, at a brisk walk with the clock
 * running (D49), and posed at a fixture while you use it. The stage moves you; the sim hears only
 * what you do once you are there. Where you are is the page's, not the save's, until saves
 * (M1.7) keep it.
 */
import { type BlockPlan, cellAt, centreOf, route, type WalkGrid } from '@lyl/sim';
import type { Actor, Look, PoseKind } from '@lyl/stage';
import { along, length, type Pt, throughMiddle } from '../city/walker.ts';
import type { Place } from './places.ts';

/** Metres a stage second at speed 1: three times a walking pace, so the commute is about 20 game minutes (D49). */
export const WALK = 3.9;
/** Metres a full stride covers: two steps, a little longer at a brisk walk. */
const STRIDE = 1.6;

export interface Using {
  readonly place: Place;
  readonly pose: PoseKind;
  readonly bubble: 'sleep' | null;
}

export class Player {
  x: number;
  y: number;
  yaw = Math.PI / 2;
  #path: Pt[] | null = null;
  #walked = 0;
  #length = 0;
  #to: Place | null = null;
  using: Using | null = null;

  constructor(at: Place) {
    this.x = at.stand.x;
    this.y = at.stand.y;
  }

  get walking(): boolean {
    return this.#path !== null;
  }

  /** Where the walk is going, if anywhere. */
  get destination(): Place | null {
    return this.#to;
  }

  /** Sets off for a place or a point; false if no route reaches it. */
  goTo(plan: BlockPlan, grid: WalkGrid, to: Place | Pt): boolean {
    const start = cellAt(grid, this.x, this.y);
    const place = 'cell' in to ? to : null;
    const end = place ? place.cell : cellAt(grid, (to as Pt).x, (to as Pt).y);
    if (start < 0 || end < 0) return false;
    const r = route(grid, start, end);
    if (!r) return false;
    const doors = plan.buildings.flatMap((b) => b.interior?.doors ?? []);
    const cells = r.cells.slice(1).map((c) => throughMiddle(centreOf(grid, c), doors));
    const last = place ? place.stand : centreOf(grid, end);
    this.#path = [{ x: this.x, y: this.y }, ...cells.slice(0, -1), last];
    this.#walked = 0;
    this.#length = length(this.#path);
    this.#to = place;
    this.using = null;
    return true;
  }

  /** Walks on by `seconds` of stage time at a speed's factor; returns the place reached, if one was. */
  step(seconds: number, factor: number): Place | null | undefined {
    const path = this.#path;
    if (!path) return undefined;
    this.#walked = Math.min(this.#length, this.#walked + seconds * factor * WALK);
    const p = along(path, this.#walked);
    this.x = p.x;
    this.y = p.y;
    if (this.#length > 0) this.yaw = p.yaw;
    if (this.#walked < this.#length) return undefined;
    this.#path = null;
    const reached = this.#to;
    this.#to = null;
    return reached;
  }

  /** Stops where you are: a menu or a choice came first. */
  stop(): void {
    this.#path = null;
    this.#to = null;
  }

  /** Uses a fixture: at it, facing it, in its pose; lying on a bed itself. */
  use(place: Place, pose: PoseKind, bubble: 'sleep' | null = null): void {
    this.stop();
    const f = place.fixture;
    if (pose === 'lie' && f) {
      this.x = f.x;
      this.y = f.y;
    } else {
      this.x = place.stand.x;
      this.y = place.stand.y;
      if (f) this.yaw = Math.atan2(f.y - place.stand.y, f.x - place.stand.x);
    }
    this.using = { place, pose, bubble };
  }

  /** Done with a fixture: back on your feet where you stand to use it. */
  getUp(): void {
    const at = this.using?.place;
    if (at) {
      this.x = at.stand.x;
      this.y = at.stand.y;
    }
    this.using = null;
  }

  actor(look: Look, t: number): Actor {
    const base = { id: 'you', look, z: 0, x: this.x, y: this.y, yaw: this.yaw };
    if (this.#path) {
      const stride = (this.#walked / STRIDE) % 1;
      return { ...base, pose: { kind: 'walk', t, stride }, bubble: null };
    }
    const u = this.using;
    if (u?.pose === 'lie') return { ...base, yaw: 0, pose: { kind: 'lie', t }, bubble: u.bubble, bed: u.place.id };
    return { ...base, pose: { kind: u?.pose ?? 'stand', t }, bubble: u?.bubble ?? null };
  }
}
