/**
 * The camera's framings: `wide` holds the diner and the apartment house side by side, as the
 * kill criterion's screenshot needs (risk 1); `close` holds one of them; `block` the whole
 * street. Each is a world box fitted to the screen, with room left for the controls.
 */
import { box, type Camera, type CameraLimits, fit, heightOf, type Insets, type Viewport } from '@lyl/stage';
import type { Block } from './block.ts';
import type { Framing } from './params.ts';

/** Pixels per metre the camera may zoom between (tune). */
export const ZOOM = { min: 5, max: 60 } as const;

export function limitsFor(block: Block): CameraLimits {
  return { bounds: block.scene.bounds, minU: ZOOM.min, maxU: ZOOM.max };
}

export function frame(
  block: Block,
  framing: Framing,
  focus: 'diner' | 'apartment',
  cut: boolean,
  size: Viewport,
  insets: Insets,
): Camera {
  const { diner, apartment } = block.byKind;
  const tall = (b: typeof diner) => (cut && b.interior ? b.storeyHeight : heightOf(b));
  if (framing === 'block') {
    const { bounds } = block.scene;
    return fit(box(bounds.x0, bounds.y0, 0, bounds.x1, bounds.y1, 8), size, 8, insets);
  }
  if (framing === 'close') {
    const b = block.byKind[focus];
    return fit(box(b.x0 - 0.3, b.y0 + 0.4, 0, b.x1 + 0.3, block.curb + 0.4, tall(b)), size, 10, insets);
  }
  const x0 = Math.min(diner.x0, apartment.x0) - 0.4;
  const x1 = Math.max(diner.x1, apartment.x1) + 0.4;
  const y0 = Math.min(diner.y0, apartment.y0) + 0.4;
  return fit(box(x0, y0, 0, x1, block.curb + 0.6, Math.max(tall(diner), tall(apartment))), size, 8, insets);
}
