/**
 * The city's streets as one network (M2.1), for routes across blocks. Each cell's streets run
 * down the middles between its blocks and along its edges, which the cells round it share, so a
 * district's streets meet the next district's at the cell's edge even where their blocks differ
 * in size. Nodes are where street middles meet, T-junctions at a cell's edge included; an edge
 * is the stretch of street between two. A walk follows the middles: the sidewalks on either
 * side run beside them, and the face's own walk grid (walk.ts) takes you from the street to a
 * door.
 *
 * Built from the plan, never stored: the same city, the same streets.
 */

import type { DistrictRecord } from './city.ts';
import { type CityPlan, gridOf } from './city.ts';

/** Street middles in millimetres, so a cell's edge reached from either side is the same key. */
const mm = (v: number): number => Math.round(v * 1000);

export interface Streets {
  readonly count: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  /** Each node's edges: `to` and `len` from `first[n]` up to `first[n + 1]`. */
  readonly first: Uint32Array;
  readonly to: Uint32Array;
  readonly len: Float64Array;
  /** 1 where an edge is an arterial: along every `arterialEvery`th cell edge, the city's wider streets. */
  readonly arterial: Uint8Array;
  /** Each east–west street middle by its y in mm: the nodes along it, west to east. */
  readonly rows: ReadonlyMap<number, { readonly at: Float64Array; readonly node: Uint32Array }>;
}

/** A stretch of one street middle, with the points along it where others meet it. */
interface Run {
  readonly from: number;
  readonly to: number;
  readonly points: number[];
}

/** Every cell's street middles: east–west ones by y, north–south ones by x. */
function runsOf(city: CityPlan, records: readonly DistrictRecord[]) {
  const rows = new Map<number, Run[]>();
  const cols = new Map<number, Run[]>();
  const add = (lines: Map<number, Run[]>, at: number, run: Run) => {
    const list = lines.get(mm(at)) ?? [];
    list.push(run);
    lines.set(mm(at), list);
  };
  const n = city.size;
  for (let cell = 0; cell < n * n; cell++) {
    const d = records[city.cellDistrict[cell] as number] as DistrictRecord;
    const { across, down } = gridOf(city.cell, d);
    const cx = (cell % n) * city.cell;
    const cy = Math.floor(cell / n) * city.cell;
    const xs = Array.from({ length: across + 1 }, (_, i) => cx + (i * city.cell) / across);
    const ys = Array.from({ length: down + 1 }, (_, j) => cy + (j * city.cell) / down);
    for (const y of ys) add(rows, y, { from: cx, to: cx + city.cell, points: xs });
    for (const x of xs) add(cols, x, { from: cy, to: cy + city.cell, points: ys });
  }
  return { rows, cols };
}

/** The nodes along one street middle, in order, and which neighbours a run of street joins. */
function along(runs: readonly Run[]): { points: number[]; joined: (a: number, b: number) => boolean } {
  const points = [...new Set(runs.flatMap((r) => r.points.map(mm)))].sort((a, b) => a - b).map((v) => v / 1000);
  const joined = (a: number, b: number) => runs.some((r) => r.from <= a + 1e-6 && b <= r.to + 1e-6);
  return { points, joined };
}

/** The city's street network. `records` are the plan's district records, in its order. */
export function streetsOf(city: CityPlan, records: readonly DistrictRecord[]): Streets {
  const { rows, cols } = runsOf(city, records);
  const ids = new Map<string, number>();
  const xs: number[] = [];
  const ys: number[] = [];
  const nodeAt = (x: number, y: number): number => {
    const key = `${mm(x)},${mm(y)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = xs.length;
      ids.set(key, id);
      xs.push(x);
      ys.push(y);
    }
    return id;
  };
  const edges: [number, number, number, number][] = [];
  const every = city.cell * city.arterialEvery;
  const isArterial = (at: number) => (Math.abs(at / every - Math.round(at / every)) < 1e-9 ? 1 : 0);
  const rowNodes = new Map<number, { at: Float64Array; node: Uint32Array }>();
  for (const [key, runs] of rows) {
    const y = key / 1000;
    const { points, joined } = along(runs);
    const nodes = points.map((x) => nodeAt(x, y));
    rowNodes.set(key, { at: Float64Array.from(points), node: Uint32Array.from(nodes) });
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1] as number, points[i] as number];
      if (joined(a, b)) edges.push([nodes[i - 1] as number, nodes[i] as number, b - a, isArterial(y)]);
    }
  }
  for (const [key, runs] of cols) {
    const x = key / 1000;
    const { points, joined } = along(runs);
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1] as number, points[i] as number];
      if (joined(a, b)) edges.push([nodeAt(x, a), nodeAt(x, b), b - a, isArterial(x)]);
    }
  }
  return {
    count: xs.length,
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    ...adjacency(xs.length, edges),
    rows: rowNodes,
  };
}

/** Edges both ways, grouped by node. */
function adjacency(count: number, edges: readonly [number, number, number, number][]) {
  const degree = new Uint32Array(count + 1);
  for (const [a, b] of edges) {
    degree[a + 1] = (degree[a + 1] as number) + 1;
    degree[b + 1] = (degree[b + 1] as number) + 1;
  }
  for (let i = 1; i <= count; i++) degree[i] = (degree[i] as number) + (degree[i - 1] as number);
  const first = Uint32Array.from(degree);
  const fill = Uint32Array.from(degree);
  const to = new Uint32Array(edges.length * 2);
  const len = new Float64Array(edges.length * 2);
  const arterial = new Uint8Array(edges.length * 2);
  const put = (a: number, b: number, l: number, big: number) => {
    const at = fill[a] as number;
    to[at] = b;
    len[at] = l;
    arterial[at] = big;
    fill[a] = at + 1;
  };
  for (const [a, b, l, big] of edges) {
    put(a, b, l, big);
    put(b, a, l, big);
  }
  return { first, to, len, arterial };
}
