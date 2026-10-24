import { type Beat, type GameState, Rng, turnFor } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { game, inCourt, law, mode, sim } from '../../test/case.ts';
import { play } from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor, lineRecord, QUIET } from '../chronicle.ts';
import { offenceOf } from '../law/records.ts';
import type { PrisonSlice } from './module.ts';
import { paroleOdds } from './module.ts';
import { prisonOf } from './records.ts';

const prison = (s: GameState) => s.prison as PrisonSlice;
const P = prisonOf(sim.content);
const DAY = { type: 'prison/day' };
const cash = (s: GameState) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
const regard = (s: GameState) => game.fact(s, 'ties.regard', undefined, sim) as number;

/** Sentenced to prison on a second conviction, and taken in. */
function admitted(seed: string, known = true) {
  const s = inCourt(seed);
  const ties = s.ties as { together: number };
  const repeat = {
    ...s,
    law: { ...law(s), convictions: 1 },
    ties: { ...ties, together: known ? 20_000 : 0 },
  } as GameState;
  return play(game, sim, repeat, { type: 'law/plead', plea: 'guilty' });
}

/** Days inside, one action a day as the page passes them, with the beats. */
function days(s: GameState, n: number, each?: (s: GameState) => GameState) {
  const beats: Beat[] = [];
  let now = s;
  for (let d = 0; d < n && mode(now).includes('prison/day'); d++) {
    if (each) now = each(now);
    const r = play(game, sim, now, DAY);
    beats.push(...r.beats);
    now = r.state;
  }
  return { state: now, beats, of: (t: string) => beats.filter((b) => b.type === t) };
}

describe('prison (M2.4, D81)', () => {
  it('takes in a prison sentence: the minimum to serve, the most it can hold, a day at a time', () => {
    const r = admitted('in');
    const a = r.of('prison/admitted')[0] as Beat;
    const months = law(r.state).prison?.months as number;
    const day = game.fact(r.state, 'time.day', undefined, sim) as number;
    expect(a.minimum).toBe(day + Math.floor((months * 365) / 12));
    expect(a.maximum).toBe(day + offenceOf(sim.content, 'delivery-cocaine-50').days);
    expect(mode(r.state).split(',').sort()).toEqual([
      'prison/day',
      'prison/work',
      'prison/write',
      'time/advance',
      'time/elapse',
    ]);
    const next = play(game, sim, r.state, DAY);
    expect(game.fact(next.state, 'time.day', undefined, sim)).toBe(day + 1);
  });

  it('serves the whole minimum before the board hears it, and rolls the hearing at the odds shown', () => {
    const r = admitted('minimum');
    const toHearing = game.fact(r.state, 'prison.to-hearing', undefined, sim) as number;
    const before = days(r.state, toHearing - 1);
    expect(before.of('prison/hearing')).toEqual([]);
    const shown = turnFor(game, sim, before.state, Rng.create('x'), 0).preview([
      { effect: 'parole-odds' },
    ])[0] as unknown as {
      chance: number;
    };
    expect(shown.chance).toBe(paroleOdds({ content: sim.content, fact: () => 0 }, prison(before.state).standing));
    const heard = days(before.state, 1);
    expect(heard.of('prison/hearing')).toEqual([{ type: 'prison/hearing', chance: shown.chance }]);
    const rolled = heard.of('logic/rolled')[0] as Beat;
    expect(rolled.outcome === 0 ? rolled.chance : 100 - (rolled.chance as number)).toBe(shown.chance);
  });

  it('paroles you onto the law’s probation, or hears you again a year on', () => {
    let paroled = false;
    let denied = false;
    for (let i = 0; i < 12 && !(paroled && denied); i++) {
      const r = admitted(`parole-${i}`);
      const hearing = days(r.state, game.fact(r.state, 'prison.to-hearing', undefined, sim) as number);
      if (hearing.of('prison/paroled').length > 0) {
        paroled = true;
        expect(mode(hearing.state)).not.toContain('prison/day');
        expect(law(hearing.state).probation).toMatchObject({ trainee: false, offence: 'delivery-cocaine-50' });
        expect(law(hearing.state).prison).toBeNull();
      }
      const d = hearing.of('prison/denied')[0];
      if (d) {
        denied = true;
        expect(d.again).toBe(Math.floor((P.parole.again * 365) / 12));
        expect(game.fact(hearing.state, 'prison.to-hearing', undefined, sim)).toBe(d.again);
      }
    }
    expect([paroled, denied]).toEqual([true, true]);
  });

  it('pays the prison job by the day and lifts your standing by the month; idle, it falls', () => {
    const r = admitted('work');
    const working = play(game, sim, r.state, { type: 'prison/work' }).state;
    const month = days(working, 30);
    expect(cash(month.state)).toBe(cash(working) + 30 * P.wage);
    expect(prison(month.state).standing).toBe(P.standing.start + P.standing.working);
    const idle = days(r.state, 30);
    expect(prison(idle.state).standing).toBe(P.standing.start - P.standing.idle);
  });

  it('cools a tie a month without a letter, and keeps it with one', () => {
    const r = admitted('letters');
    const silent = days(r.state, 30);
    const quiet = silent.beats.filter((b) => b.type === 'ties/remembered' && b.act === P.acts.silent);
    expect(quiet.length).toBe(1);
    const offered = (s: GameState) => game.options(s, sim).some((a) => a.type === 'prison/write');
    const write = (s: GameState) => (offered(s) ? play(game, sim, s, { type: 'prison/write' }).state : s);
    const kept = days(r.state, 30, write);
    expect(kept.beats.filter((b) => b.type === 'ties/remembered' && b.act === P.acts.silent)).toEqual([]);
    // A letter a week, the last within the week before the month turned.
    expect(prison(kept.state).wrote).toBeGreaterThan(prison(kept.state).month - P.letters.every);
    expect(regard(kept.state)).toBeGreaterThan(regard(silent.state));
    // Nobody to write to: no letter offered.
    expect(offered(admitted('alone', false).state)).toBe(false);
  });

  it('is visited by someone whose regard holds, and not by one whose has fallen', () => {
    const r = admitted('visit');
    const warm = { ...r.state, ties: { ...(r.state.ties as object), regard: P.visit.regard } } as GameState;
    expect(days(warm, 30).of('prison/visited').length).toBe(1);
    const cold = { ...r.state, ties: { ...(r.state.ties as object), regard: P.visit.regard - 10 } } as GameState;
    expect(days(cold, 30).of('prison/visited')).toEqual([]);
  });

  it('lets the outside go on: rent owed, the job lost', () => {
    const r = admitted('outside');
    const broke = { ...r.state, economy: { ...(r.state.economy as object), amounts: { cash: 0 } } } as GameState;
    const later = days(broke, 70);
    expect(game.fact(later.state, 'home.owed', undefined, sim) as number).toBeGreaterThan(0);
    expect(game.fact(later.state, 'job.employed', undefined, sim)).toBe(false);
  });

  it('discharges you at the most the sentence can hold you', () => {
    const r = admitted('max');
    const term = prison(r.state).term as { maximum: number; hearing: number };
    const near = {
      ...r.state,
      prison: { ...prison(r.state), term: { ...term, hearing: term.maximum + 1 } },
    } as GameState;
    const toMax = game.fact(near, 'prison.to-maximum', undefined, sim) as number;
    const at = {
      ...near,
      prison: { ...prison(near), term: { ...term, hearing: term.maximum + 1, maximum: term.maximum - toMax + 3 } },
    } as GameState;
    const out = days(at, 5);
    expect(out.of('prison/discharged').length).toBe(1);
    expect(law(out.state).probation).toBeNull();
    expect(mode(out.state)).not.toContain('prison/day');
  });

  it('gives every event inside a whole line in the chronicle', () => {
    const names = { you: 'Dana', coworker: 'Ray', fence: 'Gina', supplier: 'Lou' };
    const r = admitted('lines');
    const beats: Beat[] = [...r.beats];
    let s = play(game, sim, r.state, { type: 'prison/work' }, { type: 'prison/write' }, { type: 'prison/work' }).state;
    beats.push(
      ...play(game, sim, r.state, { type: 'prison/work' }, { type: 'prison/write' }, { type: 'prison/work' }).beats,
    );
    s = { ...s, ties: { ...(s.ties as object), regard: 90 } } as GameState;
    const inside = days(s, (game.fact(s, 'prison.to-hearing', undefined, sim) as number) + 400);
    beats.push(...inside.beats);
    const types = new Set(beats.map((b) => b.type));
    for (const t of ['prison/admitted', 'prison/working', 'prison/wrote', 'prison/visited'])
      expect(types, t).toContain(t);
    expect(types.has('prison/paroled') || types.has('prison/denied')).toBe(true);
    for (const b of beats) {
      if (b.type in QUIET) continue;
      expect(lineRecord(sim.content, b), b.type).toBeDefined();
      expect(lineFor(sim.content, b, names, DEFAULT_START), b.type).not.toMatch(/\{|undefined/);
    }
  });
});
