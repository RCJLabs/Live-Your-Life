import { daylight, Stage, viewOf } from '@lyl/stage';
import { fakeCanvas } from '@lyl/stage/testing';
import { describe, expect, it } from 'vitest';
import { actorsAt, castLooks } from './actors.ts';
import { makeBlock } from './block.ts';
import { frame } from './framing.ts';
import { DEFAULT_SEED } from './params.ts';

const block = makeBlock(DEFAULT_SEED);
const looks = castLooks(DEFAULT_SEED);
const phone = { width: 390, height: 844 };
const none = { top: 0, bottom: 0 };

function draw(framing: 'wide' | 'close' | 'block', minute: number, cut: boolean, t: number) {
  const main = fakeCanvas();
  const stage = new Stage(block.scene, () => {
    const layer = fakeCanvas();
    return { canvas: layer.canvas as HTMLCanvasElement, ctx: layer.ctx };
  });
  const camera = frame(block, framing, 'diner', cut, phone, none);
  const light = daylight(minute);
  return stage.render(
    main.ctx,
    viewOf(camera, phone),
    { ...phone, dpr: 2 },
    { cut: cut ? new Set(['diner', 'apartment']) : new Set(), bubbles: true, ...light, time: t },
    actorsAt(block, looks, t),
  );
}

describe('the spike, drawn', () => {
  it('draws every framing, by day, at dusk and at night, walls cut and whole, with finite numbers', () => {
    for (const framing of ['wide', 'close', 'block'] as const) {
      for (const minute of [13 * 60, 20 * 60 + 50, 23 * 60]) {
        for (const cut of [true, false]) {
          for (const t of [0, 2.3, 7.9]) expect(draw(framing, minute, cut, t).pieces).toBeGreaterThan(20);
        }
      }
    }
  });

  it('shows the cook only with the walls down, and the people outside either way', () => {
    expect(draw('wide', 13 * 60, true, 1).heights.has('cook')).toBe(true);
    expect(draw('wide', 13 * 60, false, 1).heights.has('cook')).toBe(false);
    for (const cut of [true, false]) {
      for (const role of ['arguer', 'answerer', 'walker'])
        expect(draw('wide', 13 * 60, cut, 1).heights.has(role)).toBe(true);
    }
  });

  it('draws people 15 to 45 px tall in the wide framing on a 390 px phone, and larger close up', () => {
    const wide = [...draw('wide', 13 * 60, true, 1).heights.values()];
    const close = [...draw('close', 13 * 60, true, 1).heights.values()];
    for (const h of wide) {
      expect(h).toBeGreaterThan(15);
      expect(h).toBeLessThan(45);
    }
    expect(Math.max(...close)).toBeGreaterThan(Math.max(...wide) * 1.4);
  });
});
