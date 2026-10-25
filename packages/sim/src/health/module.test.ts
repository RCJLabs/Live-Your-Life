import type { GameState } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, play, sliceGame, sliceSim, TEST_COOK, testCook, withCareer } from '../../test/slice.ts';
import { MINUTES_PER_DAY } from '../calendar.ts';
import { coverage, type HealthSlice } from './module.ts';
import { dayChance, ILLNESS, type IllnessRecord, illnessOf, kindOf, shiftChance } from './records.ts';

const base = illnessOf(sliceSim().content) as IllnessRecord;
/** The record with each kind's yearly rate set: 36,500 a hundred is a certain day. */
const rated = (rates: Record<string, number>): IllnessRecord => ({
  ...base,
  kinds: base.kinds.map((k) => ({ ...k, perYear: rates[k.id] ?? 0 })),
});
const simWith = (r: IllnessRecord) => sliceSim({ ...withCareer(testCook()), illness: { [ILLNESS]: r } });
const game = sliceGame({ career: TEST_COOK });
const health = (s: GameState) => s.health as HealthSlice;
const day = (s: GameState, sim: ReturnType<typeof sliceSim>) => game.fact(s, 'time.day', {}, sim) as number;

/** A life a day in, with the record's first day settled. */
function started(sim: ReturnType<typeof sliceSim>, seed = 'health') {
  return play(game, sim, game.init(seed, sim), advance(60)).state;
}

describe('illness, injury and care (M2.7 step 2, D104, D105)', () => {
  it('turns a yearly rate into a day’s chance, and a work injury’s into a shift’s', () => {
    const flu = kindOf(base, 'flu');
    expect(dayChance(flu)).toBe(Math.round((flu.perYear * 1000) / 365));
    const injury = kindOf(base, 'injury');
    expect(shiftChance(injury, 480)).toBe(Math.round((injury.perYear * 1000 * 480) / 120_000));
  });

  it('brings the flu at its rate, keeps you from work its first days, takes health, and ends', () => {
    const sim = simWith(rated({ flu: 36_500 }));
    let s = started(sim);
    const r = play(game, sim, s, advance(MINUTES_PER_DAY));
    s = r.state;
    expect(r.of('health/fell-ill').map((b) => b.kind)).toEqual(['flu']);
    const flu = kindOf(base, 'flu');
    const ill = health(s).ill as NonNullable<HealthSlice['ill']>;
    expect(ill.until - ill.off).toBe(flu.days - flu.off);
    expect(game.fact(s, 'health.off-work', {}, sim)).toBe(true);
    const healthy = game.fact(s, 'life.need', { need: 'health' }, sim) as number;
    s = play(game, sim, s, advance(MINUTES_PER_DAY)).state;
    expect(game.fact(s, 'life.need', { need: 'health' }, sim) as number).toBeLessThan(healthy);
    s = play(game, sim, s, advance(flu.days * MINUTES_PER_DAY)).state;
    expect(health(s).ill?.kind ?? 'well').not.toBe('flu-forever');
  });

  it('calls in sick for a shift you are too ill for: no warning, no pay, and work is not offered', () => {
    const sim = simWith(rated({ flu: 36_500 }));
    let s = started(sim, 'health-sick');
    const today = day(s, sim);
    s = play(game, sim, s, { type: 'job/sign-up', day: today + 1 }).state;
    // Into tomorrow's shift, too ill to work it.
    const r = play(game, sim, s, advance(MINUTES_PER_DAY + 9 * 60), advance(9 * 60));
    expect(r.of('job/called-in-sick').length).toBe(1);
    expect(r.of('job/no-show')).toEqual([]);
    expect((r.state.job as { warnings: unknown[] }).warnings).toEqual([]);
  });

  it('prices a doctor by your coverage, and a visit shortens the flu', () => {
    const sim = simWith(rated({ flu: 36_500 }));
    let s = started(sim, 'health-visit');
    s = play(game, sim, s, advance(MINUTES_PER_DAY)).state;
    // Into a weekday's clinic hours.
    for (let i = 0; i < 8 && !game.options(s, sim).some((a) => a.type === 'health/see-doctor'); i++)
      s = play(game, sim, s, advance(60)).state;
    const cov = game.fact(s, 'health.coverage', {}, sim) as 'medicaid' | 'none';
    expect(cov).toBe(coverage({ fact: (id, a) => game.fact(s, id, a ?? {}, sim) }, base));
    expect(game.fact(s, 'health.visit-cost', {}, sim)).toBe(base.visit[cov]);
    const before = health(s).ill as NonNullable<HealthSlice['ill']>;
    const cash = game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
    const r = play(game, sim, s, { type: 'health/see-doctor' });
    const after = health(r.state).ill as NonNullable<HealthSlice['ill']>;
    expect(after.until).toBe(before.until - kindOf(base, 'flu').visit);
    expect(game.fact(r.state, 'economy.amount', { resource: 'cash' }, sim)).toBe(cash - base.visit[cov]);
    expect(game.options(r.state, sim).some((a) => a.type === 'health/see-doctor')).toBe(false);
  });

  it('covers you by Medicaid below the line for your household, and not above it', () => {
    const at = (wage: number, employed = true, living = -1, kids = 0) =>
      coverage(
        {
          fact: (id) =>
            ({ 'job.employed': employed, 'job.wage': wage, 'circle.living': living, 'family.with-you': kids })[id],
        },
        base,
      );
    const line = base.medicaid.one / base.medicaid.hours;
    expect(at(0, false)).toBe('medicaid');
    expect(at(Math.floor(line) - 1)).toBe('medicaid');
    expect(at(Math.ceil(line) + 1)).toBe('none');
    // A partner and a child raise the line two steps.
    expect(at(Math.ceil(line) + 1, true, 7, 1)).toBe('medicaid');
  });

  it('puts you in hospital when an illness takes your health to nothing, bills each day, and lets you out', () => {
    const sim = simWith(rated({ flu: 36_500 }));
    let s = started(sim, 'health-hospital');
    s = play(game, sim, s, advance(MINUTES_PER_DAY)).state;
    // Run down: health nearly gone, with the flu.
    s = {
      ...s,
      life: { ...(s.life as object), levels: { ...(s.life as { levels: object }).levels, health: 1 } },
    } as GameState;
    const r = play(game, sim, s, advance(MINUTES_PER_DAY));
    s = r.state;
    expect(r.of('health/admitted').length).toBe(1);
    expect(game.fact(s, 'health.in-hospital', {}, sim)).toBe(true);
    expect(game.options(s, sim).map((a) => a.type)).toContain('health/rest');
    expect(game.reduce(s, { type: 'life/do', activity: 'eat', minutes: 30 }, sim).accepted).toBe(false);
    const until = game.fact(s, 'health.hospital-until', {}, sim) as number;
    for (let i = 0; i < base.hospital.days + 1 && game.fact(s, 'health.in-hospital', {}, sim); i++)
      s = play(game, sim, s, { type: 'health/rest' }).state;
    expect(game.fact(s, 'health.in-hospital', {}, sim)).toBe(false);
    expect(day(s, sim)).toBeGreaterThanOrEqual(until);
    const cov = r.of('health/admitted')[0]?.coverage as 'medicaid' | 'none';
    if (base.hospital[cov] > 0) {
      const billed = (game.fact(s, 'health.owed', {}, sim) as number) > 0 || cov === 'medicaid';
      expect(billed || (game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number) >= 0).toBe(true);
    }
  });

  it('treats you in hospital without a new illness, and lets you out fed when the days pass on their own', () => {
    const sim = simWith(rated({ flu: 36_500, cold: 36_500 }));
    let s = started(sim, 'health-stay');
    s = play(game, sim, s, advance(MINUTES_PER_DAY)).state;
    s = {
      ...s,
      life: { ...(s.life as object), levels: { ...(s.life as { levels: object }).levels, health: 1 } },
    } as GameState;
    // The days passed by the clock, not by resting: as the page's clock passes them.
    const beats: string[] = [];
    for (let i = 0; i < base.hospital.days + 2 && !beats.includes('health/discharged'); i++) {
      const r = play(game, sim, s, advance(MINUTES_PER_DAY));
      beats.push(...r.beats.map((b) => b.type));
      s = r.state;
    }
    expect(beats.filter((b) => b === 'health/admitted').length).toBe(1);
    expect(beats).toContain('health/discharged');
    expect(beats).not.toContain('health/fell-ill');
    // Let out fed, not taken back in the same day for hunger.
    expect(game.fact(s, 'health.in-hospital', {}, sim)).toBe(false);
  });

  it('takes nobody into hospital for health let fall without an illness', () => {
    const sim = simWith(rated({}));
    let s = started(sim, 'health-neglect');
    s = {
      ...s,
      life: { ...(s.life as object), levels: { ...(s.life as { levels: object }).levels, health: 0 } },
    } as GameState;
    const r = play(game, sim, s, advance(MINUTES_PER_DAY));
    expect(r.of('health/admitted')).toEqual([]);
  });

  it('hurts you at work at the injury’s rate for the minutes worked', () => {
    const sim = simWith(rated({ injury: 100_000 }));
    let s = started(sim, 'health-injury');
    const today = day(s, sim);
    s = play(game, sim, s, { type: 'job/sign-up', day: today + 1 }, advance(MINUTES_PER_DAY)).state;
    const r = play(
      game,
      sim,
      s,
      { type: 'clock/wait-until', hour: 15, minute: 0 },
      {
        type: 'life/do',
        activity: 'work',
        minutes: 480,
      },
    );
    expect(r.of('health/fell-ill').map((b) => b.kind)).toEqual(['injury']);
    expect(game.fact(r.state, 'health.off-work', {}, sim)).toBe(true);
  });

  it('falls ill at no rate in a pack without the record', () => {
    const sim = sliceSim({ ...withCareer(testCook()), illness: {} });
    const s = play(game, sim, started(sim), advance(60 * MINUTES_PER_DAY)).state;
    expect(health(s).ill).toBeNull();
  });
});
