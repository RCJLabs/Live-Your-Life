import { type GameState, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { play, sliceGame, sliceSim } from '../../test/slice.ts';
import type { WEEKDAYS } from '../calendar.ts';
import type { EducationSlice } from './module.ts';
import { type EducationRecord, educationOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const r = educationOf(sim.content) as EducationRecord;
const edu = (s: GameState) => s.education as EducationSlice;
const fact = (s: GameState, id: string, a: Record<string, unknown> = {}) => game.fact(s, id, a, sim);

/** A life without a diploma, cash in hand, at 10:00 on the next weekday. */
function noDiploma(seed: string): GameState {
  let s = game.init(seed, sim);
  s = {
    ...s,
    education: { ...edu(s), finished: 'none' },
    economy: { ...(s.economy as object), amounts: { cash: 1_000_000 } },
  } as GameState;
  for (let i = 0; i < 8; i++) {
    s = play(game, sim, s, { type: 'clock/wait-until', hour: 10, minute: 0 }).state;
    const day = fact(s, 'time.weekday') as (typeof WEEKDAYS)[number];
    if (day !== 'saturday' && day !== 'sunday') break;
  }
  return s;
}

const shown = (s: GameState, subject: string) =>
  (
    turnFor(game, sim, s, Rng.create('shown'), 0).preview([{ effect: 'ged-odds', subject }])[0] as unknown as {
      chance: number;
    }
  ).chance;

describe('the GED (M2.8 step 2, D111)', () => {
  it('is studied for only without a diploma, and each hour studied raises the chance, to the most', () => {
    const s = noDiploma('ged-study');
    const math = r.ged.subjects.find((x) => x.id === 'math') as EducationRecord['ged']['subjects'][number];
    expect(shown(s, 'math')).toBe(math.pass);
    const studied = play(game, sim, s, { type: 'education/study', subject: 'math', minutes: 180 }).state;
    expect(shown(studied, 'math')).toBe(math.pass + 3 * r.ged.perHour);
    expect(fact(studied, 'time.tick')).toBe((fact(s, 'time.tick') as number) + 180);
    const long = {
      ...studied,
      education: { ...edu(studied), ged: { passed: [], prep: { math: 600 * 60 } } },
    } as GameState;
    expect(shown(long, 'math')).toBe(r.ged.most);
    const withDiploma = { ...s, education: { ...edu(s), finished: 'diploma' } } as GameState;
    expect(game.options(withDiploma, sim).some((a) => a.type === 'education/study')).toBe(false);
  });

  it('is sat at the centre on a weekday, at its price, and passed at the chance shown', () => {
    const s = noDiploma('ged-sit');
    const science = r.ged.subjects.find((x) => x.id === 'science') as EducationRecord['ged']['subjects'][number];
    const chance = shown(s, 'science');
    let passed = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const t = { ...s, kernel: { ...s.kernel, seed: `ged-${i}` } } as GameState;
      const out = play(game, sim, t, { type: 'education/take-test', subject: 'science' });
      const sat = out.of('education/sat')[0];
      expect(sat?.chance).toBe(chance);
      if (sat?.passed) passed++;
      expect(fact(out.state, 'economy.amount', { resource: 'cash' })).toBe(1_000_000 - r.ged.price);
      expect(fact(out.state, 'time.tick')).toBe((fact(s, 'time.tick') as number) + science.minutes);
    }
    const p = chance / 100;
    expect(Math.abs(passed - n * p)).toBeLessThan(3 * Math.sqrt(n * p * (1 - p)));
    // Shut at night, and not without the price.
    const night = play(game, sim, s, { type: 'clock/wait-until', hour: 22, minute: 0 }).state;
    expect(game.options(night, sim).some((a) => a.type === 'education/take-test')).toBe(false);
    let weekend = s;
    for (let i = 0; i < 7 && fact(weekend, 'time.weekday') !== 'saturday'; i++)
      weekend = play(game, sim, weekend, { type: 'time/advance', minutes: 1440 }).state;
    expect(fact(weekend, 'time.of-day')).toBe(600);
    expect(game.options(weekend, sim).some((a) => a.type === 'education/take-test')).toBe(false);
    const broke = { ...s, economy: { ...(s.economy as object), amounts: { cash: r.ged.price - 1 } } } as GameState;
    expect(game.reduce(broke, { type: 'education/take-test', subject: 'science' }, sim).accepted).toBe(false);
  });

  it('is earned once all four are passed: a diploma’s equal', () => {
    const s = noDiploma('ged-earn');
    // Two passed and a third: not yet.
    const two = r.ged.subjects.slice(2).map((x) => x.id);
    const one = { ...s, education: { ...edu(s), ged: { passed: two, prep: { language: 600 * 60 } } } } as GameState;
    const after = play(game, sim, one, { type: 'education/take-test', subject: 'language' });
    if (after.of('education/sat')[0]?.passed) expect(edu(after.state).finished).toBe('none');
    const three = r.ged.subjects.slice(1).map((x) => x.id);
    let t = { ...s, education: { ...edu(s), ged: { passed: three, prep: { math: 600 * 60 } } } } as GameState;
    // Studied to the most: tries until the last subject passes.
    for (let i = 0; i < 20 && edu(t).finished === 'none'; i++) {
      t = { ...t, kernel: { ...t.kernel, seed: `earn-${i}` } } as GameState;
      t = play(game, sim, t, { type: 'education/take-test', subject: 'math' }).state;
      if (edu(t).finished === 'none') t = play(game, sim, t, { type: 'time/advance', minutes: 60 }).state;
    }
    expect(edu(t).finished).toBe('ged');
    expect(fact(t, 'education.high-school')).toBe(true);
    expect(game.options(t, sim).some((a) => a.type === 'education/take-test' || a.type === 'education/study')).toBe(
      false,
    );
  });
});
