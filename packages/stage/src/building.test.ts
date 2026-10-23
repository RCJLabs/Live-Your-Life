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
