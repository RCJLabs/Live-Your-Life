import type { Action, GameState } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { circle, dating, fact, game, offered, rolled, shown, sim, withCircle } from '../../test/couple.ts';
import { doing, play, refusal, waitUntil } from '../../test/slice.ts';
import { RENT } from '../dials.ts';
import type { Roster } from '../people/roster.ts';
import { rosterNow } from './meet.ts';
import { courtshipOf } from './records.ts';
import { newTie, type Tie } from './state.ts';

const court = courtshipOf(sim.content);
const cash = (s: GameState) => fact(s, 'economy.amount', { resource: 'cash' }) as number;
const tie = (s: GameState, person: number) => circle(s).ties.find((t) => t.person === person) as Tie;
/** The tie changed by hand, as time together would have changed it. */
const set = (s: GameState, person: number, change: Partial<Tie>) =>
  withCircle(s, { ties: circle(s).ties.map((t) => (t.person === person ? { ...t, ...change } : t)) });
const advance = (s: GameState, minutes: number) => play(game, sim, s, { type: 'time/advance', minutes }).state;

/** An ask taken until it's a yes: each no is set aside, with a minute passed so the next roll is another. */
function untilYes(state: GameState, person: number, action: Action, beat: string): GameState {
  let s = state;
  for (let k = 0; k < 60; k++) {
    const r = play(game, sim, s, action);
    if (r.of(beat)[0]?.yes === true) return r.state;
    s = advance(set(s, person, { proposed: -1, dated: tie(s, person).dated }), 1);
  }
  throw new Error(`${beat}: never a yes`);
}

/** Dating for `days` already, at a weekday's 10:00. */
function together(days: number): { state: GameState; who: number } {
  const { state, who } = dating();
  const at = play(game, sim, state, doing('sleep', 600), waitUntil(10)).state;
  return { state: set(at, who, { since: (fact(at, 'time.day') as number) - days, regard: 90 }), who };
}

describe('life together (M2.6 step 3, D90, D95)', () => {
  it('stays the night after a date, at the odds shown, and not once the evening is over', () => {
    const { state, who } = dating();
    const evening = play(game, sim, state, doing('sleep', 600), waitUntil(court.date.hour)).state;
    const after = play(game, sim, evening, { type: 'circle/go-on-date', person: who }).state;
    expect([...new Set(offered(after, 'circle/stay-night'))]).toEqual([who]);
    const odds = shown(after, 'night-roll', who).chance;
    const r = play(game, sim, after, { type: 'circle/stay-night', person: who, protect: true });
    const yes = r.of('circle/stayed')[0]?.yes === true;
    expect(rolled(r.beats)[0]?.chance).toBe(yes ? odds : 100 - odds);
    expect(tie(r.state, who).nights).toBe(yes ? 1 : 0);
    expect(offered(r.state, 'circle/stay-night')).toEqual([]);
    const late = advance(after, court.night.after + 1);
    expect(offered(late, 'circle/stay-night')).toEqual([]);
  });

  it('asks a partner to move in only after the record’s days, at odds that grow with time, and one at a time', () => {
    const early = together(court.moveIn.after - 1);
    expect(offered(early.state, 'circle/ask-in')).toEqual([]);
    const { state, who } = together(court.moveIn.after);
    expect(offered(state, 'circle/ask-in')).toEqual([who]);
    const later = set(state, who, { since: (fact(state, 'time.day') as number) - 360 });
    expect(shown(later, 'move-in-roll', who).chance).toBeGreaterThan(shown(state, 'move-in-roll', who).chance);
    const moved = untilYes(state, who, { type: 'circle/ask-in', person: who }, 'circle/moved-in');
    expect(tie(moved, who).living).toBe(true);
    expect(fact(moved, 'circle.living')).toBe(who);
    // A second partner, dating as long: not while someone lives with you.
    const second = {
      ...newTie(who === 600 ? 601 : 600, 6000, 0),
      status: 'dating' as const,
      since: tie(moved, who).since,
    };
    const two = withCircle(moved, { ties: [...circle(moved).ties, second] });
    expect(offered(two, 'circle/ask-in')).toEqual([]);
    expect(refusal(game, sim, two, { type: 'circle/ask-in', person: second.person })).toBe('cannot-ask');
  });

  it('takes a working partner’s share of the rent when it comes due, and none from one out of work', () => {
    const { state } = together(400);
    const roster = rosterNow({ fact: (id: string) => fact(state, id), content: sim.content } as never) as Roster;
    const works = (p: number) => (roster.people[p]?.work ?? -1) >= 0;
    let checked = 0;
    for (const working of [true, false]) {
      let p = 3;
      while (works(p) !== working) p++;
      const living = withCircle(state, { ties: [{ ...newTie(p, 6000, 0), status: 'dating', living: true }] });
      // To the 1st: the life starts on 2 June.
      const minutes = (29 - (fact(living, 'time.day') as number)) * 1440 + 14 * 60 + 5;
      const r = play(game, sim, living, { type: 'time/advance', minutes });
      expect(r.of('home/rent').length).toBe(1);
      expect(r.of('circle/shared-rent').map((b) => b.cents)).toEqual(working ? [(RENT * court.share.rent) / 100] : []);
      checked++;
    }
    expect(checked).toBe(2);
  });

  it('proposes after the record’s days; the licence takes the clerk’s hours, its fee and its wait', () => {
    const { state, who } = together(court.propose.after);
    expect(offered(state, 'circle/propose')).toEqual([who]);
    const engaged = untilYes(state, who, { type: 'circle/propose', person: who }, 'circle/proposed');
    expect(tie(engaged, who).status).toBe('engaged');
    const night = advance(engaged, (22 - 10) * 60);
    expect(refusal(game, sim, night, { type: 'circle/licence', person: who })).toBe('clerk-closed');
    const before = cash(engaged);
    const licensed = play(game, sim, engaged, { type: 'circle/licence', person: who }).state;
    expect(cash(licensed)).toBe(before - court.licence.fee);
    expect(refusal(game, sim, licensed, { type: 'circle/marry', person: who })).toBe('no-licence');
    // After the wait, on a weekday in office hours.
    let s = licensed;
    for (let d = 0; d < court.licence.wait + 4 && offered(s, 'circle/marry').length === 0; d++)
      s = play(game, sim, s, doing('sleep', 600), waitUntil(10)).state;
    expect(offered(s, 'circle/marry')).toEqual([who]);
    const wed = play(game, sim, s, { type: 'circle/marry', person: who });
    expect(wed.of('circle/married')).toHaveLength(1);
    expect(tie(wed.state, who).status).toBe('married');
    expect(refusal(game, sim, wed.state, { type: 'circle/break-up', person: who })).toBe('married');
  });

  it('lets a licence lapse unused after its days', () => {
    const { state, who } = together(court.propose.after);
    const engaged = untilYes(state, who, { type: 'circle/propose', person: who }, 'circle/proposed');
    let s = play(game, sim, engaged, { type: 'circle/licence', person: who }).state;
    let lapsed = false;
    for (let d = 0; d <= court.licence.valid + 1 && !lapsed; d++) {
      const r = play(game, sim, s, doing('sleep', 600), waitUntil(23));
      lapsed = r.of('circle/licence-lapsed').length > 0;
      s = r.state;
    }
    expect(lapsed).toBe(true);
    expect(tie(s, who).licence).toBeNull();
  });

  it('separates a marriage and moves them out; a divorce costs its fee and is granted after its wait', () => {
    const { state, who } = together(400);
    const married = set(state, who, { status: 'married', living: true });
    const apart = play(game, sim, married, { type: 'circle/separate', person: who }).state;
    expect([tie(apart, who).status, tie(apart, who).living]).toEqual(['separated', false]);
    const before = cash(apart);
    const filed = play(game, sim, apart, { type: 'circle/file-divorce', person: who });
    expect(cash(filed.state)).toBe(before - court.divorce.fee);
    const hearing = filed.of('circle/filed')[0]?.hearing as number;
    expect(hearing).toBe((fact(apart, 'time.day') as number) + court.divorce.wait);
    let s = filed.state;
    let granted = false;
    for (let d = 0; d <= court.divorce.wait + 1 && !granted; d++) {
      const r = play(game, sim, s, doing('sleep', 600), waitUntil(10));
      granted = r.of('circle/divorced').length > 0;
      if (!granted) expect(fact(r.state, 'time.day') as number).toBeLessThanOrEqual(hearing);
      s = r.state;
    }
    expect(granted).toBe(true);
    expect(tie(s, who).status).toBe('divorced');
  });

  it('a married partner who ends it separates, and moves out', () => {
    const { state, who } = together(400);
    const low = set(state, who, { status: 'married', living: true, regard: court.leave.regard - 1 });
    let s = low;
    let ended = false;
    for (let d = 0; d < 80 && !ended; d++) {
      const r = play(game, sim, set(s, who, { regard: court.leave.regard - 1 }), doing('sleep', 600), waitUntil(10));
      ended = r.of('circle/broke-up').some((b) => b.by === 'them');
      s = r.state;
    }
    expect(ended).toBe(true);
    expect([tie(s, who).status, tie(s, who).living]).toEqual(['separated', false]);
  });
});
