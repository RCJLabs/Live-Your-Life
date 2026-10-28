import type { Action, GameState } from '@eb/core';
import { careerOf } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { postingText } from './panel.ts';
import { Life } from './session.ts';
import { MEAL, startTrip, tripAction } from './trip.ts';

/** A life hired as `career`, signed up for tomorrow's `shift`. */
function hired(seed: string, career: string, shift: string): Life {
  const base = new Life(seed);
  const s = base.state;
  const day = (base.fact('time.day') as number) + 1;
  const job = s.job as Record<string, unknown>;
  const signed = [{ day, shift, event: null, in: null, worked: 0, home: false }];
  const life = new Life({
    state: {
      ...s,
      job: { ...job, career, employed: true, posted: [{ day, shift }], signed },
      economy: { ...(s.economy as object), amounts: { cash: 1_000_00 } },
    } as GameState,
    kept: [],
  });
  return life;
}

/** The same, at the shift's start. */
function onShift(seed: string, career: string, shift: string): Life {
  const life = hired(seed, career, shift);
  life.act({ type: 'time/advance', minutes: life.fact('job.next-shift-in') as number });
  return life;
}

/** The trip's work step played out: each action it sends, until it turns for home. */
function worked(life: Life): Action[] {
  const trip = startTrip({ minutes: 5, from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }, 'walk');
  trip.step = 'work';
  const sent: Action[] = [];
  for (let i = 0; i < 20; i++) {
    const a = tripAction(life, trip);
    if (!a || trip.step !== 'work') break;
    sent.push(a);
    life.act(a);
  }
  return sent;
}
const did = (sent: Action[]) => sent.map((a) => [a.activity, a.minutes]);

describe('a shift’s breaks on the way to work off screen (M4.4 step 4, D164)', () => {
  it('works a 24-hour shift with a meal halfway and the station’s sleep for its last hours, and keeps standing', () => {
    const life = onShift('trip-24', 'emt', 'twenty-four');
    const kind = careerOf(life.sim.content, 'emt').shifts.find((k) => k.id === 'twenty-four');
    const breaks = kind?.breaks as number;
    expect(life.fact('job.shift-breaks')).toBe(breaks);
    const sent = worked(life);
    expect(did(sent)).toEqual([
      ['work', 720],
      ['eat', MEAL],
      ['work', 720 - breaks],
      ['sleep', breaks - MEAL],
    ]);
    const standing = life.fact('job.standing') as number;
    life.act({ type: 'time/advance', minutes: 5 });
    expect(life.fact('job.standing')).toBeGreaterThan(standing);
  });

  it('takes a 12-hour night shift’s half-hour meal halfway through, past midnight', () => {
    const life = onShift('trip-night', 'registered-nurse', 'nights');
    expect(did(worked(life))).toEqual([
      ['work', 360],
      ['eat', 30],
      ['work', 330],
    ]);
    expect(life.fact('time.of-day')).toBe(7 * 60);
  });

  it('works a shift with no breaks straight through, as before', () => {
    const life = onShift('trip-cook', 'line-cook', 'dinner');
    const kind = careerOf(life.sim.content, 'line-cook').shifts.find((k) => k.id === 'dinner');
    expect(did(worked(life))).toEqual([['work', kind?.minutes]]);
  });
});

describe('a posted shift, said', () => {
  it('names a night or a day-long shift, says when one ends the next morning, and its unpaid breaks', () => {
    const night = hired('say-night', 'registered-nurse', 'nights');
    const day = (night.fact('time.day') as number) + 1;
    expect(postingText(night, day)).toMatch(
      /^The night shift .*, 19:00 to 07:00 the next morning\. Up to 30 minutes of it are unpaid breaks\.$/,
    );
    const cook = hired('say-cook', 'line-cook', 'dinner');
    expect(postingText(cook, (cook.fact('time.day') as number) + 1)).toMatch(
      /^The dinner shift .*, \d\d:00 to \d\d:00\.$/,
    );
  });
});
