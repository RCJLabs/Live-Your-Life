import type { Action, GameState } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { play, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { lifeEventOf } from '../events/records.ts';

// A full-only life event, as D138 gates one: its `when` asks for the unlock. Planted, with the
// rest of the pool taken out, at a rate that would bring it every few days.
const planted = { ...lifeEventOf(sliceSim().content, 'funeral'), rate: 100_000, when: { fact: 'edition.unlocked' } };
const sim = sliceSim({ ...PACK.records, 'life-event': { 'planted-full': planted } });

const drawn = (unlocked: boolean): number => {
  const game = sliceGame({ career: undefined, events: true, unlocked });
  let s: GameState = play(game, sim, game.init('full', sim), waitUntil(12)).state;
  let n = 0;
  for (let d = 0; d < 30; d++) {
    s = play(game, sim, s, { type: 'time/advance', days: 1 } as Action).state;
    while ((s.kernel.modes.at(-1) as { id: string }).id === 'life-event') {
      n++;
      s = play(game, sim, s, { type: 'event/choose', choice: planted.choices[0]?.id }).state;
    }
  }
  return n;
};

describe('a full-only record in the free year (M2.11, D138)', () => {
  it('is never drawn in a free life, and is in an unlocked one', () => {
    expect(drawn(false)).toBe(0);
    expect(drawn(true)).toBeGreaterThan(0);
  });
});
