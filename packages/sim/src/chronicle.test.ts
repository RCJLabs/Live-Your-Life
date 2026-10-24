import { type Action, type Beat, type Policy, Rng, seedsOf, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../test/slice.ts';
import { randomFor, steadyFor } from './bot.ts';
import { DEFAULT_START } from './calendar.ts';
import { dateOf, hours, type LineRecord, lineFor, lineRecord, money, QUIET } from './chronicle.ts';
import { createLifeGame } from './game.ts';
import { thiefFor } from './thief.ts';
import type { YouSlice } from './you.ts';

const sim = sliceSim();
const NAMES = { you: 'Dana', coworker: 'Ray', fence: 'Gina', supplier: 'Lou' };
const lines = sim.content.entries<LineRecord>('line').map(([id, l]) => ({ id, ...l }));

/** Events too rare to come up in a short sweep, which the law's own tests raise. */
// law/dismissed (a contest won) left the bots' sweep when D57's alarm changed their weeks; court.test.ts
// raises it.
// job/quit: no bot quits (job/hire.ts); market/module.test.ts raises it.
const RARE = [
  'law/revoked',
  'law/discharged',
  'law/dismissed',
  'home/paid-owed',
  'job/quit',
  // The street trade and a drug case (M2.4): no bot deals until step 7's; law/drugs.test.ts raises them.
  'deal/bought',
  'deal/on-corner',
  'law/searched',
  'law/raided',
  'law/arraigned',
  'law/bailed',
  'law/remanded',
  'law/sentenced',
  'law/released',
  'law/violated',
  // Prison (M2.4, D81): prison/module.test.ts raises them.
  'prison/admitted',
  'prison/paroled',
  'prison/denied',
  'prison/discharged',
  'prison/visited',
  'prison/wrote',
  'prison/working',
];

/** Every event the bots raise in a few lives of each kind, by type. */
function census(): Map<string, Beat[]> {
  const seen = new Map<string, Beat[]>();
  const lives: [() => Policy, ReturnType<typeof createLifeGame>][] = [
    [() => steadyFor(28), sliceGame()],
    [() => randomFor(56), sliceGame()],
    [() => thiefFor(56), createLifeGame({ people: 0 })],
  ];
  for (const [bot, game] of lives)
    for (const seed of seedsOf(12, 'chronicle')) {
      const policy = bot();
      let state = game.init(seed, sim);
      const rng = Rng.create(seed).fork('bot');
      for (let turn = 0; turn < 40_000; turn++) {
        const action = policy.choose(turnFor(game, sim, state, rng, turn)) as Action | null;
        if (!action) break;
        const step = game.reduce(state, action, sim);
        state = step.state;
        for (const b of step.beats) seen.set(b.type, [...(seen.get(b.type) ?? []), b]);
      }
    }
  return seen;
}

describe('the chronicle (D52)', () => {
  it('writes a line for every event a player would see, and fills every one whole', { timeout: 120_000 }, () => {
    const seen = census();
    const gaps = [...seen]
      .filter(([type, beats]) => !(type in QUIET) && !beats.every((b) => lineRecord(sim.content, b)))
      .map(([type]) => type);
    expect(gaps).toEqual([]);
    let written = 0;
    for (const [type, beats] of seen) {
      if (type in QUIET) continue;
      for (const beat of beats.slice(0, 20)) {
        const line = lineFor(sim.content, beat, NAMES, DEFAULT_START);
        expect(line, JSON.stringify(beat)).not.toBeNull();
        expect(line, String(line)).not.toMatch(/[{}]|undefined|NaN/);
        written++;
      }
    }
    expect(written).toBeGreaterThan(300);
    // An event the chronicle leaves out has no line, so marking one quiet can't hide a line.
    expect(lines.filter((l) => l.beat in QUIET).map((l) => l.id)).toEqual([]);
    // Every line is for an event something raises.
    const raised = new Set([...seen.keys(), ...RARE]);
    expect(lines.filter((l) => !raised.has(l.beat)).map((l) => l.id)).toEqual([]);
  });

  it('is third person and past tense: no "you" but the name, a capital, a full stop', () => {
    for (const l of lines) {
      expect(l.text.replace(/\{\w+\}/g, ''), l.id).not.toMatch(/\b(you|your|You|Your)\b/);
      expect(l.text, l.id).toMatch(/^(\{[a-z]+\}|[A-Z])/);
      expect(l.text, l.id).toMatch(/\.$/);
      expect(l.text, l.id).not.toMatch(/!/);
    }
  });

  it('reads a field only to tell apart what it says', () => {
    const rent = (paid: boolean) =>
      lineFor(sim.content, { type: 'home/rent', cents: 55000, paid }, NAMES, DEFAULT_START);
    expect(rent(true)).toBe('Dana paid $550.00 in rent for the month.');
    expect(rent(false)).toBe('Rent of $550.00 came due, and Dana could not pay it all.');
    expect(lineFor(sim.content, { type: 'law/pleaded', plea: 'contest', case: 1 }, NAMES, DEFAULT_START)).toBe(
      'Dana pleaded not guilty.',
    );
    expect(lineFor(sim.content, { type: 'time/passed', from: 0, to: 1 }, NAMES, DEFAULT_START)).toBeNull();
  });

  it('names goods, offences and days as a sentence wants them, and throws for a hole', () => {
    const took = lineFor(sim.content, { type: 'law/took', item: 'candy' }, NAMES, DEFAULT_START);
    expect(took).toBe('Dana took a candy bar from the corner shop without paying.');
    const ticket = { type: 'law/ticketed', case: 1, offence: 'retail-fraud-3', court: 30, demand: 5000 };
    expect(lineFor(sim.content, ticket, NAMES, DEFAULT_START)).toBe(
      'The police wrote Dana a ticket for retail fraud in the third degree, with a court date on Wednesday 2 July.',
    );
    expect(() => lineFor(sim.content, { type: 'ties/asked', day: 3 }, { you: 'Dana' }, DEFAULT_START)).toThrow(
      'names the coworker, and there is none',
    );
    expect(() => lineFor(sim.content, { type: 'job/late', day: 3 }, NAMES, DEFAULT_START)).toThrow(
      "which job/late doesn't carry",
    );
  });

  it('formats money, hours and dates from the rules', () => {
    expect([money(0), money(5), money(123456), money(-250)]).toEqual(['$0.00', '$0.05', '$1,234.56', '-$2.50']);
    expect([hours(480), hours(450), hours(45), hours(60), hours(61)]).toEqual([
      '8 hours',
      '7 hours and 30 minutes',
      '45 minutes',
      '1 hour',
      '1 hour and 1 minute',
    ]);
    // Monday 2 June 2025 is day 0.
    expect([dateOf(DEFAULT_START, 0), dateOf(DEFAULT_START, 29), dateOf(DEFAULT_START, 213)]).toEqual([
      'Monday 2 June',
      'Tuesday 1 July',
      'Thursday 1 January',
    ]);
  });
});

describe('you (D52)', () => {
  it('have a name from the seed and the pool, the same for a seed', () => {
    const game = sliceGame();
    const you = (seed: string) => game.init(seed, sim).you as YouSlice;
    expect(you('a')).toEqual(you('a'));
    const names = new Set(Array.from({ length: 50 }, (_, i) => you(`n-${i}`).first));
    expect(names.size).toBeGreaterThan(20);
    expect(createLifeGame({ people: 0 }).init('none', sliceSim({})).you).toEqual({
      first: 'You',
      last: '',
      pronouns: 'they',
      commute: null,
    });
  });
});
