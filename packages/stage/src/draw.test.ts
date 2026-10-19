import { describe, expect, it } from 'vitest';
import { fakeCanvas } from '../test/fakeCanvas.ts';
import { viewOf } from './camera.ts';
import { box } from './geom.ts';
import { BUILDING, CLOTH, HAIR, INSIDE, SHOES, SKIN } from './palette.ts';
import type { Look } from './person/look.ts';
import type { PoseKind } from './person/poses.ts';
import { orderPieces } from './sort.ts';
import { occludersOf, Stage } from './stage.ts';
import type { Actor, Building, Fixture, FixtureKind, Prop, PropKind, Scene } from './types.ts';

const KINDS: FixtureKind[] = [
  'stove',
  'fridge',
  'prep',
  'counter',
  'stool',
  'booth',
  'table',
  'chair',
  'bed',
  'nightstand',
  'couch',
  'tv',
  'rug',
  'kitchenette',
];
const PROPS: PropKind[] = ['lamp', 'tree', 'bench', 'pole-sign', 'patio-table', 'patio-chair', 'hydrant'];
const POSES: PoseKind[] = ['stand', 'walk', 'sit', 'eat', 'cook', 'argue', 'answer'];

// Every fixture once, in a row along a room 16 m wide, facing each of the four ways in turn.
const fixtures: Fixture[] = KINDS.map((kind, i) => ({
  id: kind === 'bed' ? 'the-bed' : `${kind}-${i}`,
  kind,
  x: 1 + i * 1.05,
  y: i % 2 === 0 ? 2 : 5,
  w: 0.9,
  d: 0.9,
  facing: (['n', 'e', 's', 'w'] as const)[i % 4] ?? 'n',
}));

const room: Building = {
  id: 'room',
  kind: 'diner',
  x0: 0,
  y0: 0,
  x1: 16,
  y1: 8,
  storeys: 1,
  storeyHeight: 4,
  facade: {
    wall: BUILDING.stucco,
    trim: BUILDING.chrome,
    roof: BUILDING.roof,
    bays: 0,
    ground: 'diner',
    litBits: 0x5555,
    sign: { text: 'DINER', color: BUILDING.sign, ink: BUILDING.dinerRed },
  },
  interior: { floor: 'checker', wall: INSIDE.dinerWall, fixtures, door: 12 },
};

const solidHouse: Building = {
  id: 'house',
  kind: 'apartment',
  x0: 18,
  y0: 0,
  x1: 26,
  y1: 9,
  storeys: 3,
  storeyHeight: 3,
  facade: {
    wall: BUILDING.brick,
    trim: BUILDING.cornice,
    roof: BUILDING.roof,
    bays: 3,
    ground: 'stoop',
    litBits: 0x3333,
  },
};

const props: Prop[] = PROPS.map((kind, i) => ({
  id: kind,
  kind,
  x: 2 + i * 3,
  y: 11,
  facing: i % 2 === 0 ? 's' : 'n',
  ...(kind === 'pole-sign' ? { sign: { text: 'EAT', color: BUILDING.dinerRed, ink: '#FFFDF5' } } : {}),
}));

const scene: Scene = {
  ground: {
    patches: [{ x0: -5, y0: -5, x1: 30, y1: 15, color: '#B5AE9E' }],
    marks: [{ x0: -5, y0: 13, x1: 30, y1: 13, width: 0.14, color: '#E3C66A', dash: [3, 3] }],
    curbs: [{ x0: -5, y0: 12, x1: 30, y1: 12.2, height: 0.14, color: '#D6D0C3' }],
  },
  buildings: [room, solidHouse],
  props,
  bounds: { x0: 0, y0: 0, x1: 26, y1: 14 },
};

const look = (i: number): Look => ({
  skin: SKIN[i % SKIN.length] as string,
  hair: HAIR[i % HAIR.length] as string,
  hairStyle: (['short', 'long', 'bun', 'bald'] as const)[i % 4] ?? 'short',
  top: CLOTH[i % CLOTH.length] as string,
  sleeve: i % 2 === 0 ? 'long' : 'short',
  bottom: CLOTH[(i + 3) % CLOTH.length] as string,
  shoe: SHOES[i % SHOES.length] as string,
  height: 1.6 + i * 0.04,
  build: 0.9 + i * 0.04,
  ...(i === 4 ? { cap: '#F7F5EF', apron: '#3A3A40' } : {}),
});

const actors = (t: number): Actor[] => [
  ...POSES.map((kind, i) => ({
    id: kind,
    look: look(i),
    x: 2 + i * 2,
    y: 6.8,
    z: 0,
    yaw: (i * Math.PI) / 3,
    pose: { kind, t, stride: (t * 0.7) % 1 },
    bubble: kind === 'argue' || kind === 'answer' ? ('argue' as const) : null,
  })),
  { id: 'sleeper', look: look(7), x: 0, y: 0, z: 0, yaw: 0, pose: { kind: 'lie', t }, bubble: 'sleep', bed: 'the-bed' },
  { id: 'indoors', look: look(8), x: 22, y: 4, z: 0, yaw: 0, pose: { kind: 'stand', t }, bubble: null },
];

const size = { width: 390, height: 844, dpr: 2 };

type Fakes = ReturnType<typeof fakeCanvas>;

/** A stage drawing into fakes: the frame's canvas, and the layers it keeps (still, night, glow). */
function fakeStage(cache = true) {
  const layers: Fakes[] = [];
  const stage = new Stage(
    scene,
    () => {
      const layer = fakeCanvas();
      layers.push(layer);
      return { canvas: layer.canvas as HTMLCanvasElement, ctx: layer.ctx };
    },
    { cache },
  );
  return { stage, layers };
}

const calls = (fakes: readonly Fakes[], name: string) => fakes.reduce((n, f) => n + (f.counts.get(name) ?? 0), 0);

function render(
  moment: { cut: boolean; dark: number; warm: number; t: number; bubbles: boolean },
  made = fakeStage(),
  camera = { cx: 12, cy: 6, u: 18 },
) {
  const main = fakeCanvas();
  const drawn = made.stage.render(
    main.ctx,
    viewOf(camera, size),
    size,
    {
      cut: moment.cut ? new Set(['room', 'house']) : new Set(),
      bubbles: moment.bubbles,
      dark: moment.dark,
      warm: moment.warm,
      time: moment.t,
    },
    actors(moment.t),
  );
  const [still, night] = made.layers as [Fakes, Fakes, Fakes];
  return { main, still, night, all: [main, ...made.layers], drawn };
}

describe('drawing a scene', () => {
  for (const [name, light] of [
    ['day', { dark: 0, warm: 0 }],
    ['dusk', { dark: 0.5, warm: 1 }],
    ['night', { dark: 1, warm: 0 }],
  ] as const) {
    for (const cut of [true, false]) {
      it(`draws every fixture, prop and pose with finite numbers: ${name}, walls ${cut ? 'cut' : 'whole'}`, () => {
        for (const cache of [true, false]) {
          for (const t of [0, 0.37, 1.9, 4.4]) {
            const { all } = render({ cut, ...light, t, bubbles: true }, fakeStage(cache));
            expect(calls(all, 'fill')).toBeGreaterThan(cut ? 300 : 150);
          }
        }
      });
    }
  }

  it('draws a sleeper inside the bed, and nobody inside a whole building', () => {
    const cut = render({ cut: true, dark: 0, warm: 0, t: 1, bubbles: true });
    // Everyone standing in the open is measured; the sleeper is drawn by the bed, not measured.
    expect([...cut.drawn.heights.keys()].sort()).toEqual(['answer', 'argue', 'cook', 'stand', 'walk']);
    // The house is in the cut set but has no interior, so it stays whole and hides who is in it.
    expect(cut.drawn.heights.has('indoors')).toBe(false);
    const whole = render({ cut: false, dark: 0, warm: 0, t: 1, bubbles: true });
    // The room is whole now, so everyone in it is hidden too.
    expect(whole.drawn.heights.size).toBe(0);
  });

  it('paints the signs, and lets the night through only where there is light', () => {
    const day = render({ cut: false, dark: 0, warm: 0, t: 1, bubbles: false });
    expect(day.still.texts).toContain('DINER');
    expect(day.still.texts).toContain('EAT');
    expect(day.night.counts.get('fillRect') ?? 0).toBe(0);
    // By day the frame copies the still picture; at night, the night and its glows too.
    expect(day.main.counts.get('drawImage')).toBe(1);
    const night = render({ cut: true, dark: 1, warm: 0, t: 1, bubbles: false });
    expect(night.night.counts.get('fillRect') ?? 0).toBeGreaterThan(3);
    expect(night.main.counts.get('drawImage')).toBe(3);
  });

  it('keeps the still picture while the camera and light hold, and repaints it when they change', () => {
    const made = fakeStage();
    const moment = { cut: true, dark: 0, warm: 0, t: 1, bubbles: true };
    const first = render(moment, made);
    const fills = first.still.counts.get('fill') ?? 0;
    expect(fills).toBeGreaterThan(200);
    const again = render({ ...moment, t: 1.5 }, made);
    // The people moved; the still picture was not touched.
    expect(again.still.counts.get('fill') ?? 0).toBe(fills);
    expect(again.drawn.pieces).toBeLessThan(first.drawn.pieces);
    render(moment, made, { cx: 12.5, cy: 6, u: 18 });
    expect(again.still.counts.get('fill') ?? 0).toBeGreaterThan(fills);
  });

  it('draws again over a person only the still pieces in front of all of them', () => {
    const order = orderPieces(
      Object.values({
        back: { box: box(0, 0, 0, 16, 0.15, 4), draw: () => {} },
        front: { box: box(0.15, 7.85, 0, 15.85, 8, 0.55), draw: () => {} },
        far: { box: box(30, 0, 0, 31, 1, 1), draw: () => {} },
      }),
    );
    const person = { box: box(4, 4, 0, 4.36, 4.36, 1.75), draw: () => {} };
    const front = occludersOf(order, person);
    // The cut-down front wall is in front; the back wall behind; the far box off to the side.
    expect(front.map((p) => p.box.y0)).toEqual([7.85]);
  });
});
