/**
 * The walk grid drawn over the block (`&grid=1`), to see what a walker may step on: a dot at each
 * open cell, paler for dearer ground. A look for the developer, drawn on top of everything and
 * not in the depth sort.
 */
import { CELL, centreOf, GROUND_COST, type WalkGrid } from '@lyl/sim';
import { project, type View } from '@lyl/stage';

const COLOURS: ReadonlyMap<number, string> = new Map([
  [GROUND_COST.sidewalk, 'rgba(255, 253, 245, 0.85)'],
  [GROUND_COST.lot, 'rgba(255, 226, 150, 0.8)'],
  [GROUND_COST.verge, 'rgba(190, 255, 170, 0.8)'],
  [GROUND_COST.roadway, 'rgba(255, 170, 120, 0.85)'],
]);

export function drawWalkGrid(ctx: CanvasRenderingContext2D, view: View, grid: WalkGrid): void {
  const dot = Math.max(1, Math.min(3, view.u * CELL * 0.18));
  for (let cell = 0; cell < grid.cost.length; cell++) {
    const cost = grid.cost[cell] as number;
    if (cost === Number.POSITIVE_INFINITY) continue;
    const { x, y } = centreOf(grid, cell);
    const p = project(view, { x, y, z: 0 });
    if (p.x < -dot || p.y < -dot || p.x > view.width + dot || p.y > view.height + dot) continue;
    ctx.fillStyle = COLOURS.get(cost) ?? 'rgba(255, 253, 245, 0.85)';
    ctx.fillRect(p.x - dot / 2, p.y - dot / 2, dot, dot);
  }
}
