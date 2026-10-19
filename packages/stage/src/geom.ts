/** Points and boxes in the world's metres: x runs east, y south, z up. */

export const TAU = Math.PI * 2;

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A point on the screen, in CSS pixels. */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned box in the world: what the depth sort compares. */
export interface Box3 {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z0: number;
  readonly z1: number;
}

/** A rectangle on the screen. */
export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export const v3 = (x: number, y: number, z = 0): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const normalize = (a: Vec3): Vec3 => {
  const n = length(a);
  return n === 0 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / n);
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
});
export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** Turns a point about the vertical axis by `yaw` radians: 0 faces east (+x), π/2 faces south (+y). */
export const rotateZ = (p: Vec3, yaw: number): Vec3 => {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
};

export const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Box3 => ({
  x0: Math.min(x0, x1),
  x1: Math.max(x0, x1),
  y0: Math.min(y0, y1),
  y1: Math.max(y0, y1),
  z0: Math.min(z0, z1),
  z1: Math.max(z0, z1),
});

export const overlaps = (a: Rect, b: Rect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
