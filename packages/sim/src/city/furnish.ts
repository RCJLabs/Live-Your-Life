/**
 * A room's fixtures (M1.2), placed by its record's rules in the room's own frame, mirrored west for
 * east in the second flat of a pair; and where a person goes to use each, by its record. The
 * rules are the spike's (apps/game/src/spike/templates.ts), moved into content.
 */
import type { DrawKind, Facing, FixtureRecord, FixtureRule, PlaceActivity, Side, UsePose } from './interiorRecords.ts';
import type { RoomPlan } from './rooms.ts';

export interface UsePlan {
  /** Where a person stands to use it, or gets onto it from. */
  readonly x: number;
  readonly y: number;
  /** Which side of the fixture that is, by the compass. */
  readonly from: Facing;
  readonly serves: readonly PlaceActivity[];
  readonly pose: UsePose;
}

export interface FixturePlan {
  readonly id: string;
  readonly template: string;
  readonly draw: DrawKind;
  readonly room: string;
  /** The middle of its footprint, and its size along x and along y. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly d: number;
  readonly facing: Facing;
  readonly blocks: boolean;
  readonly use?: UsePlan;
}

const FORWARD: Readonly<Record<Facing, readonly [number, number]>> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const MIRROR_FACING: Readonly<Record<Facing, Facing>> = { n: 'n', s: 's', e: 'w', w: 'e' };
const MIRROR_SIDE: Readonly<Record<Side, Side>> = { front: 'front', back: 'back', left: 'right', right: 'left' };

/** The way from a fixture to someone using it from `side` of it, as it faces. */
function toward(facing: Facing, side: Side): readonly [number, number] {
  const [fx, fy] = FORWARD[facing];
  if (side === 'front') return [fx, fy];
  if (side === 'back') return [-fx, -fy];
  // Its right hand turns its forward a quarter clockwise, seen from above.
  if (side === 'right') return [-fy, fx];
  return [fy, -fx];
}

const compass = (dx: number, dy: number): Facing => (dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n');

/** Where across the room, from its west wall, each copy of a rule stands, and how wide it is there. */
function across(rule: FixtureRule, width: number, room: number): { x: number; width: number }[] {
  const from = (m: number) => (m >= 0 ? m : room + m);
  if (rule.span) {
    const a = from(rule.span.from);
    const b = from(rule.span.to);
    const every = rule.every;
    if (every === undefined) return [{ x: (a + b) / 2, width: b - a }];
    const count = Math.max(1, Math.floor((b - a) / every));
    return Array.from({ length: count }, (_, i) => ({ x: a + every * (i + 0.5), width }));
  }
  if (rule.x !== undefined) return [{ x: from(rule.x), width }];
  return [{ x: room * (rule.at ?? 0.5), width }];
}

function useOf(f: FixtureRecord, rule: FixtureRule, at: Omit<FixturePlan, 'use'>, mirror: boolean): UsePlan | null {
  if (!f.use) return null;
  const own = rule.side ?? f.use.side;
  const [dx, dy] = toward(at.facing, mirror ? MIRROR_SIDE[own] : own);
  const out = (dx !== 0 ? at.w : at.d) / 2 + f.use.gap;
  return { x: at.x + dx * out, y: at.y + dy * out, from: compass(dx, dy), serves: f.use.serves, pose: f.use.pose };
}

/** A room's fixtures in the block's metres, named `<prefix>/<room>/<name>`. */
export function furnish(
  room: RoomPlan,
  rules: readonly FixtureRule[],
  fixtures: ReadonlyMap<string, FixtureRecord>,
  prefix: string,
): FixturePlan[] {
  const { inner } = room;
  const width = inner.x1 - inner.x0;
  return rules.flatMap((rule, n) => {
    const f = fixtures.get(rule.fixture) as FixtureRecord;
    const depth = rule.depth ?? f.depth;
    const y = rule.line >= 0 ? inner.y0 + rule.line : inner.y1 + rule.line;
    const facing = room.mirror ? MIRROR_FACING[rule.facing] : rule.facing;
    const ns = facing === 'n' || facing === 's';
    const copies = across(rule, rule.width ?? f.width, width);
    return copies.map((c, i) => {
      const name = `${rule.id ?? `${rule.fixture}-${n}`}${copies.length > 1 ? `-${i}` : ''}`;
      const at = {
        id: `${prefix}/${room.id}/${name}`,
        template: rule.fixture,
        draw: f.draw,
        room: room.id,
        x: inner.x0 + (room.mirror ? width - c.x : c.x),
        y,
        w: ns ? c.width : depth,
        d: ns ? depth : c.width,
        facing,
        blocks: f.blocks,
      };
      const use = useOf(f, rule, at, room.mirror);
      return use ? { ...at, use } : at;
    });
  });
}
