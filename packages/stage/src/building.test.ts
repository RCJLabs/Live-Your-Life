import { describe, expect, it } from 'vitest';
import { buildingPieces, heightOf, SILL_CUT } from './building.ts';
import { BUILDING } from './palette.ts';
import type { Building } from './types.ts';

const shut: Building = {
  id: 'office',
  kind: 'office',
  x0: 0,
  y0: 0,
  x1: 20,
  y1: 18,
  storeys: 6,
  storeyHeight: 3.8,
  facade: { wall: BUILDING.brick, trim: BUILDING.cornice, roof: BUILDING.roof, bays: 5, ground: 'lobby', litBits: 0 },
};

describe('a building with no interior (D64)', () => {
  it('stands whole, and cut stands as a stub at its sills over its whole footprint', () => {
    const [whole] = buildingPieces(shut, false);
    expect(whole?.box.z1).toBe(heightOf(shut));
    const cut = buildingPieces(shut, true);
    expect(cut).toHaveLength(1);
    expect(cut[0]?.box).toEqual({ x0: 0, y0: 0, z0: 0, x1: 20, y1: 18, z1: SILL_CUT });
  });
});

describe('culling (M2.1)', () => {
  it('draws a piece on the screen or just off it, and skips one far off it', async () => {
    const { onScreen } = await import('./stage.ts');
    const view = { u: 24, ox: 200, oy: 400, width: 390, height: 844 };
    const size = { width: 390, height: 844, dpr: 2 };
    const [near] = buildingPieces(shut, false);
    const far = {
      ...(near as NonNullable<typeof near>),
      box: { ...shut, x0: 500, x1: 520, y0: 0, y1: 18, z0: 0, z1: 23 },
    };
    expect(onScreen(view, size, near as NonNullable<typeof near>)).toBe(true);
    expect(onScreen(view, size, far)).toBe(false);
  });
});
