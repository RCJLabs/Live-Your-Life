import type { Action, Beat, GameState } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { doing, play, sliceGame, sliceSim, waitUntil } from '../../test/slice.ts';
import { DEFAULT_START, WEEKDAYS } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { type HourKind, placeOf } from '../people/day.ts';
import { planAt } from '../people/gather.ts';
import { LINKED, type Person, type Roster } from '../people/roster.ts';
import { presentAt, rosterNow } from './meet.ts';
import { populationOf } from './records.ts';
import type { CircleSlice } from './state.ts';

// Without illness: the tests' long skips leave you unfed, and a flu on top would put you in hospital.
const sim = sliceSim({ ...PACK.records, illness: {} });
const game = sliceGame({ people: 1000 });
const kept = populationOf(sim.content).ties.kept;

const circle = (state: GameState): CircleSlice => (state as unknown as { circle: CircleSlice }).circle;
const haunts = (state: GameState): number[] =>
  game
    .options(state, sim)
    .filter((a) => a.type === 'circle/go-out')
    .map((a) => a.place as number);

/** An evening out: to a haunt at 20:00, three hours there. */
function evening(state: GameState, place: number): { state: GameState; beats: Beat[] } {
  return play(game, sim, state, waitUntil(20), { type: 'circle/go-out', place }, doing('socialize', 180));
}

describe('meeting the people (M2.6, D89)', () => {
  it('offers a few third places to go out to, and refuses any other', () => {
    const start = game.init('circle-haunts', sim);
    const places = haunts(start);
    expect(places.length).toBe(populationOf(sim.content).ties.haunts);
    expect(new Set(places).size).toBe(places.length);
    expect(game.reduce(start, { type: 'circle/go-out', place: 0 }, sim).accepted).toBe(false);
  });

  it('meets people at your third place in the evening, names them in the chronicle, and keeps you there until you leave', () => {
    let met = 0;
    for (let i = 0; i < 6; i++) {
      const start = game.init(`circle-out-${i}`, sim);
      const { state, beats } = evening(start, haunts(start)[0] as number);
      const meetings = beats.filter((b) => b.type === 'circle/met');
      met += meetings.length;
      for (const b of meetings) {
        expect(lineFor(sim.content, b, { you: 'Dana Kowalski' }, DEFAULT_START)).toMatch(
          /^Dana Kowalski met [A-Z]\w+ [A-Z]\w+\.$/,
        );
        expect(b.person as number).toBeGreaterThanOrEqual(LINKED.count);
      }
      expect(circle(state).ties.length).toBe(meetings.length);
      // Still there after the evening, until you walk home or do something else.
      const place = haunts(start)[0] as number;
      expect(game.fact(state, 'circle.out', {}, sim)).toBe(place);
      const home = game.reduce(state, { type: 'circle/home' }, sim);
      expect(home.accepted).toBe(true);
      expect(game.fact(home.state, 'circle.out', {}, sim)).toBe(-1);
      const slept = play(game, sim, state, doing('sleep', 60)).state;
      expect(game.fact(slept, 'circle.out', {}, sim)).toBe(-1);
    }
    expect(met).toBeGreaterThan(0);
  });

  it('meets nobody new socialising without going out, even while the street is full', () => {
    for (let i = 0; i < 4; i++) {
      const start = game.init(`circle-in-${i}`, sim);
      // From 05:30, through the hour before the day shifts, when people are out on the way to work.
      const { state } = play(
        game,
        sim,
        start,
        waitUntil(5, 30),
        doing('socialize', 180),
        waitUntil(20),
        doing('socialize', 180),
      );
      expect(circle(state).ties).toEqual([]);
    }
  });

  it('never puts the coworker, the fence or the supplier among those met', () => {
    const state = game.init('circle-linked', sim);
    const roster = rosterNow({
      fact: (id: string) => game.fact(state, id, {}, sim),
      content: sim.content,
    } as never) as Roster;
    const seed = game.fact(state, 'people.seed', {}, sim) as number;
    let out = 0;
    for (let hour = 0; hour < 24 * 14; hour++) {
      const plan = planAt(roster, seed, hour, Math.floor(hour / 24) % 7);
      for (let i = 0; i < LINKED.count; i++) {
        const p = roster.people[i] as Person;
        const at = placeOf(p, (plan.kinds[i] as HourKind).at);
        if (at < roster.firstShared) continue;
        out++;
        expect(presentAt(roster, seed, hour, Math.floor(hour / 24) % 7, at)).not.toContain(i);
      }
    }
    expect(out).toBeGreaterThan(0);
  });

  it('keeps no more than its ties, and grows familiarity with those met again', () => {
    let state = game.init('circle-many', sim);
    const places = haunts(state);
    for (let night = 0; night < 30; night++) {
      state = evening(state, places[night % places.length] as number).state;
      expect(circle(state).ties.length).toBeLessThanOrEqual(kept);
    }
    expect(circle(state).ties.length).toBe(kept);
    const best = circle(state).ties.reduce((a, b) => (b.together > a.together ? b : a));
    expect(best.together).toBeGreaterThan(60);
    expect(game.fact(state, 'circle.familiarity', { person: best.person }, sim)).toBeGreaterThan(0);
  });

  it('meets the same people for the same seed', () => {
    const run = () => {
      const start = game.init('circle-same', sim);
      return circle(evening(start, haunts(start)[1] as number).state).ties;
    };
    expect(run()).toEqual(run());
  });

  it('meets the people on with you at a tier-1 workplace, counted at half', () => {
    let state = game.init('circle-work', sim);
    const shift = game.options(state, sim).find((a) => a.type === 'job/sign-up') as Action;
    state = play(game, sim, state, shift).state;
    state = play(game, sim, state, {
      type: 'time/advance',
      minutes: game.fact(state, 'job.next-shift-in', {}, sim) as number,
    }).state;
    // Working at a tier-1 workplace, the market's employer set by hand as hiring there would: the
    // one with most people on at the shift's first hour.
    const roster = rosterNow({
      fact: (id: string) => game.fact(state, id, {}, sim),
      content: sim.content,
    } as never) as Roster;
    const seed = game.fact(state, 'people.seed', {}, sim) as number;
    const hour = Math.floor(
      ((game.fact(state, 'time.day', {}, sim) as number) * 1440 +
        (game.fact(state, 'time.of-day', {}, sim) as number)) /
        60,
    );
    const weekday = WEEKDAYS.indexOf(game.fact(state, 'time.weekday', {}, sim) as (typeof WEEKDAYS)[number]);
    let place = -1;
    let most = 0;
    for (let w = roster.firstShared; w < roster.firstThird; w++) {
      const here = presentAt(roster, seed, hour, weekday, w).length;
      if (here > most) [place, most] = [w, here];
    }
    expect(most).toBeGreaterThan(0);
    const market = (state as unknown as { market: object }).market;
    state = { ...state, market: { ...market, employer: `w${place}` } } as unknown as GameState;
    expect(game.fact(state, 'market.place', {}, sim)).toBe(place);
    state = play(game, sim, state, doing('work', game.fact(state, 'job.shift-left', {}, sim) as number)).state;
    expect(circle(state).ties.length).toBeGreaterThan(0);
    // Half of each hour counts (Hall: time at work counts for less).
    const together = circle(state).ties.map((t) => t.together);
    expect(Math.min(...together)).toBeLessThanOrEqual(30);
    expect(Math.max(...together)).toBeLessThanOrEqual(30 * 9);
  });
});
