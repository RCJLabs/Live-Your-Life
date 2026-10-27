import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, doing, play, refusal, signUp, sliceGame, sliceSim, tickOf } from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { createLifeGame } from '../game.ts';
import { type CareerRecord, careerOf } from '../job/records.ts';
import type { JobSlice } from '../job/state.ts';
import { type FederalSlice, NO_APPLICATION } from './apply.ts';
import { type Agency, agencyOf } from './records.ts';

// The careers with no shift events, so a shift runs straight through.
const careers = PACK.records.career as Record<string, CareerRecord>;
const quiet: RecordPack = {
  ...PACK.records,
  career: Object.fromEntries(
    Object.entries(careers).map(([id, c]) => [id, { ...c, events: { ...c.events, chance: 0 } }]),
  ),
};
const sim = sliceSim(quiet);
const game = sliceGame();
const a = agencyOf(sim.content) as Agency;
const job = (s: GameState) => s.job as JobSlice;
const fed = (s: GameState) => s.federal as FederalSlice;
const fact = (s: GameState, id: string) => game.fact(s, id, {}, sim);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const RANKS = ['special-agent', 'special-agent-11', 'special-agent-12', 'special-agent-13'];

/** A life at the stage given, at nine in the morning. */
function at(seed: string, federal: Partial<FederalSlice>, g = game): GameState {
  const s = g.init(seed, sim);
  const set = { ...s, federal: { ...NO_APPLICATION(), ...federal } } as GameState;
  return play(g, sim, set, { type: 'clock/wait-until', hour: 9, minute: 0 }).state;
}

/** A whole shift worked on the first day posted, in `career` with `practice` minutes of it. */
function shift(career: string, practice: number, federal: Partial<FederalSlice> = {}) {
  const g = createLifeGame({ events: false, unlocked: true, people: 0, career });
  const s = g.init('shift', sim);
  const start = {
    ...s,
    job: { ...job(s), practice },
    federal: { ...NO_APPLICATION(), ...federal },
  } as GameState;
  const day = (job(start).posted[0] as { day: number }).day;
  const kind = careerOf(sim.content, career).shifts[0] as { hour: number; minutes: number };
  const signed = play(g, sim, start, signUp(day)).state;
  const wait = tickOf(day, kind.hour) - (signed.time as { tick: number }).tick;
  const working = play(g, sim, signed, advance(wait), doing('work', kind.minutes)).state;
  return play(g, sim, working, advance(5));
}

describe('the Academy (M4.3 step 2, D157)', () => {
  it('takes the cleared on as the trainee, at the field office, by day', () => {
    const offered = (s: GameState) => game.options(s, sim).filter((o) => o.type === 'federal/report');
    expect(offered(at('report', { stage: 'interview' }))).toEqual([]);
    const s = at('report', { stage: 'cleared' });
    expect(offered(s)).toEqual([{ type: 'federal/report' }]);
    const night = play(game, sim, s, { type: 'clock/wait-until', hour: 20, minute: 0 }).state;
    expect(refusal(game, sim, night, { type: 'federal/report' })).toBe('not-cleared');
    const step = play(game, sim, s, { type: 'federal/report' });
    expect(job(step.state)).toMatchObject({ career: a.trainee, employed: true, practice: 0 });
    expect(fact(step.state, 'market.employer')).toBe(`${a.trainee}-0`);
    expect(fed(step.state).stage).toBe('academy');
    expect(told(step.of('job/hired')[0])).toBe('Dana started a new job, as a special agent trainee.');
    expect(lineFor(sim.content, step.of('federal/reported')[0] as never, { you: 'Dana' }, DEFAULT_START)).toBeNull();
  });

  it('works ten-hour weekdays and swears you in once its weeks are done', () => {
    const trainee = careerOf(sim.content, a.trainee);
    expect(trainee.shifts).toEqual([{ id: 'academy', hour: 7, minute: 0, minutes: 600 }]);
    // About 18 weeks of five ten-hour days.
    expect(trainee.ladder?.practice).toBe(18 * 5 * 600);
    const short = shift(a.trainee, (trainee.ladder?.practice as number) - 1200, { stage: 'academy' });
    expect(short.of('job/promoted')).toEqual([]);
    expect(fed(short.state).stage).toBe('academy');
    const done = shift(a.trainee, (trainee.ladder?.practice as number) - 600, { stage: 'academy' });
    expect(done.of('job/promoted')).toEqual([{ type: 'job/promoted', from: a.trainee, career: 'special-agent' }]);
    expect(fed(done.state).stage).toBe('sworn');
    expect(told(done.of('job/promoted')[0])).toBe('Dana became a special agent.');
  });

  it('ends the application for a trainee let go, quitting, or taking another job', () => {
    const s = play(game, sim, at('wash', { stage: 'cleared' }), { type: 'federal/report' }).state;
    const day = fact(s, 'time.day');
    const quit = play(game, sim, s, { type: 'job/quit' }).state;
    expect(fed(quit)).toMatchObject({ stage: 'none', refused: day });
    expect(fact(quit, 'market.employer')).toBe('');
    // Taken on elsewhere: an offer accepted.
    const offer = { opening: 'x', employer: 'line-cook-0', career: 'line-cook', until: (day as number) + 3 };
    const offered = { ...s, market: { ...(s.market as object), offers: [offer] } } as GameState;
    const took = play(game, sim, offered, { type: 'market/accept', opening: 'x' }).state;
    expect(job(took).career).toBe('line-cook');
    expect(fed(took)).toMatchObject({ stage: 'none', refused: day });
    // A sworn agent who quits keeps what they were.
    const sworn = at('sworn', { stage: 'sworn' });
    expect(fed(play(game, sim, sworn, { type: 'job/quit' }).state).stage).toBe('sworn');
  });
});

describe('the special agent’s grades (D158)', () => {
  it('climbs from grade 10 to 13 a year at a time, in good standing', () => {
    for (const [i, rank] of RANKS.entries()) {
      const c = careerOf(sim.content, rank);
      expect(c.shifts).toEqual([{ id: 'days', hour: 8, minute: 0, minutes: 600 }]);
      expect(c.ladder?.next).toBe(RANKS[i + 1]);
      if (!c.ladder) continue;
      const up = shift(rank, c.ladder.practice - 600);
      expect(up.of('job/promoted').map((b) => b.career)).toEqual([RANKS[i + 1]]);
    }
  });

  it('pays each grade its Detroit rate with availability pay, over fifty hours a week', () => {
    // OPM's 2025 Detroit table, step 1 (CALIBRATION.md), and 25 in 100 more for LEAP.
    const annual = {
      'special-agent': 74_230,
      'special-agent-11': 81_556,
      'special-agent-12': 97_752,
      'special-agent-13': 116_240,
    };
    for (const [rank, base] of Object.entries(annual)) {
      const wage = careerOf(sim.content, rank).wage;
      expect(Math.abs((wage * 52 * 50) / 100 - base * 1.25)).toBeLessThan(26);
    }
    // The trainee: the grade 10 rate, without LEAP, over the same weeks.
    expect(Math.abs((careerOf(sim.content, a.trainee).wage * 52 * 50) / 100 - 74_230)).toBeLessThan(26);
    // No openings: ranks reached only through the Academy and promotion.
    for (const c of [a.trainee, ...RANKS])
      expect(careerOf(sim.content, c).employers).toMatchObject({ staff: 0, share: 0 });
  });
});
