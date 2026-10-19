import { fnv1a64 } from '@eb/core';
import { daylight, Stage, viewOf } from '@lyl/stage';
import { fakeCanvas } from '@lyl/stage/testing';
import { describe, expect, it } from 'vitest';
import { actorsAt, castLooks } from './actors.ts';
import { makeBlock } from './block.ts';
import { frame } from './framing.ts';
import { DEFAULT_SEED } from './params.ts';

/**
 * D33: the page stays exactly M0.3's art spike until its gates are taken, so the phone reading
 * and the stranger test still measure what they were written for. These hashes are every call
 * the spike's drawing makes, recorded before M1.1 changed the stage. A change to how the spike
 * draws fails here; when one is meant (once D33 lifts), take the new hashes from the failure.
 */
const GOLDEN: Readonly<Record<string, string>> = {
  'block day': '2e73755efb4374a1',
  'block dusk': '89eb238bf72d6f2b',
  'block night': '5194f027648f858d',
  'close day': '1c690d7bbffd1a32',
  'close dusk': '9363046e345865da',
  'close night': '312468c861fd77fe',
  'wide day': '14f8265651e01f23',
  'wide dusk': '3e7add2bbe0b2a8f',
  'wide night': '40e2db5e9b324d87',
};

const block = makeBlock(DEFAULT_SEED);
const looks = castLooks(DEFAULT_SEED);
const phone = { width: 390, height: 844 };

function drawn(framing: 'wide' | 'close' | 'block', minute: number): string {
  const log: string[] = [];
  for (const cut of [false, true]) {
    for (const t of [0, 2.3]) {
      const main = fakeCanvas(780, 1688, log);
      const stage = new Stage(block.scene, () => {
        const layer = fakeCanvas(780, 1688, log);
        return { canvas: layer.canvas as HTMLCanvasElement, ctx: layer.ctx };
      });
      const camera = frame(block, framing, 'diner', cut, phone, { top: 0, bottom: 0 });
      stage.render(
        main.ctx,
        viewOf(camera, phone),
        { ...phone, dpr: 2 },
        { cut: cut ? new Set(['diner', 'apartment']) : new Set(), bubbles: true, ...daylight(minute), time: t },
        actorsAt(block, looks, t),
      );
    }
  }
  return fnv1a64(log.join('\n'));
}

describe("the spike's drawing (D33)", () => {
  it('is what it was at M0.3, call for call, in every framing by day, at dusk and at night', () => {
    const now: Record<string, string> = {};
    for (const framing of ['wide', 'close', 'block'] as const) {
      for (const [when, minute] of [
        ['day', 13 * 60],
        ['dusk', 20 * 60 + 50],
        ['night', 23 * 60],
      ] as const) {
        now[`${framing} ${when}`] = drawn(framing, minute);
      }
    }
    expect(now).toEqual(GOLDEN);
  });
});
