import { type Action, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { medicStart } from '../../test/medic.ts';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import { medicFor, type Track } from './medic.ts';

const sim = sliceSim();
const game = sliceGame({ people: 0 });
/** A beat, with `at` the day it came on: a shift's own beats keep their `day`, the day the shift was on. */
type Beat = { type: string; at: number; [k: string]: unknown };

/** A medic bot's life for `days`, every action accepted: its beats, each with the day it came on, and the end state. */
function life(track: Track, seed: string, days: number) {
  let state = medicStart(game, sim, seed);
  const policy = medicFor(days, track);
  const rng = Rng.create(seed).fork('bot');
  const seen: Beat[] = [];
  for (let turn = 0; turn < days * 300; turn++) {
    const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
    if (!action) break;
    const step = game.reduce(state, action, sim);
    expect(step.accepted, `${seed}: ${JSON.stringify(action)}`).toBe(true);
    state = step.state;
    const at = game.fact(state, 'time.day', {}, sim) as number;
    for (const b of step.beats)
      if (/^(education|market|job)\/(?!worked|paid|studied|attended)/.test(b.type)) seen.push({ ...b, at });
  }
  const fact = (id: string) => game.fact(state, id, {}, sim);
  const first = (type: string, x: Record<string, unknown> = {}) =>
    seen.find((b) => b.type === type && Object.entries(x).every(([k, v]) => b[k] === v));
  return { seen, fact, first };
}

/** The shifts worked in the career from the day it was taken: kinds signed up for, and hours. */
function worked(seen: readonly Beat[], from: number) {
  const after = seen.filter((b) => b.at >= from);
  const kinds = new Set(after.filter((b) => b.type === 'job/signed-up').map((b) => String(b.shift)));
  const minutes = after.filter((b) => b.type === 'job/shift-over').reduce((n, b) => n + (b.worked as number), 0);
  return { kinds, hours: minutes / 60 };
}

describe('the medic bots (M4.4 step 5)', () => {
  it('takes a diploma through the college, the nursing program and the licence to a year of a nurse’s shifts', () => {
    // One of the bench's lives (test/medics-bench.ts), licensed at its first sitting.
    const { seen, fact, first } = life('nurse', 'medics-nurse-0', 1700);
    const admitted = first('education/nursing-admitted', { admitted: true });
    const nursed = first('education/nursed', { program: 'adn' });
    const licensed = first('education/nclex', { passed: true });
    const hired = first('market/took', { career: 'registered-nurse' });
    expect(admitted && nursed && licensed && hired).toBeTruthy();
    // In order: prerequisites at the college, the program's three terms, the exam, then the job.
    const days = [admitted, nursed, licensed, hired].map((b) => b?.at as number);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
    expect(seen.filter((b) => b.type === 'education/enrolled' && b.school === 'adn')).toHaveLength(3);
    expect(fact('education.finished')).toBe('associate');
    // A year of 12-hour shifts, by day and by night, three a week: about 1,800 hours.
    const year = worked(seen, hired?.at as number);
    expect([...year.kinds].sort()).toEqual(['days', 'nights']);
    expect(year.hours).toBeGreaterThan(1500);
    expect(fact('job.career')).toBe('registered-nurse');
    expect(fact('job.employed')).toBe(true);
    expect(fact('time.day') as number).toBeGreaterThanOrEqual((hired?.at as number) + 365);
  }, 240_000);

  it('takes a diploma through the EMT course and the national exam to a year on the ambulance', () => {
    const { seen, fact, first } = life('emt', 'medics-emt-1', 620);
    const certified = first('education/certified');
    const licensed = first('education/nremt', { passed: true });
    const hired = first('market/took', { career: 'emt' });
    expect(certified && licensed && hired).toBeTruthy();
    expect(certified?.at as number).toBeLessThanOrEqual(licensed?.at as number);
    expect(licensed?.at as number).toBeLessThanOrEqual(hired?.at as number);
    // Days, nights and 24-hour shifts, its meal and sleep at the station taken (D164).
    const year = worked(seen, hired?.at as number);
    expect([...year.kinds].sort()).toEqual(['days', 'nights', 'twenty-four']);
    expect(year.hours).toBeGreaterThan(1300);
    expect(seen.filter((b) => b.type === 'job/standing' && b.why === 'left-early')).toEqual([]);
    // Each 24-hour shift worked to its breaks, not through them: the meal and the sleep off the clock.
    const longDays = new Set(
      seen.filter((b) => b.type === 'job/signed-up' && b.shift === 'twenty-four').map((b) => b.day as number),
    );
    const long = seen.filter((b) => b.type === 'job/shift-over' && longDays.has(b.day as number));
    expect(long.length).toBeGreaterThan(10);
    for (const b of long) expect(b.worked as number, `day ${String(b.day)}`).toBeLessThanOrEqual(24 * 60 - 8 * 60);
    expect(fact('job.employed')).toBe(true);
    expect(fact('time.day') as number).toBeGreaterThanOrEqual((hired?.at as number) + 365);
  }, 240_000);
});
