import { type GameState, stateHash } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_START } from '../calendar.ts';
import { lifeSim } from '../content.ts';
import { START_LEVELS } from '../dials.ts';
import { type Levels, NEEDS, settle } from '../needs.ts';
import { hourOf } from './day.ts';
import { createPeopleGame, type PeopleOptions, SHARES } from './game.ts';
import { type City, newShare, type PeopleSlice, progress, shareId } from './module.ts';
import { rosterOf } from './roster.ts';

const sim = lifeSim();
const SEED = 4242;
const START = DEFAULT_START.hour;

/** A game played an hour an action, as speed 1 plays it. */
function played(options: PeopleOptions, hours: number, seed = 'people') {
  const game = createPeopleGame(options);
  let state = game.init(seed, sim);
  for (let h = 0; h < hours; h++) state = game.reduce(state, { type: 'time/advance', hours: 1 }, sim).state;
  return { game, state, shares: sharesOf(state, options) };
}

const sharesOf = (state: GameState, { cadence }: PeopleOptions): PeopleSlice[] =>
  Array.from({ length: SHARES[cadence] }, (_, k) => state[shareId(k, SHARES[cadence])] as PeopleSlice);

const cityOf = (state: GameState): City => state.people as City;

const levelsOf = (slice: PeopleSlice, i: number): Levels =>
  Object.fromEntries(NEEDS.map((need, k) => [need, slice.levels[(i - slice.first) * NEEDS.length + k]])) as Levels;

describe("the people's needs", () => {
  it("settle as the player's do: every piece of every hour, one at a time", () => {
    const city = { seed: SEED, n: 200 };
    const slice = newShare(200);
    progress(city, slice, START, START + 72, 0);
    rosterOf(SEED, 200).people.forEach((p, i) => {
      let levels: Levels = { ...START_LEVELS };
      for (let hour = START; hour < START + 72; hour++) {
        const day = Math.floor(hour / 24);
        for (const [activity, minutes] of hourOf(p, SEED, i, day, day % 7, hour % 24).segments) {
          levels = settle(levels, activity, minutes);
        }
      }
      expect(levelsOf(slice, i)).toEqual(levels);
    });
  });

  it('come out the same settled three days at once as an hour at a time', () => {
    const city = { seed: SEED, n: 300 };
    const once = newShare(300);
    progress(city, once, START, START + 72, 3);
    const hourly = newShare(300);
    for (let hour = START; hour < START + 72; hour++) progress(city, hourly, hour, hour + 1, 3);
    expect(once).toEqual(hourly);
  });

  it('come out the same for each person whichever share holds them', () => {
    const city = { seed: SEED, n: 250 };
    const whole = newShare(250);
    progress(city, whole, START, START + 48, 1);
    const shares = Array.from({ length: 24 }, (_, k) => newShare(250, k, 24));
    for (const share of shares) progress(city, share, START, START + 48, 1);
    expect(shares.map((s) => s.count).reduce((a, b) => a + b, 0)).toBe(250);
    expect(shares.flatMap((s) => s.levels)).toEqual(whole.levels);
    expect(shares.flatMap((s) => s.ties)).toEqual(whole.ties);
  });

  it('come out the same moved on every hour as once a day', () => {
    const [byHour] = played({ n: 300, cadence: 'hour' }, 17 + 48).shares;
    const [byDay] = played({ n: 300, cadence: 'day' }, 17 + 48).shares;
    expect(byDay?.hour).toBe(24 * 3);
    expect(byHour).toEqual(byDay);
  });

  it('keep everyone well through a month on these templates', () => {
    const [share] = played({ n: 500, cadence: 'day' }, 24 * 30).shares as [PeopleSlice];
    for (let i = 0; i < 500; i++) expect(levelsOf(share, i).health).toBeGreaterThan(90 * 60_000);
  });
});

describe('the game', () => {
  it('starts at the start hour, and moves people on at each hour or each midnight', () => {
    const game = createPeopleGame({ n: 50, cadence: 'hour' });
    let state = game.init('people', sim);
    expect(game.fact(state, 'people-all.settled', undefined, sim)).toBe(-1);
    state = game.reduce(state, { type: 'time/advance', hours: 3 }, sim).state;
    expect(game.fact(state, 'people-all.settled', undefined, sim)).toBe(START + 3);
    expect(played({ n: 50, cadence: 'day' }, 16).shares[0]?.hour).toBe(-1);
    expect(played({ n: 50, cadence: 'day' }, 17).shares[0]?.hour).toBe(24);
  });

  it('is due at the next whole hour when a life starts mid-hour', () => {
    const game = createPeopleGame({ n: 20, cadence: 'hour', start: { ...DEFAULT_START, minute: 30 } });
    const state = game.reduce(game.init('people', sim), { type: 'time/advance', minutes: 30 }, sim).state;
    expect(game.fact(state, 'people-all.settled', undefined, sim)).toBe(START + 1);
  });

  it('moves each staggered share on once a day, at its own hour', () => {
    const { shares } = played({ n: 240, cadence: 'staggered' }, 17 + 48);
    // At the third midnight: share 0's hour is now, and every other share's hour was yesterday's.
    expect(shares.map((share) => share.hour)).toEqual(shares.map((_, k) => (k === 0 ? 72 : 48 + k)));
  });

  it('moves the staggered shares on as progress does', () => {
    const { state, shares } = played({ n: 240, cadence: 'staggered' }, 24 * 3 + 5);
    const city = cityOf(state);
    shares.forEach((share, k) => {
      const direct = newShare(240, k, 24);
      progress(city, direct, START, share.hour, 0);
      expect(share).toEqual(direct);
    });
  });

  it("moves people on by the start day's weekday: a Saturday start is no Monday", () => {
    // 7 June 2025 was a Saturday.
    const { state, shares } = played({ n: 200, cadence: 'hour', start: { ...DEFAULT_START, day: 7 } }, 24);
    const direct = newShare(200);
    progress(cityOf(state), direct, START, START + 24, 5);
    expect(shares[0]).toEqual(direct);
  });

  it('is the same game for the same seed, and another for another', () => {
    const a = played({ n: 100, cadence: 'staggered' }, 30, 'a');
    expect(stateHash(played({ n: 100, cadence: 'staggered' }, 30, 'a').state)).toBe(stateHash(a.state));
    expect(stateHash(played({ n: 100, cadence: 'staggered' }, 30, 'b').state)).not.toBe(stateHash(a.state));
  });

  it('passes a month in one action as it does an hour at a time', () => {
    for (const cadence of ['hour', 'staggered'] as const) {
      const game = createPeopleGame({ n: 100, cadence });
      const once = game.reduce(game.init('people', sim), { type: 'time/advance', days: 30 }, sim).state;
      expect(sharesOf(once, { n: 100, cadence })).toEqual(played({ n: 100, cadence }, 24 * 30).shares);
    }
  });

  // The engine fires at most 10,000 timers in one advance (engine time/timers.ts). D18's prison
  // terms and D19's skip to an heir's 18th birthday pass years at once.
  it('can pass years in one action only once a day: an hourly timer fires too often', () => {
    const hourly = createPeopleGame({ n: 5, cadence: 'hour' });
    expect(() => hourly.reduce(hourly.init('people', sim), { type: 'time/advance', days: 420 }, sim)).toThrow(
      /More than 10000 timers/,
    );
    const daily = createPeopleGame({ n: 5, cadence: 'day' });
    const years = daily.reduce(daily.init('people', sim), { type: 'time/advance', days: 18 * 365 }, sim);
    expect((years.state['people-all'] as PeopleSlice).hour).toBe(18 * 365 * 24);
  });

  it('answers its facts', () => {
    const { game, state } = played({ n: 120, cadence: 'hour' }, 24);
    expect(game.fact(state, 'people.count', undefined, sim)).toBe(120);
    expect(game.fact(state, 'people-all.mean', { need: 'health' }, sim)).toBe(100);
    expect(game.fact(state, 'people-all.ties', undefined, sim)).toBeGreaterThan(0);
  });
});
