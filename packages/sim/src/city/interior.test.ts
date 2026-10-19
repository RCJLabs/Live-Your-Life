import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRecordStore, Rng } from '@eb/core';
import { contentStore, PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { ACTIVITIES } from '../needs.ts';
import { type BlockPlan, planBlock } from './block.ts';
import { planInterior } from './interior.ts';
import { interiorProblems } from './interiorCheck.ts';
import type { FixtureRecord, InteriorRecord, InteriorTemplates, RoomPlacement, RoomRecord } from './interiorRecords.ts';
import { blockTemplates } from './records.ts';
import { frameOf, OUTSIDE, roomAt, WALL } from './rooms.ts';
import { CELL, cellAt, centreOf, doorStep, reach, useCell, walkGrid } from './walk.ts';

const templates = blockTemplates(contentStore(), 'slice');
const SEEDS = Array.from({ length: 1000 }, (_, i) => `interior-${i}`);
const PLANS = SEEDS.map((seed) => planBlock(templates, seed));

/** Every interior rule a block breaks, and every place of use a walker can't reach from the street. */
function broken(plan: BlockPlan): string[] {
  const grid = walkGrid(plan);
  const seen = reach(grid, cellAt(grid, plan.street.xa + 0.75, plan.street.lotFront + 1.25));
  const out: string[] = [];
  for (const b of plan.buildings) {
    if (!b.interior) continue;
    for (const p of interiorProblems(b.interior, frameOf(b))) out.push(`${plan.seed}: ${b.id}: ${p}`);
    for (const f of b.interior.fixtures) {
      if (!f.use) continue;
      const cell = useCell(grid, b.interior, f);
      if (cell < 0 || seen[cell] !== 1) {
        out.push(`${plan.seed}: nobody can walk to ${f.id}`);
        continue;
      }
      // The cell a walk ends in is on the side the fixture is used from, in its room.
      const c = centreOf(grid, cell);
      const edge = { n: f.y - f.d / 2, s: f.y + f.d / 2, w: f.x - f.w / 2, e: f.x + f.w / 2 }[f.use.from];
      const past = { n: c.y < edge, s: c.y > edge, w: c.x < edge, e: c.x > edge }[f.use.from];
      if (!past || roomAt(b.interior.rooms, c.x, c.y)?.id !== f.room)
        out.push(`${plan.seed}: ${f.id} used from the wrong side`);
    }
  }
  return out;
}

describe("the slice's interiors", () => {
  it('keep every rule, with every place of use walkable from the street, in 1,000 blocks', { timeout: 60_000 }, () => {
    expect(PLANS.flatMap(broken)).toEqual([]);
  });

  it('are a walk-up of two studios off a stair hall, and a diner with a back room and a way out the back', () => {
    for (const plan of PLANS.slice(0, 100)) {
      const home = plan.buildings.find((b) => b.template === 'apartment')?.interior;
      const diner = plan.buildings.find((b) => b.template === 'diner')?.interior;
      expect(home?.doors[0]?.rooms).toEqual(['hall', OUTSIDE]);
      expect(home?.units.map((u) => u.needs)).toEqual([
        ['sleep', 'eat', 'wash', 'relax'],
        ['sleep', 'eat', 'wash', 'relax'],
      ]);
      expect(diner?.doors[0]?.rooms).toEqual(['dining', OUTSIDE]);
      expect(diner?.units.map((u) => u.needs)).toEqual([['work', 'eat']]);
      expect(diner?.doors.filter((d) => d.wall === 'n').map((d) => d.room)).toEqual(['back']);
      expect(diner?.fixtures.find((f) => f.id === 'diner/dining/griddle')?.use?.serves).toEqual(['work']);
    }
  });

  it('let the back door out to the yard and the alley', () => {
    for (const plan of PLANS.slice(0, 200)) {
      const diner = plan.buildings.find((b) => b.template === 'diner');
      const out = diner?.interior?.doors.find((d) => d.wall === 'n');
      if (!diner || !out) throw new Error('no diner, or no back door');
      const grid = walkGrid(plan);
      const seen = reach(grid, cellAt(grid, doorStep(diner).x, doorStep(diner).y));
      expect(seen[cellAt(grid, out.x, diner.y0 - CELL / 2)]).toBe(1);
      expect(seen[cellAt(grid, out.x, plan.street.alley + 1)]).toBe(1);
    }
  });

  it('are the same for the same seed', () => {
    const a = planBlock(templates, 'same').buildings.map((b) => b.interior);
    expect(planBlock(templates, 'same').buildings.map((b) => b.interior)).toEqual(a);
  });

  it("serve the needs' activities, and only those, as the fixture type lists them", () => {
    const type = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../content/types/fixture.json'), 'utf8'));
    expect(type.fields.use.fields.serves.of.values).toEqual(ACTIVITIES.filter((a) => a !== 'awake'));
  });
});

const box = { id: 'b', x0: 0, y0: 0, x1: 6 + 2 * WALL, y1: 4 + 2 * WALL, door: 1.5 };
const plain: RoomRecord = { name: 'Plain', floor: 'wood', walls: ['#E0E0E0'], fixtures: [] };
const whole = {
  west: { from: 'west', by: 0 },
  back: { from: 'back', by: 0 },
  front: { from: 'front', by: 0 },
} as const;
const sample = (interior: Omit<InteriorRecord, 'name'>, rooms: Record<string, RoomRecord> = { plain }) => {
  const t: InteriorTemplates = {
    interiors: new Map([['t', { name: 'T', ...interior }]]),
    rooms: new Map(Object.entries(rooms)),
    fixtures: new Map<string, FixtureRecord>([
      [
        'seat',
        {
          name: 'Seat',
          draw: 'chair',
          width: 0.5,
          depth: 0.5,
          blocks: true,
          use: { side: 'left', gap: 0.35, serves: ['eat'], pose: 'eat' },
        },
      ],
    ]),
  };
  return planInterior(t, 't', box, Rng.create('sample'));
};

describe('an interior', () => {
  it('puts a wall where two rooms meet, with the doorway cut out of it', () => {
    const inside = sample({
      rooms: [
        { id: 'a', room: 'plain', ...whole, east: { from: 'west', by: 3 } },
        { id: 'b', room: 'plain', ...whole, west: { from: 'west', by: 3 }, east: { from: 'east', by: 0 } },
      ],
      doors: [{ room: 'a', side: 'e', at: 0.5 }],
      units: [{ id: 'u', rooms: ['a', 'b'], needs: [] }],
    });
    const line = WALL + 3;
    const metres = (vs: number[]) => vs.map((v) => Number(v.toFixed(6)));
    expect(inside.walls.map((w) => metres([w.x0, w.x1, w.y0, w.y1]))).toEqual([
      metres([line - WALL / 2, line + WALL / 2, WALL, WALL + 2 - 0.45]),
      metres([line - WALL / 2, line + WALL / 2, WALL + 2 + 0.45, WALL + 4]),
    ]);
    expect(inside.doors.map((d) => d.rooms)).toEqual([
      ['a', OUTSIDE],
      ['a', 'b'],
    ]);
    expect(interiorProblems(inside, frameOf(box))).toEqual([]);
  });

  it('cuts a later room out of an earlier one, walled on its inner sides only', () => {
    const inside = sample({
      rooms: [
        { id: 'big', room: 'plain', ...whole, east: { from: 'east', by: 0 } },
        { id: 'nook', room: 'plain', ...whole, east: { from: 'west', by: 2 }, front: { from: 'back', by: 1.5 } },
      ],
      doors: [{ room: 'nook', side: 's', at: 0.5 }],
      units: [{ id: 'u', rooms: ['big', 'nook'], needs: [] }],
    });
    expect(roomAt(inside.rooms, 1, 1)?.id).toBe('nook');
    expect(roomAt(inside.rooms, 3, 1)?.id).toBe('big');
    expect(inside.walls).toHaveLength(3);
    expect(interiorProblems(inside, frameOf(box))).toEqual([]);
  });

  it('takes down the stretch of an earlier wall that a later room stands across', () => {
    const inside = sample({
      rooms: [
        { id: 'a', room: 'plain', ...whole, east: { from: 'west', by: 3 } },
        { id: 'b', room: 'plain', ...whole, west: { from: 'west', by: 3 }, east: { from: 'east', by: 0 } },
        {
          id: 'c',
          room: 'plain',
          west: { from: 'west', by: 2 },
          east: { from: 'west', by: 4 },
          back: { from: 'back', by: 0 },
          front: { from: 'back', by: 2 },
        },
      ],
      doors: [],
      units: [{ id: 'u', rooms: ['a', 'b', 'c'], needs: [] }],
    });
    const line = WALL + 3;
    // The north-south stretches on the line between a and b.
    const across = inside.walls.filter((w) => w.x1 - w.x0 < WALL + 1e-6 && Math.abs((w.x0 + w.x1) / 2 - line) < 1e-6);
    expect(across.map((w) => [Number(w.y0.toFixed(6)), Number(w.y1.toFixed(6))])).toEqual([[WALL + 2, WALL + 4]]);
  });

  it('mirrors a room west for east, its fixtures and the side they are used from', () => {
    const seat: RoomRecord = { ...plain, fixtures: [{ fixture: 'seat', facing: 'e', x: 0.5, line: 1 }] };
    const room: RoomPlacement = { id: 'r', room: 'seat', ...whole, east: { from: 'east', by: 0 } };
    const plainOne = sample({ rooms: [room], doors: [], units: [{ id: 'u', rooms: ['r'], needs: ['eat'] }] }, { seat });
    const mirrored = sample(
      { rooms: [{ ...room, mirror: true }], doors: [], units: [{ id: 'u', rooms: ['r'], needs: ['eat'] }] },
      { seat },
    );
    const [a, b] = [plainOne.fixtures[0], mirrored.fixtures[0]];
    expect(a?.x).toBeCloseTo(WALL + 0.5, 9);
    expect(b?.x).toBeCloseTo(WALL + 6 - 0.5, 9);
    expect([a?.facing, a?.use?.from, b?.facing, b?.use?.from]).toEqual(['e', 'n', 'w', 'n']);
  });

  it('names what it breaks: a door off its wall, fixtures overlapping or in a doorway, a need with no place', () => {
    const crowded: RoomRecord = {
      ...plain,
      fixtures: [
        { fixture: 'seat', facing: 'e', x: 1, line: 1 },
        { fixture: 'seat', facing: 'e', x: 1.2, line: 1.2 },
        { fixture: 'seat', facing: 's', x: 1.5, line: -0.4 },
      ],
    };
    const inside = sample(
      {
        rooms: [{ id: 'r', room: 'crowded', ...whole, east: { from: 'east', by: 0 } }],
        doors: [{ room: 'r', side: 'n', at: 0.99 }],
        units: [{ id: 'u', rooms: ['r'], needs: ['sleep'] }],
      },
      { crowded },
    );
    const problems = interiorProblems(inside, frameOf(box));
    expect(problems).toContain('the way out in r runs past the end of its wall');
    expect(problems).toContain('b/r/seat-0 and b/r/seat-1 overlap');
    expect(problems).toContain('b/r/seat-2 stands in front of a door in r');
    expect(problems).toContain('unit u has no place to sleep');
    const inward = {
      ...inside,
      fixtures: inside.fixtures.map((f) => (f.use ? { ...f, use: { ...f.use, x: f.x, y: f.y } } : f)),
    };
    expect(interiorProblems(inward, frameOf(box))).toContain('b/r/seat-0 is used from inside itself');
  });
});

describe('the interior records', () => {
  type Records = Record<string, Record<string, Record<string, unknown>>>;
  const tweaked = (change: (records: Records) => void) => {
    const records = JSON.parse(JSON.stringify(PACK.records)) as Records;
    change(records);
    return createRecordStore(records);
  };
  /** A record in the copy, or a failed test saying it is missing. */
  const record = (r: Records, type: string, id: string): Record<string, unknown> => {
    const found = r[type]?.[id];
    if (!found) throw new Error(`no ${type}/${id} in the pack`);
    return found;
  };
  const item = <T>(list: unknown, i: number): T => {
    const found = (list as T[])[i];
    if (found === undefined) throw new Error(`no item ${i}`);
    return found;
  };

  it('refuse a door, or a unit, naming a room the interior does not have', () => {
    const door = tweaked((r) => {
      (record(r, 'interior', 'diner').doors as unknown[])[0] = { room: 'cellar', side: 'n', at: 0.5 };
    });
    expect(() => blockTemplates(door, 'slice')).toThrow(/interior\/diner: a door is in room cellar/);
    const unit = tweaked((r) => {
      item<{ rooms: string[] }>(record(r, 'interior', 'diner').units, 0).rooms.push('cellar');
    });
    expect(() => blockTemplates(unit, 'slice')).toThrow(/unit diner names room cellar/);
  });

  it('refuse a fixture placed two ways, repeated with no span, or used from a side with no use', () => {
    const rule = (patch: Record<string, unknown>) =>
      tweaked((r) => {
        Object.assign(item<object>(record(r, 'room', 'studio').fixtures, 0), patch);
      });
    expect(() => blockTemplates(rule({ at: 0.5 }), 'slice')).toThrow(
      /kitchenette needs exactly one of x, at and span, not 2/,
    );
    expect(() => blockTemplates(rule({ every: 1 }), 'slice')).toThrow(/kitchenette repeats every 1 m with no span/);
    const tv = tweaked((r) => {
      Object.assign(item<object>(record(r, 'room', 'studio').fixtures, 8), { side: 'front' });
    });
    expect(() => blockTemplates(tv, 'slice')).toThrow(/tv has a side to use it from, but no use/);
  });

  it('refuse a room in two units', () => {
    const store = tweaked((r) => {
      item<{ rooms: string[] }>(record(r, 'interior', 'walk-up').units, 1).rooms.push('west');
    });
    expect(() => blockTemplates(store, 'slice')).toThrow(/room west is in two units/);
  });
});
