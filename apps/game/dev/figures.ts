/**
 * The character sheet (dev only, never built): every pose at eight facings and two zooms, to
 * check the rig by eye. Dirtbag keeps the same page (`app/src/dev/figures.ts`).
 */
import { CLOTH, drawPerson, HAIR, type Look, type PoseKind, rig, SHOES, SKIN, type View } from '@lyl/stage';

const POSES: PoseKind[] = ['stand', 'walk', 'sit', 'eat', 'cook', 'argue', 'answer', 'lie'];
const LOOKS: Look[] = [
  {
    skin: SKIN[1],
    hair: HAIR[1],
    hairStyle: 'short',
    top: CLOTH[0],
    sleeve: 'long',
    bottom: CLOTH[9],
    shoe: SHOES[0],
    height: 1.78,
    build: 1.05,
  },
  {
    skin: SKIN[4],
    hair: HAIR[0],
    hairStyle: 'long',
    top: CLOTH[3],
    sleeve: 'short',
    bottom: CLOTH[6],
    shoe: SHOES[2],
    height: 1.66,
    build: 0.92,
  },
  {
    skin: SKIN[2],
    hair: HAIR[3],
    hairStyle: 'bun',
    top: CLOTH[11],
    sleeve: 'long',
    bottom: CLOTH[6],
    shoe: SHOES[0],
    height: 1.72,
    build: 1.0,
    cap: '#F7F5EF',
    apron: '#3A3A40',
  },
];
const params = new URLSearchParams(location.search);
const u = Number(params.get('u') ?? 28);
const cell = { w: u * 2.2, h: u * 3.2 };
const canvas = document.getElementById('sheet') as HTMLCanvasElement;
const dpr = Math.min(2, window.devicePixelRatio || 1);
const cols = 8;
const width = cell.w * cols + 20;
const height = cell.h * POSES.length * LOOKS.length + 20;
canvas.width = width * dpr;
canvas.height = height * dpr;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
ctx.scale(dpr, dpr);
const t = Number(params.get('t') ?? 0.8);
POSES.forEach((kind, row) => {
  LOOKS.forEach((look, li) => {
    for (let col = 0; col < cols; col++) {
      const yaw = (col * Math.PI) / 4;
      const cx = 10 + cell.w * (col + 0.5);
      const cy = 10 + cell.h * (row * LOOKS.length + li + 0.82);
      const view: View = { u, ox: cx, oy: cy, width, height };
      const sk = rig(look, { kind, t, stride: (t * 0.9) % 1 }, { x: 0, y: 0, z: 0, yaw });
      drawPerson(ctx, view, sk, look, Math.min(1.8, Math.max(0.75, 0.035 * Math.SQRT2 * u)));
    }
  });
});
