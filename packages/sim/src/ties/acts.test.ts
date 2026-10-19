import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, doing, play, signUp, sliceSim, TEST_COOK, testCook, tickOf, withCareer } from '../../test/slice.ts';
import { createLifeGame } from '../game.ts';
import { daysFrom, todayOf } from '../job/days.ts';
import type { JobSlice } from '../job/state.ts';
import { works } from './person.ts';
import type { Crew } from './records.ts';
import type { TiesSlice } from './state.ts';

// A shift event with a choice that leans on them and one they see, and the test cook drawing it every shift.
const lean = {
  name: 'A lean',
  tags: ['test'],
  weight: 1,
  prompt: 'A test with {name}.',
  choices: [
    { id: 'help', text: 'Help', outcome: { told: 'Helped.', act: 'helped' } },
    {
      id: 'ask',
      text: 'Ask {name}',
      odds: { base: 50, skill: 0, tired: 0, regard: 40 },
      outcome: { told: 'Yes.', act: 'leaned-on-them' },
      failure: { told: 'No.', standing: -2 },
    },
  ],
};
const cook = testCook({ events: { tags: ['test'], chance: 100 } });
const sim = sliceSim({ ...withCareer(cook), 'shift-event': { lean } });
const game = createLifeGame({ career: TEST_COOK });
const ties = (state: GameState) => state.ties as TiesSlice;

/** At the event of a shift on a day they work, or one they don't, with their regard set. */
function atEvent(seed: string, beside: boolean, regard = 50) {
  const start = game.init(seed, sim);
  const today = todayOf({ fact: (id) => game.fact(start, id, undefined, sim) });
  const who = ties(start).coworker;
  if (!who) throw new Error('nobody beside you');
  const day = daysFrom(1, 6).find((d) => works(who, cook.crew as Crew, today, d) === beside) as number;
  const signed = play(game, sim, start, signUp(day)).state;
  const event = (signed.job as JobSlice).signed[0]?.event as number;
  const there = play(game, sim, signed, advance(tickOf(day, 15))).state;
  const set = { ...there, ties: { ...ties(there), regard } };
  return { state: play(game, sim, set, doing('work', event)).state, day };
}

describe('acts in shift events (D42)', () => {
  it('are remembered by kind and move regard by their weight when they are beside you', () => {
    const { state, day } = atEvent('help', true);
    const [preview] = game.preview(state, [{ effect: 'shift-choice', event: 'lean', day, choice: 'help' }], sim);
    expect(preview?.outcome).toMatchObject({ act: 'helped' });
    const help = play(game, sim, state, { type: 'job/choose', choice: 'help' });
    expect(help.of('ties/remembered')).toEqual([{ type: 'ties/remembered', act: 'helped', regard: 60 }]);
    expect(ties(help.state).memory).toEqual([{ act: 'helped', day, times: 1 }]);
  });

  it('are not remembered on a shift without them', () => {
    const { state } = atEvent('alone', false);
    const help = play(game, sim, state, { type: 'job/choose', choice: 'help' });
    expect(help.of('ties/remembered')).toEqual([]);
    expect(ties(help.state)).toMatchObject({ regard: 50, memory: [] });
  });

  it('lean on their regard at the odds the preview shows', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const regard = [0, 30, 50, 75, 100][i % 5] as number;
      const { state, day } = atEvent(`ask-${i}`, true, regard);
      const effect = { effect: 'shift-choice', event: 'lean', day, choice: 'ask' };
      const shown = game.preview(state, [effect], sim)[0]?.chance as number;
      // 50, and 40 points of regard's distance from 50 in fifties, within 5 and 95.
      expect(shown).toBe(Math.min(95, Math.max(5, 50 + Math.floor((40 * (regard - 50)) / 50))));
      const ask = play(game, sim, state, { type: 'job/choose', choice: 'ask' });
      const rolled = ask.of('logic/rolled')[0];
      expect(rolled?.outcome === 0 ? rolled.chance : 100 - (rolled?.chance as number)).toBe(shown);
      const leaned = ask.of('ties/remembered').length === 1;
      expect(leaned).toBe(rolled?.outcome === 0);
      seen.add(shown);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([10, 34, 50, 70, 90]);
  });
});
