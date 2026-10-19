/**
 * The camera: a fixed angle, so only where it looks and how close (D7). It holds the ground
 * point at the middle of the screen and the zoom; pans and pinches keep the point under the
 * finger where it was, and the middle never leaves the block.
 */
import { type Box3, clamp, type Pt, type Rect } from './geom.ts';
import { project, unproject, type View } from './iso.ts';

export interface Camera {
  /** The ground point at the middle of the screen, in metres. */
  readonly cx: number;
  readonly cy: number;
  /** Pixels per metre along x. */
  readonly u: number;
}

export interface CameraLimits {
  /** The ground the middle of the screen may look at. */
  readonly bounds: Rect;
  readonly minU: number;
  readonly maxU: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export function viewOf(cam: Camera, size: Viewport): View {
  return {
    u: cam.u,
    ox: size.width / 2 - (cam.cx - cam.cy) * cam.u,
    oy: size.height / 2 - ((cam.cx + cam.cy) / 2) * cam.u,
    width: size.width,
    height: size.height,
  };
}

/** The camera that shows `view`: the ground point under the middle of its screen. */
function cameraOf(view: View): Camera {
  const middle = unproject(view, { x: view.width / 2, y: view.height / 2 });
  return { cx: middle.x, cy: middle.y, u: view.u };
}

export function clampCamera(cam: Camera, limits: CameraLimits): Camera {
  const { bounds } = limits;
  return {
    cx: clamp(cam.cx, bounds.x0, bounds.x1),
    cy: clamp(cam.cy, bounds.y0, bounds.y1),
    u: clamp(cam.u, limits.minU, limits.maxU),
  };
}

/** Screen kept clear at the top and bottom, where the controls sit over the picture. */
export interface Insets {
  readonly top: number;
  readonly bottom: number;
}

/**
 * The camera that fits a world box on the screen with `margin` pixels to spare on each side,
 * between any insets: how a view preset frames two buildings, or one.
 */
export function fit(target: Box3, size: Viewport, margin: number, insets: Insets = { top: 0, bottom: 0 }): Camera {
  const unit: View = { u: 1, ox: 0, oy: 0, width: size.width, height: size.height };
  const corners = [
    { x: target.x0, y: target.y1, z: 0 },
    { x: target.x1, y: target.y0, z: 0 },
    { x: target.x0, y: target.y0, z: target.z1 },
    { x: target.x1, y: target.y1, z: target.z0 },
  ].map((p) => project(unit, p));
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const open = size.height - insets.top - insets.bottom;
  const u = Math.min((size.width - 2 * margin) / w, (open - 2 * margin) / h);
  // At zoom u the box's screen middle is its unit middle times u; put that at the open area's middle.
  const midX = ((Math.max(...xs) + Math.min(...xs)) / 2) * u;
  const midY = ((Math.max(...ys) + Math.min(...ys)) / 2) * u;
  return cameraOf({ u, ox: size.width / 2 - midX, oy: insets.top + open / 2 - midY, ...size });
}

/** Zooms by `factor` about a screen point, which stays over the same ground. */
export function zoomAt(cam: Camera, at: Pt, factor: number, size: Viewport, limits: CameraLimits): Camera {
  const view = viewOf(cam, size);
  const ground = unproject(view, at);
  const u = clamp(cam.u * factor, limits.minU, limits.maxU);
  const next: View = {
    ...view,
    u,
    ox: at.x - (ground.x - ground.y) * u,
    oy: at.y - ((ground.x + ground.y) / 2) * u,
  };
  return clampCamera(cameraOf(next), limits);
}

/** Moves the picture by a drag of (dx, dy) screen pixels. */
export function panBy(cam: Camera, dx: number, dy: number, size: Viewport, limits: CameraLimits): Camera {
  const view = viewOf(cam, size);
  return clampCamera(cameraOf({ ...view, ox: view.ox + dx, oy: view.oy + dy }), limits);
}
