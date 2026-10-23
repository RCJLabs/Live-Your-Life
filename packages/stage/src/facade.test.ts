import { describe, expect, it } from 'vitest';
import { fakeCanvas } from '../test/fakeCanvas.ts';
import { leftFace, rightFace } from './box.ts';
import { drawFront, drawSide } from './facade.ts';
import { box } from './geom.ts';
import type { View } from './iso.ts';
import { BUILDING } from './palette.ts';
import type { Building, Facade, Frame } from './types.ts';

const view: View = { ox: 400, oy: 700, u: 24, width: 800, height: 800 };
const frameAt = (dark: number): Frame => ({
  dark,
  warm: 0,
  time: 0,
  lights: [],
  sleepers: new Map(),
  heads: new Map(),
  ink: 1,
});

const plain: Facade = {
  wall: BUILDING.brick,
  trim: BUILDING.cornice,
  roof: BUILDING.roof,
  bays: 3,
  ground: 'shop',
  litBits: 0x5a5a5a5a,
};

const building = (facade: Facade): Building => ({
  id: 'b',
  kind: 'storefront',
  x0: 0,
  y0: 0,
  x1: 9,
  y1: 9,
  storeys: 3,
  storeyHeight: 3.4,
  door: 6.5,
  facade,
});

/** Every call the front and side make, as one string: two facades that differ draw differently. */
function drawn(facade: Facade, dark = 0): string {
  const log: string[] = [];
  const { ctx } = fakeCanvas(800, 800, log);
  const b = building(facade);
  const whole = box(b.x0, b.y0, 0, b.x1, b.y1, b.storeys * b.storeyHeight + 0.25);
  drawFront(ctx, view, b, leftFace(whole), frameAt(dark));
  drawSide(ctx, view, b, rightFace(whole), frameAt(dark));
  return log.join('\n');
}

describe('the facade grammar', () => {
  const variants: [string, Partial<Facade>][] = [
    ['a pair of windows to a bay', { window: 'pair' }],
    ['a bracketed cornice', { cornice: 'bracketed' }],
    ['a parapet', { cornice: 'parapet' }],
    ['sills and lintels', { sills: true }],
    ['windows down the sides', { sides: 'windows' }],
    ['streaks and a patch', { wear: 1 }],
    ['boarded windows', { wear: 2 }],
    ['a sign over the shopfront', { sign: { text: 'GROCERY', color: BUILDING.sign, ink: '#2E5D3A' } }],
    ['a lobby', { ground: 'lobby' }],
  ];

  it.each(variants)('draws %s differently from the plain front, with finite numbers', (_, change) => {
    expect(drawn({ ...plain, ...change })).not.toBe(drawn(plain));
  });

  it('draws the plain front as M0.3 did when the grammar leaves a part out', () => {
    const spelled: Facade = { ...plain, window: 'single', cornice: 'band', sills: false, sides: 'party', wear: 0 };
    expect(drawn(spelled)).toBe(drawn(plain));
  });

  it('never lights a boarded window at night', () => {
    const lit = (facade: Facade) => {
      const frame = frameAt(1);
      const log: string[] = [];
      const b = building(facade);
      const whole = box(b.x0, b.y0, 0, b.x1, b.y1, b.storeys * b.storeyHeight + 0.25);
      drawFront(fakeCanvas(800, 800, log).ctx, view, b, leftFace(whole), frame);
      return frame.lights.length;
    };
    const all = { ...plain, litBits: 0x7fffffff };
    expect(lit({ ...all, wear: 2 })).toBeLessThan(lit(all));
  });

  it("cuts a lobby's sign over its doors, and lights the doors at night (M2.1)", () => {
    const sign = { text: 'COURTHOUSE', color: BUILDING.stone, ink: '#3A3631' };
    expect(drawn({ ...plain, ground: 'lobby', sign })).toContain('fillText(COURTHOUSE');
    const lights = (facade: Facade) => {
      const frame = frameAt(1);
      const b = building(facade);
      const whole = box(b.x0, b.y0, 0, b.x1, b.y1, b.storeys * b.storeyHeight + 0.25);
      drawFront(fakeCanvas(800, 800, []).ctx, view, b, leftFace(whole), frame);
      return frame.lights.length;
    };
    expect(lights({ ...plain, ground: 'lobby', litBits: 0 })).toBe(1);
  });

  it('puts a shop sign above an awning rather than behind it', () => {
    const sign = { text: 'GROCERY', color: BUILDING.sign, ink: '#2E5D3A' };
    // The text is drawn in the face's own frame: where it lands on the screen is the last
    // transform before it, whose sixth number is the screen y of the text's middle.
    const signY = (facade: Facade) => {
      const log = drawn(facade).split('\n');
      const text = log.findIndex((l) => l.startsWith('fillText(GROCERY'));
      const transform = log.slice(0, text).findLast((l) => l.startsWith('transform('));
      return Number(transform?.slice('transform('.length, -1).split(',')[5]);
    };
    // Higher on the screen is a smaller y: over an awning the board sits higher.
    const withAwning = signY({ ...plain, sign, awning: { color: '#2E5D3A', stripe: '#E8DCC2' } });
    expect(withAwning).toBeLessThan(signY({ ...plain, sign }));
  });
});
