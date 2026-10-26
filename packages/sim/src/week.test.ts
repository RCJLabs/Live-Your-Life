import {
  type Action,
  type Condition,
  type Policy,
  playRun,
  Rng,
  type SweepReport,
  seedsOf,
  stateHash,
  sweep,
  turnFor,
} from '@eb/core';
import { describe, expect, it } from 'vitest';
import { LINE_COOK, sliceGame, sliceSim } from '../test/slice.ts';
import { randomLifePolicy, steadyFor, steadyPolicy } from './bot.ts';
import { DEFAULT_START } from './calendar.ts';
import { RENT, START_CASH } from './dials.ts';
import { careerOf, eventsFor, shiftEventOf } from './job/records.ts';

const game = sliceGame();
const sim = sliceSim();
const MAX_TURNS = 3000;

/** The lowest, middle and highest a metric read at the end of the runs. */
const spread = (report: SweepReport, i: number): number[] => {
  const metric = report.metrics[i];
  return metric?.kind === 'number' && metric.summary !== null
    ? [metric.summary.min, metric.summary.p50, metric.summary.max]
    : [];
};
const range = (report: SweepReport, i: number): number[] => {
  const all = spread(report, i);
  return all.length === 0 ? [] : [all[0] as number, all[2] as number];
};

/** How many runs emitted a beat at least once. */
const reached = (report: SweepReport, type: string): number =>
  report.beats.find((beat) => beat.type === type)?.runs ?? 0;

// M0.2's gate, and M1.3's: bots play a week of the slice's life headless, the line cook hired at
// the start, choosing only what the game offers, and the game accepts every offer.
// `node packages/sim/test/week-bench.ts` times the same sweep.
describe('a week of life, headless', () => {
  it('plays 500 seeded weeks with the steady bot: every week finished, every offer accepted, every run paid', {
    timeout: 180_000,
  }, () => {
    const { report } = sweep(game, sim, {
      seeds: seedsOf(500, 'week'),
      policy: steadyPolicy,
      maxTurns: MAX_TURNS,
      metrics: [
        { fact: 'life.need', args: { need: 'health' }, label: 'health' },
        { fact: 'economy.amount', args: { resource: 'cash' }, label: 'cash' },
        { fact: 'time.day', label: 'day' },
      ],
    });
    expect(report.ends).toEqual({ ended: 0, stopped: 500, capped: 0 });
    expect(report.refused.count).toBe(0);
    // Seeds must matter: the postings and the bot's draws make the weeks differ.
    expect(report.distinct).toBeGreaterThan(450);
    // A week is seven days, not six or eight: every run stops on the morning of day 7.
    expect(range(report, 2)).toEqual([7, 7]);
    // M1.3: in every run the bot signs up, works and is paid.
    for (const beat of ['job/signed-up', 'job/started', 'job/shift-over', 'job/paid']) {
      expect(reached(report, beat), beat).toBe(500);
    }
    // The steady bot's play, not facts about the game (Readings has the spreads). Health holds
    // up, though it works through exhaustion and a dinner shift, then the next day's breakfast,
    // leaves eight hours between. Most weeks end with more cash than they began: a week whose
    // shifts fall after Thursday is paid little on the Friday, and its meals still cost.
    expect(range(report, 0)[0]).toBeGreaterThanOrEqual(60);
    expect(spread(report, 1)[1]).toBeGreaterThan(START_CASH);
  });

  it('lives through rent it cannot pay: owed on the 1st, paid off after a payday, nothing refused', {
    timeout: 180_000,
  }, () => {
    // Monday 30 June: hired the day before rent comes due, with the starting cash and no pay
    // yet, the refusal a life has to recover from. The first Friday pays Tuesday to Thursday's
    // shifts, not enough for $550; the second covers it, so this runs two weeks.
    const monthEnd = sliceGame({ start: { ...DEFAULT_START, day: 30 } });
    const { report } = sweep(monthEnd, sim, {
      seeds: seedsOf(200, 'rent'),
      policy: steadyFor(14, 'steady-fortnight'),
      maxTurns: 2 * MAX_TURNS,
      metrics: [
        { fact: 'home.owed', label: 'owed' },
        { fact: 'life.need', args: { need: 'health' }, label: 'health' },
      ],
    });
    expect(report.ends).toEqual({ ended: 0, stopped: 200, capped: 0 });
    expect(report.refused.count).toBe(0);
    expect(reached(report, 'home/rent')).toBe(200);
    // The steady bot's play: its pay covers what is owed, and it pays once a week of meals can
    // be kept back. Paying with its last cash, it starved: health fell under 20% in a tenth of runs.
    // Since M2.7 a shift can go to a sick call, unpaid (D104): a life that loses one may not
    // have the rent by the second payday. Only those fall short.
    const sick = reached(report, 'job/called-in-sick');
    expect(reached(report, 'home/paid-owed') + sick).toBeGreaterThanOrEqual(200);
    expect(sick).toBeLessThan(20);
    // Most owe nothing at the end; one short of a sick day's pay may still owe the month.
    expect(range(report, 0)[0]).toBe(0);
    expect(range(report, 0)[1]).toBeLessThanOrEqual(sick > 0 ? RENT : 0);
    expect(range(report, 1)[0]).toBeGreaterThanOrEqual(60);
  });

  it('plays 200 weeks with the random bot: every playable offer accepted', { timeout: 180_000 }, () => {
    const { report } = sweep(game, sim, {
      seeds: seedsOf(200, 'random'),
      policy: randomLifePolicy,
      maxTurns: MAX_TURNS,
    });
    expect(report.ends).toEqual({ ended: 0, stopped: 200, capped: 0 });
    expect(report.refused.count).toBe(0);
    // Not showing up is what a random bot does best: some are let go.
    expect(reached(report, 'job/let-go')).toBeGreaterThan(50);
  });

  // Two whole weeks played and one replayed: a few seconds, more on a slow runner, so not the default 5 s.
  it('plays the same week twice for a seed, and its log replays to the same state', { timeout: 30_000 }, () => {
    for (const seed of seedsOf(20, 'replay')) {
      const first = playRun(game, sim, { seed, policy: steadyPolicy, maxTurns: MAX_TURNS });
      const second = playRun(game, sim, { seed, policy: steadyPolicy, maxTurns: MAX_TURNS });
      expect(stateHash(second.state)).toBe(stateHash(first.state));
      let replayed = game.init(seed, sim);
      for (const action of first.log) replayed = game.reduce(replayed, action, sim).state;
      expect(stateHash(replayed)).toBe(stateHash(first.state));
    }
  });
});

/**
 * M1.3's gates on shift events (D40), played turn by turn so each choice can be held to what
 * was shown: every event comes up and every choice is taken; the odds shown are the odds rolled;
 * and an event is drawn only while its condition holds.
 */
describe('shift events in the bots’ weeks', () => {
  function playWeeks(policy: Policy, seeds: readonly string[], taken: Map<string, number>) {
    let checked = 0;
    for (const seed of seeds) {
      let state = game.init(seed, sim);
      const rng = Rng.create(seed).fork('bot');
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const t = turnFor(game, sim, state, rng, turn);
        const action = policy.choose(t) as Action | null;
        if (!action) break;
        const data = t.mode.id === 'shift-event' ? (t.mode.data as { event: string; day: number }) : null;
        const shown = data
          ? (t.preview([{ effect: 'shift-choice', ...data, choice: action.choice }])[0]?.chance as number)
          : null;
        const step = game.reduce(state, action, sim);
        expect(step.accepted, JSON.stringify(action)).toBe(true);
        state = step.state;
        if (data && shown !== null) {
          const key = `${data.event}/${String(action.choice)}`;
          taken.set(key, (taken.get(key) ?? 0) + 1);
          const rolled = step.beats.find((b) => b.type === 'logic/rolled');
          // The beat names the chance of the outcome that came up: the first is the choice's odds.
          const chance =
            rolled === undefined ? 100 : rolled.outcome === 0 ? rolled.chance : 100 - (rolled.chance as number);
          expect(chance, key).toBe(shown);
          checked++;
        }
        for (const beat of step.beats.filter((b) => b.type === 'job/event')) {
          const when = shiftEventOf(sim.content, beat.event as string).when;
          // Drawn at the tick the action ended on, which the state now holds.
          if (when) expect(game.check(state, when as Condition, sim), String(beat.event)).toBe(true);
        }
      }
    }
    return checked;
  }

  it('comes up for every event, takes every choice, and rolls the odds it showed', { timeout: 240_000 }, () => {
    const taken = new Map<string, number>();
    const checked =
      playWeeks(steadyPolicy, seedsOf(500, 'events'), taken) + playWeeks(randomLifePolicy, seedsOf(500, 'odds'), taken);
    const career = careerOf(sim.content, LINE_COOK);
    const all = eventsFor(sim.content, career).flatMap(([id, e]) => e.choices.map((c) => `${id}/${c.id}`));
    expect([...all].filter((key) => !taken.has(key))).toEqual([]);
    expect(checked).toBeGreaterThan(500);
  });
});
