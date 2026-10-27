import type { GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { advance, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import type { LawSlice } from '../law/state.ts';
import { type FederalSlice, NO_APPLICATION } from './apply.ts';
import { type Agency, agencyOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const a = agencyOf(sim.content) as Agency;
const fed = (s: GameState) => s.federal as FederalSlice;
const fact = (s: GameState, id: string, x: Record<string, unknown> = {}) => game.fact(s, id, x, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((o) => o.type === type);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const odds = (s: GameState) => game.preview(s, [{ effect: 'federal-odds' }], sim)[0]?.chance as number;
const chance = (b: Record<string, unknown> | undefined) =>
  b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);
const day = (s: GameState) => fact(s, 'time.day') as number;

/** A life of `age` with its schooling, minutes worked as an accountant, a record, and an application so far. */
function lifeWith(
  seed: string,
  o: {
    age?: number;
    finished?: string;
    worked?: number;
    convictions?: number;
    felonies?: number;
    federal?: Partial<FederalSlice>;
  } = {},
): GameState {
  const s = game.init(seed, sim);
  const job = s.job as { experience: Record<string, number> };
  return {
    ...s,
    lives: { ...(s.lives as object), born: -(o.age ?? 26) * 365 },
    education: { ...(s.education as object), finished: o.finished ?? 'bachelor' },
    job: { ...job, experience: { ...job.experience, accountant: o.worked ?? a.requires.minutes } },
    law: { ...(s.law as LawSlice), convictions: o.convictions ?? 0, felonies: o.felonies ?? 0 },
    federal: { ...NO_APPLICATION(), ...o.federal },
  } as GameState;
}

describe('applying to the federal bureau (M4.3 step 1, D154)', () => {
  it('asks a bachelor’s, the age, two years of professional work (one with a JD), and no felony', () => {
    expect(offered(lifeWith('ok'), 'federal/apply')).toEqual([{ type: 'federal/apply' }]);
    const no = (o: Parameters<typeof lifeWith>[1]) => refusal(game, sim, lifeWith('no', o), { type: 'federal/apply' });
    expect(no({ finished: 'associate' })).toBe('bachelor');
    expect(no({ age: a.requires.least - 1 })).toBe('age');
    expect(no({ age: a.requires.most + 1 })).toBe('age');
    expect(no({ worked: a.requires.minutes - 60 })).toBe('experience');
    expect(no({ felonies: 1, convictions: 1 })).toBe('felony');
    // A JD asks one year.
    const ok = (o: Parameters<typeof lifeWith>[1]) =>
      game.reduce(lifeWith('ok', o), { type: 'federal/apply' }, sim).accepted;
    expect(ok({ finished: 'jd', worked: a.requires.advanced })).toBe(true);
    // A misdemeanour doesn't bar the application; it weighs in the background.
    expect(ok({ convictions: 1 })).toBe(true);
  });

  it('sets the written test on its day, and offers study and training until it is sat', () => {
    const s = lifeWith('apply');
    const step = play(game, sim, s, { type: 'federal/apply' });
    expect(fed(step.state)).toMatchObject({ stage: 'written', due: day(s) + a.written.wait, tries: 1 });
    expect(told(step.of('federal/applied')[0])).toBe('Dana applied to the federal bureau to become a special agent.');
    expect(offered(step.state, 'federal/sit')).toEqual([]);
    expect(offered(step.state, 'federal/prepare').map((o) => o.for)).toEqual(['written', 'fitness']);
    let t = step.state;
    for (let i = 0; i < 10; i++) t = play(game, sim, t, { type: 'federal/prepare', for: 'written', minutes: 60 }).state;
    expect(odds(t)).toBe(a.written.pass + 10 * a.written.perHour);
    expect(refusal(game, sim, t, { type: 'federal/prepare', for: 'bar', minutes: 60 })).toBe('no-preparing');
    const later = play(game, sim, t, advance((a.written.wait + 1) * MINUTES_PER_DAY), {
      type: 'clock/wait-until',
      hour: 9,
      minute: 0,
    }).state;
    expect(offered(later, 'federal/sit')).toEqual([{ type: 'federal/sit' }]);
  });

  it('rolls each stage at the chance shown, moving on or ending the application', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const stage = (['written', 'fitness', 'interview'] as const)[i % 3];
      const s = play(game, sim, lifeWith(`sit-${i}`, { federal: { stage, due: 0, study: 600, training: 1800 } }), {
        type: 'clock/wait-until',
        hour: 9,
        minute: 0,
      }).state;
      const shown = odds(s);
      const step = play(game, sim, s, { type: 'federal/sit' });
      expect(chance(step.of('logic/rolled')[0])).toBe(shown);
      const [passed] = step.of('federal/passed');
      if (passed) {
        expect(passed.stage).toBe(stage);
        expect(fed(step.state).stage).not.toBe(stage);
        expect(fed(step.state).due).toBeGreaterThan(day(step.state));
      } else {
        expect(fed(step.state)).toMatchObject({ stage: 'none', refused: day(step.state) });
        expect(told(step.of('federal/failed')[0])).toContain('did not pass the federal bureau');
      }
      seen.add(passed ? 'passed' : 'failed');
    }
    expect([...seen].sort()).toEqual(['failed', 'passed']);
  });

  it('trains the fitness test’s chance up in proportion to the hours it asks', () => {
    const at = (training: number) => odds(lifeWith('fit', { federal: { stage: 'fitness', due: 0, training } }));
    expect(at(0)).toBe(a.fitness.least);
    expect(at(a.fitness.hours * 60)).toBe(a.fitness.full);
    expect(at(a.fitness.hours * 120)).toBe(a.fitness.full);
    expect(at(a.fitness.hours * 30)).toBe(a.fitness.least + Math.floor((a.fitness.full - a.fitness.least) / 2));
  });

  it('decides the background on its day, weighing a conviction, and clears you for the Academy', () => {
    expect(odds(lifeWith('bg', { federal: { stage: 'background', due: 5 } }))).toBe(a.background.pass);
    expect(odds(lifeWith('bg', { convictions: 1, federal: { stage: 'background', due: 5 } }))).toBe(
      a.background.pass - a.background.conviction,
    );
    const outcomes = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const s = lifeWith(`bg-${i}`, { federal: { stage: 'background', due: 2 } });
      const r = play(game, sim, s, advance(3 * MINUTES_PER_DAY));
      const [b] = [...r.of('federal/passed'), ...r.of('federal/failed')];
      expect(b?.stage).toBe('background');
      expect(fed(r.state).stage).toBe(r.of('federal/cleared').length > 0 ? 'cleared' : 'none');
      if (r.of('federal/cleared').length > 0)
        expect(told(r.of('federal/cleared')[0])).toBe("Dana was cleared for the federal bureau's academy.");
      outcomes.add(fed(r.state).stage);
    }
    expect([...outcomes].sort()).toEqual(['cleared', 'none']);
  });

  it('lets you apply again only the record’s days after a refusal', () => {
    const s = lifeWith('again', { federal: { refused: 0, tries: 1 } });
    expect(refusal(game, sim, s, { type: 'federal/apply' })).toBe('too-soon');
    const later = play(game, sim, s, advance(a.again * MINUTES_PER_DAY)).state;
    expect(offered(later, 'federal/apply')).toEqual([{ type: 'federal/apply' }]);
  });
});
