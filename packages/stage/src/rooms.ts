/**
 * A cut-away room's floor and rugs, drawn with the ground, and its lights after dark.
 */
import { WALL } from './building.ts';
import { box, type Pt } from './geom.ts';
import { drawFloor, drawPatch } from './ground.ts';
import { project, type View } from './iso.ts';
import { LIGHTS_ON } from './light.ts';
import { INSIDE } from './palette.ts';
import { hull } from './person/draw.ts';
import type { Building, Frame } from './types.ts';

export function drawRoomFloor(ctx: CanvasRenderingContext2D, view: View, b: Building, frame: Frame): void {
  const interior = b.interior;
  if (!interior) return;
  drawFloor(ctx, view, { x0: b.x0 + WALL, y0: b.y0 + WALL, x1: b.x1 - WALL, y1: b.y1 - WALL }, interior.floor);
  for (const f of interior.fixtures) {
    if (f.kind !== 'rug') continue;
    const edge = { x0: f.x - f.w / 2, y0: f.y - f.d / 2, x1: f.x + f.w / 2, y1: f.y + f.d / 2 };
    drawPatch(ctx, view, { ...edge, color: INSIDE.rug }, 0.03);
    const inner = { x0: edge.x0 + 0.15, y0: edge.y0 + 0.15, x1: edge.x1 - 0.15, y1: edge.y1 - 0.15 };
    drawPatch(ctx, view, { ...inner, color: '#A9705F' }, 0.035);
  }
  if (frame.dark > LIGHTS_ON) {
    // The room's lights are on: the night lets it through.
    const room = box(b.x0, b.y0, 0, b.x1, b.y1, b.storeyHeight);
    const corners: Pt[] = [];
    for (const x of [room.x0, room.x1]) {
      for (const y of [room.y0, room.y1]) for (const z of [room.z0, room.z1]) corners.push(project(view, { x, y, z }));
    }
    frame.lights.push({ kind: 'shape', points: hull(corners), strength: 0.82 });
  }
}
