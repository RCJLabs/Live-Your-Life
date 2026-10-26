import type { Action, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { play, refusal, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { FREE_DAYS, YEAR_END } from './module.ts';

const sim = sliceSim();
const free = sliceGame({ career: undefined, unlocked: false });
const modeOf = (s: GameState) => (s.kernel.modes.at(-1) as { id: string }).id;
const advance = (days: number): Action => ({ type: 'time/advance', days }) as Action;

/** A free life on the evening before its 19th birthday. */
function eve(): GameState {
  const s = play(free, sim, free.init('edition', sim), advance(FREE_DAYS - 1)).state;
  return play(free, sim, s, waitUntil(22)).state;
}

describe('the free year and the unlock (M2.11, D137, D138)', () => {
  it('ends the free year on day 365 with the year-end mode, and tells it', () => {
    const s = eve();
    expect(modeOf(s)).toBe('world');
    expect(free.fact(s, 'edition.days-left', {}, sim)).toBe(1);
    const r = play(free, sim, s, waitUntil(7));
    expect(modeOf(r.state)).toBe(YEAR_END);
    expect(r.of('edition/year-ended')).toEqual([{ type: 'edition/year-ended', day: FREE_DAYS }]);
    expect(lineFor(sim.content, r.of('edition/year-ended')[0] as never, { you: 'Dana' }, DEFAULT_START)).toBe(
      'A year had passed since the first morning.',
    );
    // Nothing passes it but the unlock.
    expect(refusal(free, sim, r.state, waitUntil(12))).toBe('mode');
    expect(free.options(r.state, sim)).toEqual([]);
  });

  it('goes on from where it stopped once unlocked, and the year ends no more', () => {
    const ended = play(free, sim, eve(), waitUntil(7)).state;
    const tick = free.fact(ended, 'time.tick', {}, sim);
    const on = play(free, sim, ended, { type: 'edition/unlock' });
    expect(modeOf(on.state)).toBe('world');
    expect(free.fact(on.state, 'time.tick', {}, sim)).toBe(tick);
    expect(on.of('edition/unlocked')).toHaveLength(1);
    const later = play(free, sim, on.state, advance(30));
    expect(modeOf(later.state)).toBe('world');
    expect(refusal(free, sim, later.state, { type: 'edition/unlock' })).toBe('unlocked');
  });

  it('never stops a life unlocked at its start, as the page unlocks one on an unlocked device', () => {
    const s = play(free, sim, free.init('unlocked', sim), { type: 'edition/unlock' }, advance(FREE_DAYS + 30));
    expect(modeOf(s.state)).toBe('world');
    expect(s.of('edition/year-ended')).toEqual([]);
  });
});
