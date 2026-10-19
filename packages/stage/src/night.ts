/**
 * Night and the low sun. Dusk warms the whole picture; night lays the dark over it and lets
 * light through where it falls: lit windows, lamps' pools on the ground, lit rooms. Dirtbag
 * v0.956's night, the best-looking thing on its map, worked the same way: a dark layer with
 * holes cut at every light (docs/audit/world-ui.md).
 *
 * The dark and the lamps' glows are painted into layers of their own, which the stage keeps
 * until the camera or the dark changes, then laid over each frame.
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

/** The picture's size, in CSS pixels and device pixels per CSS pixel. */
export interface Size {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
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

/** Makes a layer the size of the picture, clear, drawing in CSS pixels. */
export function readyLayer(layer: Layer, size: Size): void {
  const w = Math.round(size.width * size.dpr);
  const h = Math.round(size.height * size.dpr);
  if (layer.canvas.width !== w || layer.canvas.height !== h) {
    layer.canvas.width = w;
    layer.canvas.height = h;
  }
  layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
  layer.ctx.globalCompositeOperation = 'source-over';
  layer.ctx.clearRect(0, 0, w, h);
  layer.ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
}

/** Paints the dark, cut where light falls, and the warm glows over lamps and signs. */
export function paintNight(night: Layer, glow: Layer, size: Size, dark: number, lights: readonly Light[]): void {
  readyLayer(night, size);
  night.ctx.fillStyle = css(rgb(NIGHT), DEEPEST * dark);
  night.ctx.fillRect(0, 0, size.width, size.height);
  night.ctx.globalCompositeOperation = 'destination-out';
  for (const light of lights) cutLight(night.ctx, light, dark);
  readyLayer(glow, size);
  for (const light of lights) {
    if (light.kind !== 'pool' || !light.glow) continue;
    const g = glow.ctx.createRadialGradient(light.at.x, light.at.y, 0, light.at.x, light.at.y, light.radius);
    g.addColorStop(0, `rgba(255,214,140,${(0.55 * dark).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,214,140,0)');
    glow.ctx.fillStyle = g;
    glow.ctx.fillRect(light.at.x - light.radius, light.at.y - light.radius, light.radius * 2, light.radius * 2);
  }
}

/** Lays the painted night over a frame, and adds its glows. */
export function compositeNight(ctx: CanvasRenderingContext2D, night: Layer, glow: Layer): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(night.canvas, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(glow.canvas, 0, 0);
  ctx.restore();
}

export function drawDusk(ctx: CanvasRenderingContext2D, size: Size, frame: Frame): void {
  if (frame.warm <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(255,178,120,${(0.42 * frame.warm).toFixed(3)})`;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.restore();
}
