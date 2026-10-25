import type { Beat, GameState, TimeSlice } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { arraigned, untilCase } from '../../test/case.ts';
import { advance, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { DEFAULT_START, MINUTES_PER_DAY } from '../calendar.ts';
import { lineFor, lineRecord, QUIET } from '../chronicle.ts';
import { tradeOf } from '../deal/records.ts';
import type { DealSlice } from '../deal/state.ts';
import { VIOLATION_DAYS } from './drugs.ts';
import { offenceOf } from './records.ts';
import type { LawSlice } from './state.ts';

const sim = sliceSim();
const game = sliceGame();
const trade = tradeOf(sim.content);
const law = (s: GameState) => s.law as LawSlice;
const deal = (s: GameState) => s.deal as DealSlice;
const mode = (s: GameState) => game.allowedActions(s).join(',');

const court = (s: GameState) => {
  const k = law(s).cases[0] as { court: number };
  const now = s.time as TimeSlice;
  return k.court * MINUTES_PER_DAY + 9 * 60 - 7 * 60 - (now.tick as number);
};

describe('a drug case (M2.4, D78, D82)', () => {
  it('sends the police once enough sales are seen, at a time you are told, days later', () => {
    const { state, beats } = untilCase('told');
    const raid = law(state).visits.find((v) => v.why === 'raid');
    expect(raid).toBeDefined();
    const notice = beats.find((b: Beat) => b.type === 'law/notice' && b.what === 'raid');
    const days = ((notice?.tick as number) - ((state.time as TimeSlice).tick as number)) / MINUTES_PER_DAY;
    expect(days).toBeGreaterThan(trade.police.raid.min - 1);
    expect(days).toBeLessThan(trade.police.raid.max + 1);
  });

  it('searches you, takes what you hold, and charges delivery by what was seen and found', () => {
    const { arrested, bail } = arraigned('raid');
    expect(deal(arrested).held).toBe(0);
    expect(deal(arrested).seen).toEqual([]);
    const k = law(arrested).cases[0];
    expect(k?.offence).toBe('delivery-cocaine-50');
    expect(k?.evidence).toBe('found');
    expect(mode(arrested)).toContain('law/wait');
    expect(mode(bail).split(',').sort()).toEqual(['law/post-bail', 'law/remand']);
  });

  it('charges delivery on the sales seen alone when the raid finds nothing on you', () => {
    const { state } = untilCase('raid-empty');
    // Sold out before they came: nothing to find, but the sales were seen.
    let s = { ...state, deal: { ...deal(state), held: 0 } } as GameState;
    for (let i = 0; i < 12 && law(s).cases.length === 0; i++) s = play(game, sim, s, advance(MINUTES_PER_DAY)).state;
    const k = law(s).cases[0];
    expect(k?.evidence).toBe('seen');
    expect(k?.offence.startsWith('delivery-')).toBe(true);
  });

  it('lets you home on a tenth of the bond, given back when the case ends, or holds you to the court date', () => {
    const { bail } = arraigned('bail', 200, 80_000);
    const cash = (s: GameState) => game.fact(s, 'economy.amount', { resource: 'cash' }, sim) as number;
    const posted = Math.floor((trade.bail.bond * trade.bail.posted) / 100);
    const home = play(game, sim, bail, { type: 'law/post-bail' });
    expect(cash(home.state)).toBe(cash(bail) - posted);
    expect(home.of('law/notice').some((b) => b.what === 'court')).toBe(true);
    // In court on the day, the bail comes back with the plea.
    const there = play(game, sim, home.state, advance(court(home.state)), { type: 'law/attend' });
    const pleaded = play(game, sim, there.state, { type: 'law/plead', plea: 'guilty' });
    expect(cash(pleaded.state)).toBe(cash(there.state) + posted);
    // Without the money, only jail until then.
    const { bail: poor } = arraigned('poor', 200, 0);
    expect(refusal(game, sim, poor, { type: 'law/post-bail' })).toBe('not-enough');
    const held = play(game, sim, poor, { type: 'law/remand' }, { type: 'law/wait' });
    expect(held.of('law/hearing').length).toBe(1);
    expect(mode(held.state)).toContain('law/plead');
  });

  it('sentences a first delivery to jail and probation, and a repeat to prison', () => {
    const { bail } = arraigned('first', 200, 0);
    const inCourt = play(game, sim, bail, { type: 'law/remand' }, { type: 'law/wait' }).state;
    expect(game.allowedActions(inCourt)).not.toContain('law/plead:hyta');
    const first = play(game, sim, inCourt, { type: 'law/plead', plea: 'guilty' });
    const s = first.of('law/sentenced')[0] as Record<string, number>;
    const o = offenceOf(sim.content, 'delivery-cocaine-50');
    expect(s.prison).toBe(0);
    expect(s.jail).toBeGreaterThanOrEqual(o.first?.jail.min as number);
    expect(s.jail).toBeLessThanOrEqual(o.first?.jail.max as number);
    expect(law(first.state).probation).toMatchObject({ offence: 'delivery-cocaine-50', trainee: false });
    expect(law(first.state).convictions).toBe(1);
    const repeat = { ...inCourt, law: { ...law(inCourt), convictions: 1 } } as GameState;
    const again = play(game, sim, repeat, { type: 'law/plead', plea: 'guilty' });
    const months = law(again.state).prison?.months as number;
    expect(months).toBeGreaterThanOrEqual(o.repeat?.prison.min as number);
    expect(months).toBeLessThanOrEqual(o.repeat?.prison.max as number);
  });

  it('offers a deferral on a first possession, never on delivery, and contests at the evidence’s odds', () => {
    const { bail } = arraigned('contest', 200, 0);
    const inCourt = play(game, sim, bail, { type: 'law/remand' }, { type: 'law/wait' }).state;
    const k = law(inCourt).cases[0] as { id: number };
    const preview = game.preview(inCourt, [{ effect: 'contest', case: k.id }], sim)[0] as unknown as { chance: number };
    expect(preview.chance).toBe(trade.contest.found);
    const possession = {
      ...inCourt,
      law: { ...law(inCourt), cases: law(inCourt).cases.map((c) => ({ ...c, offence: 'possession-cocaine-25' })) },
    } as GameState;
    const pleas = (s: GameState) =>
      game
        .options(s, sim)
        .filter((a) => a.type === 'law/plead')
        .map((a) => a.plea);
    expect(pleas(inCourt)).toEqual(['guilty', 'contest']);
    expect(pleas(possession)).toEqual(['guilty', 'hyta', 'contest']);
  });

  it('jails you for a violation when a sentence’s probation is broken', () => {
    const { bail } = arraigned('violate', 200, 0);
    const inCourt = play(game, sim, bail, { type: 'law/remand' }, { type: 'law/wait' }).state;
    let s = play(game, sim, inCourt, { type: 'law/plead', plea: 'guilty' }).state;
    if (mode(s).includes('law/wait')) s = play(game, sim, s, { type: 'law/wait' }).state;
    // Every check-in missed: probation is revoked, and the police come.
    let violated: Beat[] = [];
    for (let d = 0; d < 60 && violated.length === 0; d++) {
      const r = play(game, sim, s, mode(s).includes('law/wait') ? { type: 'law/wait' } : advance(MINUTES_PER_DAY));
      s = r.state;
      violated = r.of('law/violated');
    }
    expect(violated[0]?.days).toBe(VIOLATION_DAYS);
    expect(law(s).probation).toBeNull();
    expect(mode(s)).toContain('law/wait');
  });

  it('gives every event of a case, from the corner to the sentence, a whole line in the chronicle', () => {
    const names = { you: 'Dana', coworker: 'Ray', fence: 'Gina', supplier: 'Lou' };
    const beats: Beat[] = [];
    const { state, beats: corner } = untilCase('lines');
    beats.push(...corner);
    let s = state;
    for (let i = 0; i < 12 && law(s).cases.length === 0; i++) {
      const r = play(game, sim, s, advance(MINUTES_PER_DAY));
      beats.push(...r.beats);
      s = r.state;
    }
    for (const action of [{ type: 'law/wait' }, { type: 'law/remand' }, { type: 'law/wait' }]) {
      const r = play(game, sim, s, action);
      beats.push(...r.beats);
      s = r.state;
    }
    beats.push(...play(game, sim, s, { type: 'law/plead', plea: 'guilty' }).beats);
    const types = new Set(beats.map((b) => b.type));
    for (const t of ['deal/on-corner', 'law/raided', 'law/arraigned', 'law/remanded', 'law/sentenced'])
      expect(types, t).toContain(t);
    for (const b of beats) {
      if (b.type in QUIET) continue;
      expect(lineRecord(sim.content, b), b.type).toBeDefined();
      expect(lineFor(sim.content, b, names, DEFAULT_START), b.type).not.toMatch(/\{|undefined/);
    }
  });
});
