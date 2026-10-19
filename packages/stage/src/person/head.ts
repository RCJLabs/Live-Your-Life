/**
 * The head at a 3/4 view: a disc of hair with the face's disc set toward wherever the face
 * points, clipped to the head, so a turn shows a face, a cheek or the back of the head. Faces
 * carry no expression at this size (docs/DESIGN.md, Presentation); the eyes appear only when
 * the head is big enough to hold them.
 */
import { add, dot, scale } from '../geom.ts';
import { nearness, project, TOWARD_CAMERA, type View } from '../iso.ts';
import { INK } from '../palette.ts';
import { capsule, disc, fillShape, inked, trace } from '../shape.ts';
import { BODY, type Look } from './look.ts';
import type { Skeleton } from './rig.ts';

/** The smallest head, in screen pixels of radius, that is given eyes. */
const EYES_FROM = 3.2;

export function drawHead(
  ctx: CanvasRenderingContext2D,
  view: View,
  sk: Skeleton,
  look: Look,
  ink: number,
  s: number,
): void {
  const r = BODY.head * sk.k;
  const rh = r * s;
  const c = project(view, sk.head);
  const facing = dot(sk.face, TOWARD_CAMERA);
  const hair = look.hairStyle === 'bald' ? look.skin : look.hair;
  const behind =
    look.hairStyle === 'long'
      ? [capsule(c, rh * 0.92, project(view, add(sk.head, scale(sk.up, -0.17 * sk.k))), rh * 0.8)]
      : [];
  const bun =
    look.hairStyle === 'bun'
      ? [disc(project(view, add(sk.head, add(scale(sk.up, 0.55 * r), scale(sk.face, -0.75 * r)))), rh * 0.45)]
      : [];
  inked(
    ctx,
    [...behind, ...bun, disc(c, rh)].map((shape) => ({ shape, fill: hair })),
    INK,
    ink,
  );
  if (look.hairStyle !== 'bald' && facing > -0.35) {
    // The face's disc, set toward where the face points and a little down from the hairline.
    const toward = project(view, add(sk.head, add(scale(sk.face, 0.5 * r), scale(sk.up, -0.12 * r))));
    ctx.save();
    trace(ctx, disc(c, rh));
    ctx.clip();
    fillShape(ctx, disc(toward, rh * 0.82), look.skin);
    ctx.restore();
  }
  if (rh >= EYES_FROM && facing > 0.15) {
    for (const side of [-1, 1]) {
      const eye = add(
        sk.head,
        add(scale(sk.face, 0.88 * r), add(scale(sk.right, side * 0.36 * r), scale(sk.up, 0.02 * r))),
      );
      if (nearness(eye) < nearness(sk.head)) continue;
      fillShape(ctx, disc(project(view, eye), Math.max(0.55, rh * 0.11)), INK);
    }
  }
  if (look.cap) {
    // A paper cap, front to back across the crown.
    const top = add(sk.head, scale(sk.up, 0.72 * r));
    const front = project(view, add(top, scale(sk.face, 0.55 * r)));
    const back = project(view, add(top, scale(sk.face, -0.6 * r)));
    inked(ctx, [{ shape: capsule(back, rh * 0.48, front, rh * 0.44), fill: look.cap }], INK, ink);
  }
}
