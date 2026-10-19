/**
 * Night and the low sun. Dusk warms the whole picture; night lays the dark over it and lets
 * light through where it falls: lit windows, lamps' pools on the ground, lit rooms. Dirtbag
 * v0.956's night, the best-looking thing on its map, worked the same way: a dark layer with
 * holes cut at every light (docs/audit/world-ui.md).
 */
import { css, rgb } from './color.ts';
import { NIGHT } from './palette.ts';
import { poly, trace } from './shape.ts';
import type { Frame, Light } from './types.ts';

/** How dark full night gets, at most: the picture under it must still read. */
const DEEPEST = 0.74;

export interface Layer {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

function cutLight(ctx: Layer['ctx'], light: Light, dark: number): void {
  if (light.kind === 'shape') {
    trace(ctx as CanvasRenderingContext2D, poly(light.points));
    ctx.fillStyle = `rgba(0,0,0,${(light.strength * dark).toFixed(3)})`;
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(light.at.x, light.at.y);
  if (light.flat) ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, light.radius);
  g.addColorStop(0, `rgba(0,0,0,${light.strength.toFixed(3)})`);
  g.addColorStop(0.55, `rgba(0,0,0,${(light.strength * 0.55).toFixed(3)})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-light.radius, -light.radius, light.radius * 2, light.radius * 2);
  ctx.restore();
}

/** The picture's size, in CSS pixels and device pixels per CSS pixel. */
export interface Size {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export function drawDusk(ctx: CanvasRenderingContext2D, size: Size, frame: Frame): void {
  if (frame.warm <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(255,178,120,${(0.42 * frame.warm).toFixed(3)})`;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.restore();
}

export function drawNight(ctx: CanvasRenderingContext2D, layer: Layer, size: Size, frame: Frame): void {
  if (frame.dark <= 0.01) return;
  const night = layer.ctx;
  const w = Math.round(size.width * size.dpr);
  const h = Math.round(size.height * size.dpr);
  if (layer.canvas.width !== w || layer.canvas.height !== h) {
    layer.canvas.width = w;
    layer.canvas.height = h;
  }
  night.setTransform(1, 0, 0, 1, 0, 0);
  night.globalCompositeOperation = 'source-over';
  night.clearRect(0, 0, w, h);
  night.fillStyle = css(rgb(NIGHT), DEEPEST * frame.dark);
  night.fillRect(0, 0, w, h);
  night.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  night.globalCompositeOperation = 'destination-out';
  for (const light of frame.lights) cutLight(night, light, frame.dark);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
  // Warm glows over the dark, where a lamp or a sign burns.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const light of frame.lights) {
    if (light.kind !== 'pool' || !light.glow) continue;
    const g = ctx.createRadialGradient(light.at.x, light.at.y, 0, light.at.x, light.at.y, light.radius);
    g.addColorStop(0, `rgba(255,214,140,${(0.55 * frame.dark).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(light.at.x - light.radius, light.at.y - light.radius, light.radius * 2, light.radius * 2);
  }
  ctx.restore();
}
