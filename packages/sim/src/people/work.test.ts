import type { Beat, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, sliceGame, sliceSim } from '../../test/slice.ts';
import { employersOf } from '../market/employers.ts';
import { HOME_DISTRICT } from '../market/module.ts';
import { postedIn } from '../market/openings.ts';
import { careerRoster, rosterWith } from './careers.ts';
import { type PeopleSlice, progress } from './module.ts';
import { LINKED, rosterOf } from './roster.ts';
import type { WorkSlice } from './work.ts';

const sim = sliceSim();
const N = 240;
const game = sliceGame({ people: N });
const DAYS = 26 * 7;

/** Half a year of a life a day at a time, every beat and every day's state kept. */
function halfYear(seed: string) {
  let state = game.init(seed, sim);
  const beats: Beat[] = [];
  const days: GameState[] = [state];
  for (let d = 0; d < DAYS; d++) {
    const r = play(game, sim, state, advance(24 * 60));
    beats.push(...r.beats);
    state = r.state;
    days.push(state);
  }
  return { state, beats, days };
}

describe('the tier-1 people leaving and taking jobs (M2.3, D74, open question 68)', () => {
  const pSeed = (s: GameState) => game.fact(s, 'people.seed', undefined, sim) as number;

  it('has someone leave a tier-1 workplace with every opening posted there, and fills them from those between jobs', () => {
    const { state, beats } = halfYear('leavers');
    const seed = pSeed(state);
    const base = rosterOf(seed, N);
    const workplaces = employersOf(sim.content, seed, base, HOME_DISTRICT).filter((e) => e.place >= 0);
    const posted = workplaces.flatMap((e) =>
      Array.from({ length: 30 }, (_, w) => postedIn(seed, e, w))
        .flat()
        .filter((o) => o.posted >= 1 && o.posted <= DAYS),
    );
    const left = beats.filter((b) => b.type === 'people-work/left');
    const joined = beats.filter((b) => b.type === 'people-work/joined');
    expect(left.length).toBe(posted.length);
    expect(left.length).toBeGreaterThan(5);
    expect(joined.length).toBeGreaterThan(0);
    // Where everyone is, replayed from the beats: a leaver was at the place, a joiner between jobs.
    const at = new Map<number, number>();
    const placeOf = (i: number) => at.get(i) ?? (base.people[i]?.work as number);
    for (const b of [...left, ...joined].sort((x, y) => beats.indexOf(x) - beats.indexOf(y))) {
      const i = b.person as number;
      expect(i).toBeGreaterThanOrEqual(LINKED.count);
      if (b.type === 'people-work/left') expect(placeOf(i)).toBe(b.place);
      else expect(placeOf(i)).toBe(-1);
      at.set(i, b.type === 'people-work/left' ? -1 : (b.place as number));
    }
    // The roster the shares plan from has them where the beats say, working only if placed.
    const w = state['people-work'] as WorkSlice;
    const r = rosterWith(sim.content, seed, N, w.moves, w.version);
    for (const [i, place] of at) {
      expect(r.people[i]?.work).toBe(place);
      expect(r.people[i]?.shift === null).toBe(place < 0);
    }
    expect(game.fact(state, 'people-work.between', undefined, sim)).toBe([...at.values()].filter((p) => p < 0).length);
    // Nobody else moved.
    const plain = careerRoster(sim.content, seed, N);
    r.people.forEach((p, i) => {
      if (!at.has(i)) expect(p).toBe(plain.people[i]);
    });
  });

  it('settles the people’s hours with the moves: someone between jobs lives a day off work', () => {
    const { days } = halfYear('settled');
    const seed = pSeed(days[0] as GameState);
    const per = N / 24;
    let checked = 0;
    for (let d = 1; d < days.length && checked < 5; d++) {
      const [a, b] = [days[d - 1] as GameState, days[d] as GameState];
      const w = a['people-work'] as WorkSlice;
      if (w.version === 0 || w.version !== (b['people-work'] as WorkSlice).version) continue;
      for (let k = 1; k < 24; k++) {
        const holds = w.moves.some((v, j) => j % 2 === 0 && Math.floor(v / per) === k);
        if (!holds) continue;
        const was = structuredClone(a[`people-${k}`]) as PeopleSlice;
        const now = b[`people-${k}`] as PeopleSlice;
        const city = { seed, n: N };
        const moved = structuredClone(was);
        progress(city, moved, was.hour, now.hour, 0, undefined, rosterWith(sim.content, seed, N, w.moves, w.version));
        const plain = structuredClone(was);
        progress(city, plain, was.hour, now.hour, 0, undefined, careerRoster(sim.content, seed, N));
        if (JSON.stringify(moved.levels) === JSON.stringify(plain.levels)) continue;
        expect(now.levels).toEqual(moved.levels);
        checked++;
      }
    }
    expect(checked, 'days where the moves made a difference').toBeGreaterThan(0);
  });

  it('leaves an opening you took to you: nobody between jobs fills it', () => {
    const { state, beats } = halfYear('taken');
    const joined = beats.filter((b) => b.type === 'people-work/joined');
    expect(joined.length).toBeGreaterThan(0);
    const first = joined[0] as Beat;
    // The same life, with that opening marked as yours from the start.
    const mine = (s: GameState) =>
      ({ ...s, 'people-work': { ...(s['people-work'] as WorkSlice), taken: [first.opening as string] } }) as GameState;
    let s = mine(game.init('taken', sim));
    const again: Beat[] = [];
    for (let d = 0; d < DAYS; d++) {
      const r = play(game, sim, s, advance(24 * 60));
      again.push(...r.beats);
      s = r.state;
    }
    expect(again.some((b) => b.type === 'people-work/joined' && b.opening === first.opening)).toBe(false);
  });
});
