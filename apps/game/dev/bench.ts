/** Where a frame's time goes (dev only): the ground alone, the still pieces, then everything. */
import { daylight, drawGround, Stage, viewOf } from '@lyl/stage';
import { actorsAt, castLooks } from '../src/spike/actors.ts';
import { makeBlock } from '../src/spike/block.ts';
import { frame } from '../src/spike/framing.ts';
import { DEFAULT_SEED } from '../src/spike/params.ts';

const block = makeBlock(DEFAULT_SEED);
const looks = castLooks(DEFAULT_SEED);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const layer = () => {
  const c = document.createElement('canvas');
  return { canvas: c, ctx: c.getContext('2d') as CanvasRenderingContext2D };
};
const cached = new Stage(block.scene, layer);
const stage = new Stage(block.scene, layer, { cache: false });
const size = { width: 390, height: 844, dpr: 2 };
const view = viewOf(frame(block, 'wide', 'diner', true, size, { top: 0, bottom: 0 }), size);
const cut = new Set(['diner', 'apartment']);
const time = (label: string, f: () => void, n = 60) => {
  f();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) f();
  return `${label}: ${((performance.now() - t0) / n).toFixed(2)} ms`;
};
const moment = (minute: number, actors: boolean) => () => {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const light = daylight(minute);
  stage.render(ctx, view, size, { cut, bubbles: true, ...light, time: 1 }, actors ? actorsAt(block, looks, 1) : []);
};
const kept = (minute: number) => () => {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const light = daylight(minute);
  cached.render(ctx, view, size, { cut, bubbles: true, ...light, time: 1 }, actorsAt(block, looks, 1));
};
const lines = [
  time('ground only', () => {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    drawGround(ctx, view, block.scene.ground);
  }),
  time('everything still, by day', moment(13 * 60, false)),
  time('everything, by day', moment(13 * 60, true)),
  time('everything, at night', moment(23 * 60, true)),
  time('kept still picture, by day', kept(13 * 60)),
  time('kept still picture, at night', kept(23 * 60)),
];
(document.getElementById('out') as HTMLElement).textContent = lines.join('\n');
