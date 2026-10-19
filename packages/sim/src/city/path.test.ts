import { Rng } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { route } from './path.ts';
import { CELL, neighbours, reach, type WalkGrid } from './walk.ts';

const INF = Number.POSITIVE_INFINITY;

/** A grid from rows of text: `.` sidewalk, `,` grass at 2, `#` a wall. */
function gridOf(rows: readonly string[]): WalkGrid {
  const width = (rows[0] as string).length;
  const cost = new Float64Array(width * rows.length);
  rows.forEach((row, r) => {
    for (let c = 0; c < width; c++) cost[r * width + c] = row[c] === '#' ? INF : row[c] === ',' ? 2 : 1;
  });
  return { x0: 0, y0: 0, width, height: rows.length, cost, minCost: 1 };
}

const at = (grid: WalkGrid, c: number, r: number) => r * grid.width + c;

/** Dijkstra with the same steps and costs as route(): the plain answer A* must match. */
function cheapest(grid: WalkGrid, start: number, goal: number): number {
  const best = new Float64Array(grid.width * grid.height).fill(INF);
  const done = new Uint8Array(best.length);
  best[start] = 0;
  const next: number[] = [];
  for (;;) {
    let current = -1;
    for (let i = 0; i < best.length; i++)
      if (!done[i] && (current < 0 || (best[i] as number) < (best[current] as number))) current = i;
    if (current < 0 || best[current] === INF) return INF;
    if (current === goal) return best[current] as number;
    done[current] = 1;
    const count = neighbours(grid, current, next);
    for (let k = 0; k < count; k++) {
      const cell = next[k] as number;
      const diagonal =
        cell % grid.width !== current % grid.width &&
        Math.floor(cell / grid.width) !== Math.floor(current / grid.width);
      const step = (diagonal ? Math.SQRT2 * CELL : CELL) * (grid.cost[cell] as number);
      best[cell] = Math.min(best[cell] as number, (best[current] as number) + step);
    }
  }
}

describe('routes on the walk grid', () => {
  it('walk a straight line and a diagonal at their true lengths', () => {
    const grid = gridOf(['......', '......', '......', '......']);
    expect(route(grid, at(grid, 0, 0), at(grid, 5, 0))?.metres).toBeCloseTo(5 * CELL, 9);
    expect(route(grid, at(grid, 0, 0), at(grid, 3, 3))?.metres).toBeCloseTo(3 * Math.SQRT2 * CELL, 9);
  });

  it('go round a wall and never cut its corner', () => {
    const grid = gridOf(['....', '.##.', '....']);
    const found = route(grid, at(grid, 0, 0), at(grid, 3, 2));
    expect(found).not.toBeNull();
    for (const cell of found?.cells ?? []) expect(grid.cost[cell]).toBeLessThan(INF);
    // From (0,0) the diagonal to (1,1) is the wall; to (1,0) then (2,1) would cut the wall's corner.
    const cells = found?.cells ?? [];
    for (let i = 1; i < cells.length; i++) {
      const [a, b] = [cells[i - 1] as number, cells[i] as number];
      const dc = (b % 4) - (a % 4);
      const dr = Math.floor(b / 4) - Math.floor(a / 4);
      if (dc !== 0 && dr !== 0) {
        expect(grid.cost[a + dc]).toBeLessThan(INF);
        expect(grid.cost[a + dr * 4]).toBeLessThan(INF);
      }
    }
  });

  it('take the cheaper ground over the shorter way when it costs less', () => {
    // Straight across is three steps of grass at 2; round by the top row is five of sidewalk.
    const grid = gridOf(['.....', '.,,,.', '#####']);
    const found = route(grid, at(grid, 0, 1), at(grid, 4, 1));
    expect(found?.cost).toBeCloseTo(cheapest(grid, at(grid, 0, 1), at(grid, 4, 1)), 9);
    expect(found?.cells.some((c) => grid.cost[c] === 2)).toBe(false);
  });

  it('find nothing where nothing can be reached', () => {
    const grid = gridOf(['..#..', '..#..', '..#..']);
    expect(route(grid, at(grid, 0, 0), at(grid, 4, 2))).toBeNull();
    expect(reach(grid, at(grid, 0, 0))[at(grid, 4, 2)]).toBe(0);
  });

  it('go to the nearest of several goals', () => {
    const grid = gridOf(['..........']);
    const found = route(grid, at(grid, 2, 0), [at(grid, 9, 0), at(grid, 0, 0)]);
    expect(found?.cells[found.cells.length - 1]).toBe(at(grid, 0, 0));
  });

  it('cost what the plain cheapest route costs, on 200 seeded grids of walls and grass', () => {
    const rng = Rng.create('paths');
    for (let n = 0; n < 200; n++) {
      const rows = Array.from({ length: 9 }, () =>
        Array.from({ length: 11 }, () => ['.', '.', '.', ',', '#'][rng.int(0, 4)]).join(''),
      );
      const grid = gridOf(rows);
      grid.cost[0] = 1;
      grid.cost[grid.cost.length - 1] = 1;
      const found = route(grid, 0, grid.cost.length - 1);
      const best = cheapest(grid, 0, grid.cost.length - 1);
      if (best === INF) expect(found).toBeNull();
      else expect(found?.cost).toBeCloseTo(best, 9);
    }
  });

  it('is the same route every time', () => {
    const grid = gridOf(['........', '..#..#..', '........', '.##..##.', '........']);
    expect(route(grid, 0, grid.cost.length - 1)).toEqual(route(grid, 0, grid.cost.length - 1));
  });
});
