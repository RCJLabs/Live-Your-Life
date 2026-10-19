import type { RecordStore } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { lineCook, sliceGame, sliceSim } from '../../test/slice.ts';
import type { Today } from '../job/days.ts';
import { daysOff, drawCoworker, fill, works } from './person.ts';
import { type Crew, namePoolOf } from './records.ts';
import type { TiesSlice } from './state.ts';

const crew = lineCook().crew as Crew;
const sim = sliceSim();
const pool = namePoolOf(sim.content as RecordStore, crew.names);

describe('the coworker (D41)', () => {
  it('comes from the seed and the name pool, the same for a seed, ages within the crew', () => {
    const game = sliceGame();
    const firsts = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const who = (game.init(`who-${i}`, sim).ties as TiesSlice).coworker;
      expect(who).toEqual((game.init(`who-${i}`, sim).ties as TiesSlice).coworker);
      if (!who) throw new Error('nobody beside you');
      expect(pool.first).toContainEqual({ name: who.first, pronouns: who.pronouns });
      expect(pool.last).toContain(who.last);
      expect(who.age).toBeGreaterThanOrEqual(crew.ages.min);
      expect(who.age).toBeLessThanOrEqual(crew.ages.max);
      firsts.add(who.first);
    }
    expect(firsts.size).toBeGreaterThan(40);
  });

  it('draws only from the rng it is given', () => {
    const rng = { pick: <T>(xs: readonly T[]) => xs[0] as T, int: (min: number) => min } as never;
    expect(drawCoworker(pool, crew, rng)).toEqual({
      first: pool.first[0]?.name,
      last: pool.last[0],
      pronouns: pool.first[0]?.pronouns,
      age: crew.ages.min,
      seed: 0,
    });
  });
});

describe('their week (D41)', () => {
  it('has 7 − days days off, different each week, the same for a seed and week', () => {
    const weeks = new Set<string>();
    for (let week = 0; week < 50; week++) {
      const off = daysOff(12345, week, 5);
      expect(off).toEqual(daysOff(12345, week, 5));
      expect(off.length).toBe(2);
      expect(new Set(off).size).toBe(2);
      for (const d of off) expect(d >= 0 && d <= 6).toBe(true);
      weeks.add(off.join());
    }
    expect(weeks.size).toBeGreaterThan(10);
    expect(daysOff(1, 0, 7)).toEqual([]);
  });

  it('works five days in seven, each weekday alike, from any start', () => {
    const who = { first: 'A', last: 'B', pronouns: 'they' as const, age: 30, seed: 0 };
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    let worked = 0;
    for (let seed = 0; seed < 200; seed++) {
      const today: Today = { day: 3, weekday: seed % 7, tick: 0, minute: 0 };
      for (let day = 3; day < 3 + 28; day++) {
        if (!works({ ...who, seed }, crew, today, day)) continue;
        worked++;
        const weekday = (today.weekday + day - 3) % 7;
        byWeekday[weekday] = (byWeekday[weekday] ?? 0) + 1;
      }
    }
    expect(worked / (200 * 28)).toBeCloseTo(5 / 7, 1);
    for (const n of byWeekday) expect(n / (worked / 7)).toBeGreaterThan(0.85);
  });

  it('keeps the week a day falls in whatever day it is read from', () => {
    const who = { first: 'A', last: 'B', pronouns: 'she' as const, age: 30, seed: 99 };
    const monday: Today = { day: 0, weekday: 0, tick: 0, minute: 0 };
    const thursday: Today = { day: 3, weekday: 3, tick: 0, minute: 0 };
    for (let day = 3; day < 40; day++) expect(works(who, crew, thursday, day)).toBe(works(who, crew, monday, day));
  });

  it('takes two days off in each Monday-to-Sunday week, for a life begun on a Thursday', () => {
    // Day 0 is a Thursday, so days 4 to 10 are a Monday to a Sunday.
    const thursday: Today = { day: 0, weekday: 3, tick: 0, minute: 0 };
    for (let seed = 0; seed < 100; seed++) {
      const who = { first: 'A', last: 'B', pronouns: 'he' as const, age: 30, seed };
      const off = [4, 5, 6, 7, 8, 9, 10].filter((day) => !works(who, crew, thursday, day));
      expect(off.length, String(seed)).toBe(2);
    }
  });
});

describe('lines about them', () => {
  it('fill the name and each set of pronouns', () => {
    const line = '{name} wipes {their} station. You thank {them}.';
    expect(fill(line, { first: 'Dana', pronouns: 'she' })).toBe('Dana wipes her station. You thank her.');
    expect(fill('{name}, {name}: {their}, {their}.', { first: 'Ray', pronouns: 'he' })).toBe('Ray, Ray: his, his.');
    expect(fill(line, { first: 'Ray', pronouns: 'he' })).toBe('Ray wipes his station. You thank him.');
    expect(fill(line, { first: 'Sam', pronouns: 'they' })).toBe('Sam wipes their station. You thank them.');
  });

  it('every line in the pack reads whole with each set: only {name}, {them} and {their}', () => {
    const lines: string[] = [];
    const walk = (value: unknown): void => {
      if (typeof value === 'string') lines.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value).forEach(walk);
    };
    for (const type of ['shift-event', 'act', 'favour'] as const) walk(PACK.records[type]);
    expect(lines.some((l) => l.includes('{their}'))).toBe(true);
    for (const line of lines) {
      for (const pronouns of ['she', 'he', 'they'] as const) {
        const filled = fill(line, { first: 'Dana', pronouns });
        expect(filled, line).not.toMatch(/[{}]/);
      }
      // A line names them rather than saying "she" or "they", so no verb has to agree.
      expect(line, line).not.toMatch(/\{(she|he|they)\}/);
    }
  });
});
