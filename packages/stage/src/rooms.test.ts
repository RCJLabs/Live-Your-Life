import { describe, expect, it } from 'vitest';
import { fakeCanvas } from '../test/fakeCanvas.ts';
import { leftFace, litFor, rightFace } from './box.ts';
import { buildingPieces, CUT, WALL } from './building.ts';
import { fixturePiece } from './furniture.ts';
import { box } from './geom.ts';
import type { View } from './iso.ts';
import { BUILDING } from './palette.ts';
import { drawRoomFloor } from './rooms.ts';
import { hiding } from './stage.ts';
import type { Building, Facing, Fixture, FixtureKind, Frame } from './types.ts';

const view: View = { ox: 400, oy: 300, u: 30, width: 800, height: 800 };
const frame = (): Frame => ({ dark: 0, warm: 0, time: 1, lights: [], sleepers: new Map(), heads: new Map(), ink: 1 });
const FITTINGS: FixtureKind[] = ['shower', 'toilet', 'sink', 'dish', 'shelves', 'stairs', 'camera'];
const FACINGS: Facing[] = ['n', 'e', 's', 'w'];

/** Everything one fixture draws, call by call. */
function drawn(f: Fixture): string[] {
  const log: string[] = [];
  const { ctx } = fakeCanvas(800, 800, log);
  fixturePiece(f).draw(ctx, view, frame());
  return log;
}

const fixture = (kind: FixtureKind, facing: Facing): Fixture => {
  const [w, d] = kind === 'stairs' ? [1, 4.2] : kind === 'dish' ? [1.3, 0.65] : [0.9, 0.7];
  const ns = facing === 'n' || facing === 's';
  return { id: kind, kind, x: 4, y: 4, w: ns ? w : d, d: ns ? d : w, facing };
};

const ROOMS = [
  { x0: 0.15, y0: 0.15, x1: 3.15, y1: 7.85, floor: 'wood', wall: '#E8DFCC' },
  { x0: 0.15, y0: 0.15, x1: 2.15, y1: 2.15, floor: 'tile', wall: '#D9E2E8' },
  { x0: 3.15, y0: 0.15, x1: 7.85, y1: 7.85, floor: 'checker', wall: '#C9CDB8' },
] as const;

const house = (doors: NonNullable<Building['interior']>['doors'] = []): Building => ({
  id: 'house',
  kind: 'walk-up',
  x0: 0,
  y0: 0,
  x1: 8,
  y1: 8,
  storeys: 2,
  storeyHeight: 3,
  facade: { wall: BUILDING.brick, trim: BUILDING.cornice, roof: BUILDING.roof, bays: 2, ground: 'stoop', litBits: 0 },
  interior: {
    floor: 'wood',
    wall: '#E8DFCC',
    door: 5,
    fixtures: [],
    rooms: ROOMS,
    partitions: [
      { x0: 3.075, y0: 0.15, x1: 3.225, y1: 4, face: '#C9CDB8' },
      { x0: 3.075, y0: 4.9, x1: 3.225, y1: 7.85, face: '#C9CDB8' },
      { x0: 0.15, y0: 2.075, x1: 2.15, y1: 2.225, face: '#E8DFCC' },
    ],
    doors,
  },
});

describe("M1.2's fittings", () => {
  it('each draw, facing every way, with finite numbers, and each its own way', () => {
    const same = new Map<FixtureKind, string>();
    for (const kind of FITTINGS) {
      for (const facing of FACINGS) {
        const log = drawn(fixture(kind, facing));
        expect(log.filter((l) => l.startsWith('fill')).length, `${kind} facing ${facing}`).toBeGreaterThan(2);
      }
      // Drawn on one footprint, so only the drawing itself can tell them apart.
      same.set(kind, drawn({ id: kind, kind, x: 4, y: 4, w: 1, d: 1, facing: 'n' }).join('\n'));
    }
    expect(new Set(same.values()).size).toBe(FITTINGS.length);
  });

  it('turn with the way they face', () => {
    for (const kind of FITTINGS) {
      expect(drawn(fixture(kind, 'n')).join(), kind).not.toBe(drawn(fixture(kind, 'e')).join());
    }
  });

  it('stand as tall as they draw, for the depth sort', () => {
    expect(fixturePiece(fixture('stairs', 's')).box.z1).toBeGreaterThan(2.8);
    expect(fixturePiece(fixture('toilet', 's')).box.z1).toBeLessThan(1);
  });
});

describe('a cut-away building with rooms', () => {
  it("paints its far walls inside in each room's colour where the room meets them", () => {
    const b = house();
    const log: string[] = [];
    const { ctx } = fakeCanvas(800, 800, log);
    for (const p of buildingPieces(b, true)) p.draw(ctx, view, frame());
    const west = rightFace({ x0: 0, y0: 0, z0: 0, x1: WALL, y1: 8, z1: 3 });
    const north = leftFace({ x0: WALL, y0: 0, z0: 0, x1: 8 - WALL, y1: WALL, z1: 3 });
    const painted = log.join('\n');
    // The bathroom and the studio on the west wall; all three rooms on the north wall.
    for (const wall of ['#E8DFCC', '#D9E2E8']) expect(painted).toContain(litFor(wall, west.normal));
    for (const wall of ['#E8DFCC', '#D9E2E8', '#C9CDB8']) expect(painted).toContain(litFor(wall, north.normal));
  });

  it('cuts its inside walls low, like the near walls', () => {
    const b = house();
    const pieces = buildingPieces(b, true);
    for (const w of b.interior?.partitions ?? []) {
      const piece = pieces.find(
        (p) => p.box.x0 === w.x0 && p.box.y0 === w.y0 && p.box.x1 === w.x1 && p.box.y1 === w.y1,
      );
      expect(piece?.box.z1).toBe(CUT);
    }
  });

  it('opens a way out through a far wall under a lintel, and as a gap in a near one', () => {
    const plain = buildingPieces(house(), true);
    const back = buildingPieces(house([{ x: 6, y: WALL / 2, width: 0.9, wall: 'n' }]), true);
    // The north wall in two, either side of the opening, and the lintel over it.
    expect(back.length).toBe(plain.length + 2);
    const north = back.filter((p) => p.box.y0 === 0 && p.box.y1 === WALL && p.box.x0 >= WALL && p.box.x1 <= 8 - WALL);
    expect(north.map((p) => [p.box.x0, p.box.x1, p.box.z0])).toEqual([
      [WALL, 5.55, 0],
      [6.45, 8 - WALL, 0],
      [5.55, 6.45, 2.1],
    ]);
    const side = buildingPieces(house([{ x: 8 - WALL / 2, y: 4, width: 0.9, wall: 'e' }]), true);
    const east = side.filter((p) => p.box.x0 === 8 - WALL && p.box.z1 === CUT);
    expect(east.map((p) => [p.box.y0, p.box.y1])).toEqual([
      [WALL, 3.55],
      [4.45, 8],
    ]);
  });

  it("lays each room's floor, the later over the earlier, a tiled one with its grout", () => {
    const fills = (b: Building) => {
      const log: string[] = [];
      const { ctx } = fakeCanvas(800, 800, log);
      drawRoomFloor(ctx, view, b, frame());
      return log.filter((l) => l.startsWith('fill'));
    };
    const tiled = fills(house());
    const interior = house().interior;
    const rooms = interior?.rooms;
    if (!interior || !rooms) throw new Error('no rooms');
    const floored = (floor: 'wood' | 'checker') =>
      fills({ ...house(), interior: { ...interior, rooms: rooms.map((r) => ({ ...r, floor })) } });
    const boarded = floored('wood');
    // The bathroom's tile is neither the diner's checkerboard nor boards.
    const bath = (floor: 'wood' | 'checker') =>
      fills({
        ...house(),
        interior: { ...interior, rooms: rooms.map((r) => (r.floor === 'tile' ? { ...r, floor } : r)) },
      });
    expect(tiled.join()).not.toBe(bath('checker').join());
    expect(tiled.join()).not.toBe(bath('wood').join());
    // The bathroom's grout runs both ways every 30 cm; boards run one way every 60.
    expect(tiled.length).toBeGreaterThan(boarded.length + 6);
    const single = fills({ ...house(), interior: { ...interior, rooms: undefined } as never });
    expect(single.length).toBeLessThan(boarded.length);
  });
});

describe('who a building hides', () => {
  // A tower 8 m square and 9 m tall: the camera looks at it from the south-east, from above.
  const tower: Building = { ...house(), id: 'tower', x0: 10, y0: 0, x1: 18, y1: 8, storeys: 3, storeyHeight: 3 };
  const person = (x: number, y: number) => box(x - 0.18, y - 0.18, 0, x + 0.18, y + 0.18, 1.75);

  it('is someone just north-west of it, whose line of sight runs through it', () => {
    expect(hiding([tower], person(8, -1))).toEqual(['tower']);
    expect(hiding([tower], person(9, 4))).toEqual(['tower']);
  });

  it('is nobody in front of it, beside it out of its outline, or far behind it', () => {
    expect(hiding([tower], person(19, 9))).toEqual([]);
    expect(hiding([tower], person(14, 10))).toEqual([]);
    expect(hiding([tower], person(2, 12))).toEqual([]);
    expect(hiding([tower], person(-10, -10))).toEqual([]);
  });
});
