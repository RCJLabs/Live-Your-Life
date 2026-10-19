import { describe, expect, it } from 'vitest';
import { type Camera, type CameraLimits, clampCamera, fit, panBy, viewOf, zoomAt } from './camera.ts';
import { box } from './geom.ts';
import { project, unproject } from './iso.ts';

const size = { width: 390, height: 844 };
const limits: CameraLimits = { bounds: { x0: -10, y0: -10, x1: 40, y1: 40 }, minU: 4, maxU: 60 };
const cam: Camera = { cx: 10, cy: 5, u: 16 };

describe('the camera', () => {
  it('puts the ground point it looks at in the middle of the screen', () => {
    const middle = project(viewOf(cam, size), { x: cam.cx, y: cam.cy, z: 0 });
    expect(middle.x).toBeCloseTo(195, 10);
    expect(middle.y).toBeCloseTo(422, 10);
  });

  it('fits a box inside the margins, touching them on its tighter side', () => {
    const target = box(0, 0, 0, 20, 8, 9);
    const fitted = fit(target, size, 16);
    const view = viewOf(fitted, size);
    const corners = [target.x0, target.x1].flatMap((x) =>
      [target.y0, target.y1].flatMap((y) => [target.z0, target.z1].map((z) => project(view, { x, y, z }))),
    );
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(16 - 1e-9);
    expect(Math.max(...xs)).toBeLessThanOrEqual(390 - 16 + 1e-9);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(16 - 1e-9);
    expect(Math.max(...ys)).toBeLessThanOrEqual(844 - 16 + 1e-9);
    // Portrait: a wide box is held by its width.
    expect(Math.min(...xs)).toBeCloseTo(16, 6);
    expect(Math.max(...xs)).toBeCloseTo(374, 6);
  });

  it('fits between insets, centred in the open part of the screen', () => {
    const target = box(0, 0, 0, 4, 4, 30);
    const insets = { top: 60, bottom: 140 };
    const view = viewOf(fit(target, size, 0, insets), size);
    const ys = [target.z0, target.z1].flatMap((z) =>
      [target.x0, target.x1].flatMap((x) => [target.y0, target.y1].map((y) => project(view, { x, y, z }).y)),
    );
    // A tall box is held by the open height, 844 − 60 − 140.
    expect(Math.min(...ys)).toBeCloseTo(60, 6);
    expect(Math.max(...ys)).toBeCloseTo(844 - 140, 6);
  });

  it('zooms about the finger: the ground under it stays under it', () => {
    const at = { x: 300, y: 600 };
    const before = unproject(viewOf(cam, size), at);
    const zoomed = zoomAt(cam, at, 1.5, size, limits);
    expect(zoomed.u).toBeCloseTo(24, 10);
    const after = project(viewOf(zoomed, size), before);
    expect(after.x).toBeCloseTo(at.x, 9);
    expect(after.y).toBeCloseTo(at.y, 9);
  });

  it('pans by exactly the drag', () => {
    const ground = { x: 12, y: 3, z: 0 };
    const start = project(viewOf(cam, size), ground);
    const end = project(viewOf(panBy(cam, 30, -45, size, limits), size), ground);
    expect(end.x - start.x).toBeCloseTo(30, 9);
    expect(end.y - start.y).toBeCloseTo(-45, 9);
  });

  it('never zooms past its limits or looks away from the block', () => {
    expect(zoomAt(cam, { x: 0, y: 0 }, 100, size, limits).u).toBe(60);
    expect(zoomAt(cam, { x: 0, y: 0 }, 0.01, size, limits).u).toBe(4);
    const far = clampCamera({ cx: 500, cy: -500, u: 16 }, limits);
    expect(far).toEqual({ cx: 40, cy: -10, u: 16 });
  });
});
