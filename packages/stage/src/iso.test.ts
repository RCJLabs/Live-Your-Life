import { describe, expect, it } from 'vitest';
import { box, type Vec3 } from './geom.ts';
import { nearness, project, RISE, screenRect, TOWARD_CAMERA, unproject, type View } from './iso.ts';

const view: View = { u: 20, ox: 100, oy: 50, width: 390, height: 844 };

describe('the isometric view', () => {
  it('draws a ground metre east as down-right and south as down-left, twice as wide as tall', () => {
    expect(project(view, { x: 0, y: 0, z: 0 })).toEqual({ x: 100, y: 50 });
    expect(project(view, { x: 1, y: 0, z: 0 })).toEqual({ x: 120, y: 60 });
    expect(project(view, { x: 0, y: 1, z: 0 })).toEqual({ x: 80, y: 60 });
  });

  it('draws a vertical metre √1.5 times a ground step, straight up', () => {
    const up = project(view, { x: 0, y: 0, z: 1 });
    expect(up.x).toBe(100);
    expect(up.y).toBeCloseTo(50 - RISE * 20, 10);
    expect(RISE).toBeCloseTo(1.224744871, 8);
  });

  it('finds the ground under a screen point, at any height', () => {
    for (const p of [
      { x: 3.5, y: -2, z: 0 },
      { x: 12, y: 7.25, z: 0 },
      { x: -4, y: 9, z: 2.5 },
    ]) {
      const back = unproject(view, project(view, p), p.z);
      expect(back.x).toBeCloseTo(p.x, 10);
      expect(back.y).toBeCloseTo(p.y, 10);
    }
  });

  it('looks along a line that draws as one point, and calls nearer what is east, south or up', () => {
    const p: Vec3 = { x: 2, y: 3, z: 1 };
    const along = { x: p.x + TOWARD_CAMERA.x * 5, y: p.y + TOWARD_CAMERA.y * 5, z: p.z + TOWARD_CAMERA.z * 5 };
    expect(project(view, along).x).toBeCloseTo(project(view, p).x, 10);
    expect(project(view, along).y).toBeCloseTo(project(view, p).y, 10);
    expect(nearness({ x: 1, y: 0, z: 0 })).toBeGreaterThan(nearness({ x: 0, y: 0, z: 0 }));
    expect(nearness({ x: 0, y: 1, z: 0 })).toBeGreaterThan(0);
    expect(nearness({ x: 0, y: 0, z: 1 })).toBeGreaterThan(0);
  });

  it("bounds a box's eight corners exactly", () => {
    const b = box(1, 2, 0, 4, 7, 3);
    const r = screenRect(view, b);
    const corners = [b.x0, b.x1].flatMap((x) =>
      [b.y0, b.y1].flatMap((y) => [b.z0, b.z1].map((z) => project(view, { x, y, z }))),
    );
    expect(Math.min(...corners.map((c) => c.x))).toBeCloseTo(r.x0, 10);
    expect(Math.max(...corners.map((c) => c.x))).toBeCloseTo(r.x1, 10);
    expect(Math.min(...corners.map((c) => c.y))).toBeCloseTo(r.y0, 10);
    expect(Math.max(...corners.map((c) => c.y))).toBeCloseTo(r.y1, 10);
  });
});
