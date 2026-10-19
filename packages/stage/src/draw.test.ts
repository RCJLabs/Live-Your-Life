import { describe, expect, it } from 'vitest';
import { fakeCanvas } from '../test/fakeCanvas.ts';
import { viewOf } from './camera.ts';
import { BUILDING, CLOTH, HAIR, INSIDE, SHOES, SKIN } from './palette.ts';
import type { Look } from './person/look.ts';
import type { PoseKind } from './person/poses.ts';
import { Stage } from './stage.ts';
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

function render(moment: { cut: boolean; dark: number; warm: number; t: number; bubbles: boolean }) {
  const main = fakeCanvas();
  const layer = fakeCanvas();
  const stage = new Stage(scene, { canvas: layer.canvas as HTMLCanvasElement, ctx: layer.ctx });
  const view = viewOf({ cx: 12, cy: 6, u: 18 }, size);
  const drawn = stage.render(
    main.ctx,
    view,
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
  return { main, layer, drawn };
}

describe('drawing a scene', () => {
  for (const [name, light] of [
    ['day', { dark: 0, warm: 0 }],
    ['dusk', { dark: 0.5, warm: 1 }],
    ['night', { dark: 1, warm: 0 }],
  ] as const) {
    for (const cut of [true, false]) {
      it(`draws every fixture, prop and pose with finite numbers: ${name}, walls ${cut ? 'cut' : 'whole'}`, () => {
        for (const t of [0, 0.37, 1.9, 4.4]) {
          const { main } = render({ cut, ...light, t, bubbles: true });
          expect(main.counts.get('fill') ?? 0).toBeGreaterThan(cut ? 300 : 150);
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
    expect(day.main.texts).toContain('DINER');
    expect(day.main.texts).toContain('EAT');
    expect(day.layer.counts.get('fillRect') ?? 0).toBe(0);
    const night = render({ cut: true, dark: 1, warm: 0, t: 1, bubbles: false });
    expect(night.layer.counts.get('fillRect') ?? 0).toBeGreaterThan(3);
    expect(night.main.counts.get('drawImage')).toBe(1);
  });
});
