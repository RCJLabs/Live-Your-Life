/**
 * Touch and mouse on the city: one finger drags the picture, two pinch it, a wheel zooms, and a
 * tap that doesn't move is a tap. Tap-to-go comes with M1.6; until then a tap brings back the
 * hidden controls.
 */
export interface Gestures {
  pan(dx: number, dy: number): void;
  zoom(at: { x: number; y: number }, factor: number): void;
  tap(at: { x: number; y: number }): void;
}

/** A press that moves less than this and lasts less than `TAP_MS` is a tap. */
const TAP_PX = 8;
const TAP_MS = 350;

export function listen(el: HTMLElement, on: Gestures): void {
  const down = new Map<number, { x: number; y: number }>();
  let start: { x: number; y: number; t: number; moved: boolean } | null = null;
  const local = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    down.set(e.pointerId, local(e));
    start = down.size === 1 ? { ...local(e), t: e.timeStamp, moved: false } : null;
  });
  el.addEventListener('pointermove', (e) => {
    const was = down.get(e.pointerId);
    if (!was) return;
    const now = local(e);
    if (down.size === 1) {
      on.pan(now.x - was.x, now.y - was.y);
      if (start && Math.hypot(now.x - start.x, now.y - start.y) > TAP_PX) start.moved = true;
    } else if (down.size === 2) {
      const [a, b] = [...down.entries()].map(([id, p]) => (id === e.pointerId ? now : p)) as [typeof now, typeof now];
      const [pa, pb] = [...down.values()] as [typeof now, typeof now];
      const before = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const midBefore = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      on.pan(mid.x - midBefore.x, mid.y - midBefore.y);
      if (before > 0 && after > 0) on.zoom(mid, after / before);
    }
    down.set(e.pointerId, now);
  });
  const up = (e: PointerEvent) => {
    if (down.delete(e.pointerId) && start && !start.moved && e.timeStamp - start.t < TAP_MS && down.size === 0) {
      on.tap(local(e));
    }
    if (down.size === 0) start = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      on.zoom(local(e as unknown as PointerEvent), Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
}
