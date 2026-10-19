/**
 * The frame-rate reading for M0.3's phone gate: a second to settle, then ten seconds of frames
 * at speed 1, reported as a line to copy into ROADMAP.md's Readings. The arithmetic is
 * Engine-Builder's 3D spike's (`apps/spike-3d/src/frames.ts`): fps from frames over the total
 * time, and the median, 95th percentile and worst frame by nearest rank.
 */
export const SETTLE_MS = 1000;
export const MEASURE_MS = 10_000;

export interface FrameStats {
  readonly frames: number;
  readonly fps: number;
  readonly median: number;
  readonly p95: number;
  readonly worst: number;
}

/** Statistics of frame intervals in milliseconds. */
export function frameStats(intervals: readonly number[]): FrameStats {
  const sorted = [...intervals].sort((a, b) => a - b);
  const total = intervals.reduce((s, d) => s + d, 0);
  const rank = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))] ?? 0;
  return {
    frames: intervals.length,
    fps: total > 0 ? (intervals.length * 1000) / total : 0,
    median: rank(0.5),
    p95: rank(0.95),
    worst: sorted[sorted.length - 1] ?? 0,
  };
}

export class Measure {
  #startedAt: number | null = null;
  #last: number | null = null;
  readonly #intervals: number[] = [];

  get running(): boolean {
    return this.#startedAt !== null;
  }

  start(now: number): void {
    this.#startedAt = now;
    this.#last = null;
    this.#intervals.length = 0;
  }

  /** Called every frame. Returns the result once the ten seconds are up. */
  frame(now: number): FrameStats | null {
    if (this.#startedAt === null) return null;
    if (now - this.#startedAt < SETTLE_MS) return null;
    if (this.#last !== null) this.#intervals.push(now - this.#last);
    this.#last = now;
    if (now - this.#startedAt < SETTLE_MS + MEASURE_MS) return null;
    this.#startedAt = null;
    return frameStats(this.#intervals);
  }
}

/** The reading as one line, with what it was measured on. */
export function describe(s: FrameStats, where: { width: number; height: number; dpr: number; drawn: number }): string {
  const ms = (n: number) => n.toFixed(1);
  return (
    `${s.fps.toFixed(1)} fps over ${(MEASURE_MS / 1000).toFixed(0)} s at speed 1 ` +
    `(median ${ms(s.median)} ms, 95th ${ms(s.p95)} ms, worst ${ms(s.worst)} ms; ${s.frames} frames). ` +
    `Screen ${where.width}×${where.height} at ${where.dpr}×, drawn at ${where.drawn}×. ${navigator.userAgent}`
  );
}
