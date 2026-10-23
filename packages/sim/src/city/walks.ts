/**
 * Walks across the city (M2.1): from a door on one block's face to a door on another's, along
 * the street middles (streets.ts). Dijkstra over the network, from the two ends of the stretch
 * of street in front of the first door to the two ends in front of the second. Distances in
 * metres; what a metre costs on foot is the walker's (life/player.ts).
 */
import type { CityPlan, DistrictRecord } from './city.ts';
import { type Side, toCity } from './face.ts';
import type { Streets } from './streets.ts';

/** A point on a street middle, between two nodes of the network. */
export interface StreetPoint {
  readonly x: number;
  readonly y: number;
  readonly a: number;
  readonly b: number;
  /** Metres to `a` and to `b`. */
  readonly da: number;
  readonly db: number;
}

export interface Walk {
  /** Metres along the streets, from the first point to the last. */
  readonly metres: number;
  /** The way, as points in the city's metres: the start, each corner turned, the end. */
  readonly path: readonly { readonly x: number; readonly y: number }[];
}

const mm = (v: number): number => Math.round(v * 1000);

/** The street middle in front of a point of a face: x in the face's frame, as a door's. */
export function inFront(
  city: CityPlan,
  records: readonly DistrictRecord[],
  streets: Streets,
  block: number,
  side: Side,
  x: number,
): StreetPoint {
  const d = records[city.blocks.district[block] as number] as DistrictRecord;
  const by = city.blocks.y[block] as number;
  const y = side === 1 ? by + (city.blocks.d[block] as number) + d.block.street / 2 : by - d.block.street / 2;
  const at = toCity(city, block, side, 0, x, 0).x;
  const row = streets.rows.get(mm(y));
  if (!row) throw new Error(`streets: no street at y ${y}`);
  let i = 1;
  while (i < row.at.length - 1 && (row.at[i] as number) < at) i++;
  const xa = row.at[i - 1] as number;
  const xb = row.at[i] as number;
  return { x: at, y, a: row.node[i - 1] as number, b: row.node[i] as number, da: at - xa, db: xb - at };
}

/** A binary heap of nodes by distance, smallest first. */
class Heap {
  readonly #node: number[] = [];
  readonly #key: number[] = [];
  get size(): number {
    return this.#node.length;
  }
  push(node: number, key: number): void {
    let i = this.#node.length;
    this.#node.push(node);
    this.#key.push(key);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if ((this.#key[up] as number) <= key) break;
      this.#swap(i, up);
      i = up;
    }
  }
  pop(): number {
    const top = this.#node[0] as number;
    const lastNode = this.#node.pop() as number;
    const lastKey = this.#key.pop() as number;
    if (this.#node.length > 0) {
      this.#node[0] = lastNode;
      this.#key[0] = lastKey;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.#key.length && (this.#key[l] as number) < (this.#key[m] as number)) m = l;
        if (r < this.#key.length && (this.#key[r] as number) < (this.#key[m] as number)) m = r;
        if (m === i) break;
        this.#swap(i, m);
        i = m;
      }
    }
    return top;
  }
  #swap(i: number, j: number): void {
    [this.#node[i], this.#node[j]] = [this.#node[j] as number, this.#node[i] as number];
    [this.#key[i], this.#key[j]] = [this.#key[j] as number, this.#key[i] as number];
  }
}

/** The shortest walk between two street points, or null if no street joins them. */
export function walkBetween(s: Streets, from: StreetPoint, to: StreetPoint): Walk | null {
  // On the same stretch of street: straight along it.
  const same = (from.a === to.a && from.b === to.b) || (from.a === to.b && from.b === to.a);
  const direct = same ? Math.hypot(to.x - from.x, to.y - from.y) : Number.POSITIVE_INFINITY;
  const dist = new Float64Array(s.count).fill(Number.POSITIVE_INFINITY);
  const prev = new Int32Array(s.count).fill(-1);
  const heap = new Heap();
  for (const [n, d] of [
    [from.a, from.da],
    [from.b, from.db],
  ] as const) {
    if (d < (dist[n] as number)) {
      dist[n] = d;
      heap.push(n, d);
    }
  }
  const ends = new Map([
    [to.a, to.da],
    [to.b, to.db],
  ]);
  let best = direct;
  let last = -1;
  while (heap.size > 0) {
    const n = heap.pop();
    const d = dist[n] as number;
    if (d >= best) break;
    const end = ends.get(n);
    if (end !== undefined && d + end < best) {
      best = d + end;
      last = n;
    }
    for (let e = s.first[n] as number; e < (s.first[n + 1] as number); e++) {
      const m = s.to[e] as number;
      const nd = d + (s.len[e] as number);
      if (nd < (dist[m] as number)) {
        dist[m] = nd;
        prev[m] = n;
        heap.push(m, nd);
      }
    }
  }
  if (best === Number.POSITIVE_INFINITY) return null;
  const corners: { x: number; y: number }[] = [];
  for (let n = last; n >= 0; n = prev[n] as number) corners.unshift({ x: s.x[n] as number, y: s.y[n] as number });
  return { metres: best, path: [{ x: from.x, y: from.y }, ...corners, { x: to.x, y: to.y }] };
}
