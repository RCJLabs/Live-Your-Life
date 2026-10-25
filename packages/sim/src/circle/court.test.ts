import { describe, expect, it } from 'vitest';
import { circle, dating, fact, game, offered, rolled, shown, sim, someone, withCircle } from '../../test/couple.ts';
import { doing, play, refusal, waitUntil } from '../../test/slice.ts';
import { courtshipOf } from './records.ts';
import { newTie, type Tie } from './state.ts';

const court = courtshipOf(sim.content);

describe('courting (M2.6 step 2, D93, D94)', () => {
  it('talks only with someone where you are, once an hour, at the odds shown', () => {
    const { state, who } = someone();
    expect(offered(state, 'circle/talk')).toContain(who);
    const odds = shown(state, 'talk-roll', who).chance;
    const r = play(game, sim, state, { type: 'circle/talk', person: who });
    expect(rolled(r.beats)[0]?.chance === odds || rolled(r.beats)[0]?.chance === 100 - odds).toBe(true);
    expect(refusal(game, sim, r.state, { type: 'circle/talk', person: who })).toBe('talked-this-hour');
    const home = play(game, sim, state, doing('sleep', 60)).state;
    expect(offered(home, 'circle/talk')).toEqual([]);
    expect(refusal(game, sim, home, { type: 'circle/talk', person: who })).toBe('not-here');
  });

  it('asks out in person only, someone known well enough, at the odds shown, and not again for a while after a no', () => {
    const { state, who } = someone();
    expect(offered(state, 'circle/ask-out')).toContain(who);
    const odds = shown(state, 'ask-roll', who).chance;
    expect(odds).toBeGreaterThan(0);
    const r = play(game, sim, state, { type: 'circle/ask-out', person: who });
    const roll = rolled(r.beats)[0];
    const yes = r.of('circle/asked-out')[0]?.yes === true;
    expect(roll?.chance).toBe(yes ? odds : 100 - odds);
    if (!yes) expect(refusal(game, sim, r.state, { type: 'circle/ask-out', person: who })).toBe('cannot-ask');
    // Not where you are.
    const home = play(game, sim, state, doing('sleep', 60)).state;
    expect(offered(home, 'circle/ask-out')).toEqual([]);
    expect(refusal(game, sim, home, { type: 'circle/ask-out', person: who })).toBe('not-here');
    // Not known well enough.
    const barely = withCircle(state, { ties: circle(state).ties.map((t) => ({ ...t, together: 60 })) });
    expect(offered(barely, 'circle/ask-out')).toEqual([]);
    // Someone not drawn to you at all always says no.
    let cold = -1;
    for (let p = 3; p < 1000 && cold < 0; p++) if (fact(state, 'circle.attraction', { person: p }) === 0) cold = p;
    const known = withCircle(state, { ties: [...circle(state).ties, { ...newTie(cold, 6000, 0), regard: 100 }] });
    expect(shown(known, 'ask-roll', cold).chance).toBe(0);
  });

  it('never offers asking out someone you are not drawn to', () => {
    const { state, who } = someone();
    expect(fact(state, 'circle.name', { person: who })).toMatch(/^[A-Z]\w+ [A-Z]\w+$/);
    for (const to of ['women', 'men'] as const) {
      const s = withCircle(state, { drawnTo: to });
      for (const p of offered(s, 'circle/ask-out')) expect(fact(s, 'circle.drawn', { person: p })).toBe(true);
    }
  });

  it('plans a first date for the next evening; going costs the record’s price and passes its time', () => {
    const { state, who } = dating();
    const t = circle(state).ties.find((x) => x.person === who) as Tie;
    expect(t.status).toBe('dating');
    expect(t.date?.day).toBe((fact(state, 'time.day') as number) + 1);
    const evening = play(game, sim, state, doing('sleep', 600), waitUntil(court.date.hour)).state;
    expect(offered(evening, 'circle/go-on-date')).toEqual([who]);
    const cash = fact(evening, 'economy.amount', { resource: 'cash' }) as number;
    const odds = shown(evening, 'date-roll', who).chance;
    const r = play(game, sim, evening, { type: 'circle/go-on-date', person: who });
    expect(fact(r.state, 'economy.amount', { resource: 'cash' })).toBe(cash - court.date.cost);
    const good = r.of('circle/dated')[0]?.good === true;
    expect(rolled(r.beats)[0]?.chance).toBe(good ? odds : 100 - odds);
    expect(fact(r.state, 'time.of-day')).toBe(court.date.hour * 60 + court.date.minutes);
    expect(circle(r.state).ties.find((x) => x.person === who)?.date).toBeNull();
  });

  it('misses a date not turned up to, and their regard falls', () => {
    const { state, who } = dating();
    const before = circle(state).ties.find((x) => x.person === who)?.regard as number;
    const r = play(game, sim, state, doing('sleep', 600), waitUntil(court.date.hour + 3));
    expect(r.of('circle/stood-up').map((b) => b.person)).toEqual([who]);
    expect(circle(r.state).ties.find((x) => x.person === who)?.regard).toBe(Math.max(0, before + court.date.missed));
  });

  it('drifts apart unseen, and they end it once regard falls below the line', () => {
    const { state, who } = dating();
    const low = withCircle(state, {
      ties: circle(state).ties.map((t) =>
        t.person === who ? { ...t, regard: court.leave.regard - 1, date: null } : t,
      ),
    });
    let s = low;
    let ended = false;
    for (let d = 0; d < 60 && !ended; d++) {
      const r = play(game, sim, s, doing('sleep', 600), waitUntil(8));
      ended = r.of('circle/broke-up').some((b) => b.by === 'them' && b.person === who);
      s = r.state;
    }
    expect(ended).toBe(true);
    expect(circle(s).ties.find((x) => x.person === who)?.status).toBe('ex');
  });

  it('lets you date two at once; on a date with one, the other may find out, at the odds shown', () => {
    const { state, who } = dating();
    // Someone else you're seeing, known as well; not someone at tonight's place, so the date is theirs alone.
    const other = { ...newTie(who === 500 ? 501 : 500, 6000, 0), status: 'dating' as const };
    const two = withCircle(state, { ties: [...circle(state).ties.filter((t) => t.person !== other.person), other] });
    const evening = play(game, sim, two, doing('sleep', 600), waitUntil(court.date.hour)).state;
    const preview = shown(evening, 'date-roll', who);
    const found = preview.found?.find((f) => f.person === other.person);
    expect(found?.chance).toBeGreaterThanOrEqual(court.found.base);
    const r = play(game, sim, evening, { type: 'circle/go-on-date', person: who });
    expect(rolled(r.beats).length).toBe(2);
    const second = rolled(r.beats)[1];
    const caught = r.of('circle/found-out').length > 0;
    expect(second?.chance).toBe(caught ? found?.chance : 100 - (found?.chance as number));
  });

  it('breaks up when you say, and they are an ex', () => {
    const { state, who } = dating();
    const r = play(game, sim, state, { type: 'circle/break-up', person: who });
    expect(r.of('circle/broke-up')[0]).toMatchObject({ person: who, by: 'you' });
    expect(circle(r.state).ties.find((x) => x.person === who)?.status).toBe('ex');
    expect(offered(r.state, 'circle/break-up')).toEqual([]);
  });
});
