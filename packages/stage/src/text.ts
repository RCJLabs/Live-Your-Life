/**
 * Words painted on a face: a sign, a window card. The face's frame becomes the canvas's
 * transform, so the letters lie on the wall at its slant. System fonts only: nothing is
 * fetched (CLAUDE.md, "Offline always").
 */
import { type Face, faceAt } from './box.ts';
import { project, type View } from './iso.ts';

/** Letters are laid out at this many units to the metre, then scaled down by the transform. */
const UNITS = 100;

export function paintText(
  ctx: CanvasRenderingContext2D,
  view: View,
  face: Face,
  text: string,
  at: { s: number; t: number; height: number; maxWidth: number },
  color: string,
  weight = 800,
): void {
  const o = project(view, faceAt(face, at.s, at.t));
  const sx = project(view, faceAt(face, at.s + 1, at.t));
  const ty = project(view, faceAt(face, at.s, at.t - 1));
  ctx.save();
  // Local x runs along the face, local y down it, one unit a hundredth of a metre.
  ctx.transform((sx.x - o.x) / UNITS, (sx.y - o.y) / UNITS, (ty.x - o.x) / UNITS, (ty.y - o.y) / UNITS, o.x, o.y);
  ctx.font = `${weight} ${Math.round(at.height * UNITS)}px system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0, at.maxWidth * UNITS);
  ctx.restore();
}
