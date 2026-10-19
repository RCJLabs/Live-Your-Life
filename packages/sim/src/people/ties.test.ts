import { describe, expect, it } from 'vitest';
import { hourOf, placeOf } from './day.ts';
import { planAt } from './gather.ts';
import { newShare, progress } from './module.ts';
import { mix, rosterOf } from './roster.ts';
import { TIES } from './templates.ts';
import { meet } from './ties.ts';

/**
 * The meeting rule as plainly as it can be written, everyone at once, hour by hour: at each
 * shared place, in person order, each person meets `TIES.perHour` others picked by the seed,
 * and each meeting goes on both lists. The module works it out a person at a time instead.
 */
function plainTies(seed: number, n: number, from: number, to: number): number[] {
  const roster = rosterOf(seed, n);
  const ties = newShare(n).ties;
  for (let hour = from; hour < to; hour++) {
    const day = Math.floor(hour / 24);
    const at = new Map<number, number[]>();
    roster.people.forEach((p, i) => {
      const place = placeOf(p, hourOf(p, seed, i, day, day % 7, hour % 24).at);
      if (place >= roster.firstShared) at.set(place, [...(at.get(place) ?? []), i]);
    });
    for (const here of at.values()) {
      if (here.length < 2) continue;
      here.forEach((i, a) => {
        for (let m = 0; m < TIES.perHour; m++) {
          const j = here[(a + 1 + (mix(seed, 9, hour, i, m) % (here.length - 1))) % here.length] as number;
          meet(ties, i, j, 1);
          meet(ties, j, i, 1);
        }
      });
    }
  }
  return ties;
}

const SEED = 4242;
const n = 200;
const FROM = 7;
const TO = FROM + 24 * 5;
const slice = newShare(n);
progress({ seed: SEED, n }, slice, FROM, TO, 0);

const tiesOf = (i: number) =>
  Array.from({ length: TIES.cap }, (_, k) => ({
    other: slice.ties[(i * TIES.cap + k) * 2] as number,
    familiarity: slice.ties[(i * TIES.cap + k) * 2 + 1] as number,
  })).filter((t) => t.other >= 0);

describe('ties', () => {
  it('are capped, never with oneself, never twice with one person, and each met at least once', () => {
    for (let i = 0; i < n; i++) {
      const ties = tiesOf(i);
      expect(ties.length).toBeLessThanOrEqual(TIES.cap);
      expect(new Set(ties.map((t) => t.other)).size).toBe(ties.length);
      for (const t of ties) {
        expect(t.other).not.toBe(i);
        expect(t.other).toBeLessThan(n);
        expect(t.familiarity).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("are mutual and equal while neither person's list is full", () => {
    let checked = 0;
    for (let i = 0; i < n; i++) {
      for (const t of tiesOf(i)) {
        if (tiesOf(t.other).length === TIES.cap || tiesOf(i).length === TIES.cap) continue;
        expect(tiesOf(t.other)).toContainEqual({ other: i, familiarity: t.familiarity });
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('only form between people who were at the same shared place in the same hour', () => {
    const roster = rosterOf(SEED, n);
    const shared = new Set<string>();
    for (let hour = FROM; hour < TO; hour++) {
      const day = Math.floor(hour / 24);
      const at = new Map<number, number[]>();
      roster.people.forEach((p, i) => {
        const place = placeOf(p, hourOf(p, SEED, i, day, day % 7, hour % 24).at);
        if (place >= roster.firstShared) at.set(place, [...(at.get(place) ?? []), i]);
      });
      for (const here of at.values()) for (const i of here) for (const j of here) shared.add(`${i}:${j}`);
    }
    for (let i = 0; i < n; i++) for (const t of tiesOf(i)) expect(shared.has(`${i}:${t.other}`)).toBe(true);
  });

  it('grow as the plain meeting rule grows them, full lists included', () => {
    // 60 people share two third places, so lists fill and the order of meetings decides who stays.
    const few = newShare(60);
    progress({ seed: SEED, n: 60 }, few, FROM, FROM + 24 * 20, 0);
    expect(few.ties).toEqual(plainTies(SEED, 60, FROM, FROM + 24 * 20));
    const full = Array.from({ length: 60 }, (_, i) => few.ties[(i * TIES.cap + TIES.cap - 1) * 2] as number);
    expect(full.filter((other) => other >= 0).length).toBeGreaterThan(5);
  });

  it("keeps one hour's plan apart from the same hour on another weekday", () => {
    // Day 5 at 09:00: a Saturday has the day shift at home, a Friday has it at work.
    const roster = rosterOf(SEED, n);
    const saturday = planAt(roster, SEED, 5 * 24 + 9, 5);
    const friday = planAt(roster, SEED, 5 * 24 + 9, 4);
    expect(saturday.kinds).not.toEqual(friday.kinds);
  });

  it('keep a full list, but let a stranger take the place of someone met only once', () => {
    const ties = newShare(40).ties;
    for (let j = 1; j <= TIES.cap; j++) meet(ties, 0, j, j === 5 ? 1 : 3);
    meet(ties, 0, 30, 1);
    const others = Array.from({ length: TIES.cap }, (_, k) => ties[2 * k]);
    expect(others).toContain(30);
    expect(others).not.toContain(5);
    // Met twice now, 30 keeps the place, and the next stranger finds the list full.
    meet(ties, 0, 30, 1);
    meet(ties, 0, 31, 1);
    expect(Array.from({ length: TIES.cap }, (_, k) => ties[2 * k])).not.toContain(31);
    expect(ties[2 * others.indexOf(30) + 1]).toBe(2);
  });
});
