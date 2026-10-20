import type { GameState, TimeSlice } from '@eb/core';
import type { LawState, TiesSlice } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { courtLine, type Waiting, waiting } from './pending.ts';
import { Life } from './session.ts';

/** A life whose state has had `change` made to it, as a test sets one up. */
function lifeWith(change: (s: GameState) => GameState, seed = 'pending'): Life {
  const life = new Life(seed);
  const set = change(life.state);
  Object.defineProperty(life.session, 'state', { get: () => set });
  return life;
}

const law = (s: GameState) => s.law as LawState;
const ties = (s: GameState) => s.ties as TiesSlice;

describe('the life on the page (M1.6)', () => {
  it('sends time only out in the world: never in a shift event, held or in court', () => {
    for (const mode of ['shift-event', 'held', 'court']) {
      const life = lifeWith((s) => ({ ...s, kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: mode }] } }));
      const log = life.session.log.length;
      life.elapse(5000, 4);
      expect(life.session.log.length, mode).toBe(log);
      expect(life.refused, mode).toEqual([]);
    }
    const out = new Life('world');
    out.elapse(1500, 1);
    expect(out.session.log.map((a) => a.type)).toEqual(['time/elapse']);
  });

  it('carries a part of a game minute over to the next frame, and refuses nothing at 4×', () => {
    const life = new Life('carry');
    for (let i = 0; i < 120; i++) life.elapse(16.7, 4);
    expect(life.fact('time.tick')).toBe(Math.floor((120 * 16.7 * 4) / 500));
    expect(life.refused).toEqual([]);
    // Whole game minutes only (M1.7): one action for each minute that passed, not one a frame.
    const elapses = life.session.log.filter((a) => a.type === 'time/elapse');
    expect(elapses.length).toBeLessThanOrEqual(life.fact('time.tick') as number);
    for (const a of elapses) expect((a.ms as number) % 500).toBe(0);
  });

  it('writes what happens to the journal and the toasts, in the chronicle’s words', () => {
    const life = new Life('journal');
    const day = life.options().find((a) => a.type === 'job/sign-up');
    expect(day).toBeDefined();
    life.act(day as never);
    expect(life.journal.length).toBe(1);
    expect(life.journal[0]?.text).toMatch(
      new RegExp(`^${life.names.you} signed up for the (breakfast|dinner) shift on `),
    );
    expect(life.fresh).toEqual([life.journal[0]?.text]);
  });
});

describe('what waits on you (D50)', () => {
  it('lists a favour, the police, a court date, probation, money owed and your shifts, each with its day', () => {
    const life = lifeWith((s) => {
      const time = s.time as TimeSlice;
      const timer = { id: 'law-visit-7', due: 3 * 1440, effects: [{ effect: 'visit', visit: 7 }], seq: time.next };
      const t = ties(s);
      return {
        ...s,
        time: { ...time, next: time.next + 1, timers: [...time.timers, timer].sort((a, b) => a.due - b.due) },
        ties: { ...t, request: { day: 4, shift: 'dinner' } },
        law: {
          ...law(s),
          visits: [{ id: 7, why: 'camera', item: 'soda', case: 0 }],
          cases: [{ id: 2, offence: 'retail-fraud-3', value: 249, evidence: 'held', court: 20, warrant: false }],
          probation: { until: 180, next: 30, offence: 'retail-fraud-3' },
          owed: { demand: 5000, court: 0 },
        },
        job: {
          ...(s.job as object),
          signed: [{ day: 2, shift: 'dinner', event: null, in: null, worked: 0, home: false }],
        },
      } as GameState;
    });
    const list = waiting(life);
    expect(list.map((w) => [w.kind, w.day])).toEqual([
      ['shift', 2],
      ['police', 3],
      ['favour', 4],
      ['court', 20],
      ['probation', 30],
      ['owed', null],
    ]);
    for (const w of list) expect(w.text, w.kind).toMatch(/\.$/);
    expect(list.find((w) => w.kind === 'favour')?.text).toContain(ties(life.state).coworker?.first);
    expect(list.find((w) => w.kind === 'owed')?.text).toBe('You owe $50.00 to the court and the shop.');
  });

  it('is empty for a life with nothing coming', () => {
    expect(waiting(new Life('nothing'))).toEqual([]);
  });
});

describe('the morning of a court date (D58)', () => {
  const court = (day: number, go: boolean): Waiting => ({
    id: 'court/1',
    kind: 'court',
    day,
    text: '',
    actions: go ? [{ label: 'Go to court', action: { type: 'law/attend' } }] : [],
  });

  it('says so while going is offered that morning, and not another day, nor after noon', () => {
    const life = new Life('court-day');
    expect(courtLine(life, [court(0, true)])).toMatch(/due in court this morning, by noon/);
    expect(courtLine(life, [court(0, false)])).toBeNull();
    expect(courtLine(life, [court(1, true)])).toBeNull();
    life.act({ type: 'time/advance', minutes: 5 * 60 });
    expect(courtLine(life, [court(0, true)])).toBeNull();
  });
});
