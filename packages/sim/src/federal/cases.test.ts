import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { advance, doing, play, refusal, signUp, sliceSim, tickOf } from '../../test/slice.ts';
import { DEFAULT_START } from '../calendar.ts';
import { lineFor } from '../chronicle.ts';
import { holder, YOURS } from '../deal/rivals.ts';
import type { DealSlice } from '../deal/state.ts';
import { createLifeGame } from '../game.ts';
import { type CareerRecord, careerOf } from '../job/records.ts';
import type { JobSlice } from '../job/state.ts';
import { type FederalSlice, NO_APPLICATION } from './apply.ts';
import { type Case, succeeded } from './cases.ts';
import { type Agency, agencyOf } from './records.ts';

const sim = sliceSim();
const game = createLifeGame({ events: false, unlocked: true, people: 1000, career: 'special-agent' });
const a = agencyOf(sim.content) as Agency;
const fed = (s: GameState) => s.federal as FederalSlice;
const fact = (s: GameState, id: string, x: Record<string, unknown> = {}) => game.fact(s, id, x, sim);
const offered = (s: GameState, type: string) => game.options(s, sim).filter((o) => o.type === type);
const told = (beat: unknown) => lineFor(sim.content, beat as never, { you: 'Dana' }, DEFAULT_START);
const odds = (s: GameState) => game.preview(s, [{ effect: 'case-odds' }], sim)[0]?.chance as number;
const chance = (b: Record<string, unknown> | undefined) =>
  b?.outcome === 0 ? (b.chance as number) : 100 - (b?.chance as number);

/** A sworn agent at ten in the morning, with the application's slice changed. */
function agent(seed: string, federal: Partial<FederalSlice> = {}, g = game): GameState {
  const s = g.init(seed, sim);
  const set = { ...s, federal: { ...NO_APPLICATION(), stage: 'sworn', ...federal } } as GameState;
  return play(g, sim, set, { type: 'clock/wait-until', hour: 10, minute: 0 }).state;
}

/** An agent whose own corner is held this stretch, and its head. */
function held(): { s: GameState; head: number } {
  for (let i = 0; i < 40; i++) {
    const s = agent(`held-${i}`);
    if (fact(s, 'deal.corner-held') !== true) continue;
    const view = { content: sim.content, fact: (id: string, x?: Record<string, unknown>) => fact(s, id, x) };
    return { s, head: holder(view as never, YOURS) };
  }
  throw new Error('no corner held in 40 seeds');
}

const withCase = (s: GameState, c: Partial<Case>): GameState =>
  ({
    ...s,
    federal: { ...fed(s), case: { target: 'crew', person: 0, opened: 0, evidence: 0, ...c } },
  }) as GameState;

describe('an agent’s cases (M4.3 step 3, D159)', () => {
  it('opens one case at a time, on a corner’s crew head or the supplier’s crew', () => {
    const { s, head } = held();
    const options = offered(s, 'federal/open');
    expect(options.at(-1)).toEqual({ type: 'federal/open', target: 'supplier', person: -1 });
    expect(head).toBeGreaterThanOrEqual(0);
    expect(options).toContainEqual({ type: 'federal/open', target: 'crew', person: head });
    const step = play(game, sim, s, { type: 'federal/open', target: 'crew', person: head });
    expect(fed(step.state).case).toMatchObject({ target: 'crew', person: head, evidence: 0 });
    const name = fact(s, 'circle.name', { person: head }) as string;
    expect(told(step.of('federal/opened')[0])).toBe(`Dana opened a case against ${name}’s crew.`);
    expect(offered(step.state, 'federal/open')).toEqual([]);
    expect(fact(step.state, 'federal.working')).toBe(true);
    // Not an agent, or someone who has dealt: no case.
    expect(offered(agent('cadet', { stage: 'academy' }), 'federal/open')).toEqual([]);
    const dealt = { ...s, deal: { ...(s.deal as DealSlice), sales: 1 } } as GameState;
    expect(offered(dealt, 'federal/open')).toEqual([]);
    expect(refusal(game, sim, dealt, { type: 'federal/open', target: 'supplier', person: -1 })).toBe('no-case');
  });

  it('builds the file from the work’s shift events, at their odds', () => {
    // Every agent's shift has an event, to reach one sooner.
    const careers = PACK.records.career as Record<string, CareerRecord>;
    const agentRecord = careers['special-agent'] as CareerRecord;
    const busy = sliceSim({
      ...PACK.records,
      career: { ...careers, 'special-agent': { ...agentRecord, events: { ...agentRecord.events, chance: 100 } } },
    } as RecordPack);
    const g = createLifeGame({ events: false, unlocked: true, people: 0, career: 'special-agent' });
    const s0 = g.init('evidence', busy);
    const s = withCase({ ...s0, federal: { ...NO_APPLICATION(), stage: 'sworn' } } as GameState, { evidence: 10 });
    const first = (s.job as JobSlice).posted[0] as { day: number };
    const kind = careerOf(busy.content, 'special-agent').shifts[0] as { hour: number };
    const signed = play(g, busy, s, signUp(first.day)).state;
    const at = tickOf(first.day, kind.hour) - (signed.time as { tick: number }).tick;
    let now = play(g, busy, signed, advance(at)).state;
    now = play(g, busy, now, doing('work', g.fact(now, 'job.shift-left', undefined, busy) as number)).state;
    const frame = (now.kernel as unknown as { modes: { id: string; data?: { event: string } }[] }).modes.at(-1);
    expect(frame?.id).toBe('shift-event');
    const event = busy.content.get<{ tags: string[]; choices: { id: string; outcome: { evidence?: number } }[] }>(
      'shift-event',
      frame?.data?.event as string,
    );
    expect(event?.tags).toEqual(['bureau-case']);
    const certain = event?.choices[0];
    const r = play(g, busy, now, { type: 'job/choose', choice: certain?.id });
    expect(r.of('job/evidence')).toEqual([{ type: 'job/evidence', points: certain?.outcome.evidence }]);
    expect(fed(r.state).case?.evidence).toBe(10 + (certain?.outcome.evidence as number));
  });

  it('asks for an indictment with enough evidence, at the chance shown, and closes the case', () => {
    const { s, head } = held();
    expect(offered(withCase(s, { person: head, evidence: a.cases.least - 1 }), 'federal/indict')).toEqual([]);
    expect(odds(withCase(s, { person: head, evidence: 100 }))).toBe(a.cases.most);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const c = withCase({ ...s, kernel: { ...s.kernel, seed: `indict-${i}` } } as GameState, {
        person: head,
        evidence: 55,
      });
      expect(odds(c)).toBe(55);
      const step = play(game, sim, c, { type: 'federal/indict' });
      expect(chance(step.of('logic/rolled')[0])).toBe(55);
      expect(fed(step.state).case).toBeNull();
      const [convicted] = step.of('federal/convicted');
      if (convicted) {
        expect(fed(step.state).away).toEqual([{ person: head, until: (fact(c, 'time.day') as number) + 1589 }]);
        expect(told(convicted)).toContain('was convicted on the case Dana built, and sent away for 4 years.');
        // The corner the head held is open while they are away.
        expect(fact(step.state, 'deal.corner-held')).toBe(false);
        expect(fact(step.state, 'federal.away', { person: head })).toBe(true);
      } else {
        expect(told(step.of('federal/declined')[0])).toContain('The prosecutor declined the case Dana built against');
        expect(fact(step.state, 'deal.corner-held')).toBe(true);
      }
      seen.add(convicted ? 'convicted' : 'declined');
    }
    expect([...seen].sort()).toEqual(['convicted', 'declined']);
  });

  it('takes the supplier’s crew off the street for its sentence, and an heir finds it so', () => {
    const s = agent('supplier', { down: -1 });
    for (let i = 0; i < 30; i++) {
      const c = withCase({ ...s, kernel: { ...s.kernel, seed: `sup-${i}` } } as GameState, {
        target: 'supplier',
        person: -1,
        evidence: 90,
      });
      const step = play(game, sim, c, { type: 'federal/indict' });
      if (step.of('federal/convicted').length === 0) continue;
      expect(fed(step.state).down).toBe((fact(c, 'time.day') as number) + a.cases.supplier.sentence);
      expect(fact(step.state, 'federal.supplier-down')).toBe(true);
      expect(offered(step.state, 'federal/open').some((o) => o.target === 'supplier')).toBe(false);
      // Nobody sells at the supplier's hours, though the same evening sold before.
      const night = (x: GameState) => play(game, sim, x, { type: 'clock/wait-until', hour: 21, minute: 0 }).state;
      expect(offered(night(c), 'deal/buy').length).toBeGreaterThan(0);
      expect(offered(night(step.state), 'deal/buy')).toEqual([]);
      // Nor the connect, who is the supplier's, at theirs.
      const met = (x: GameState) =>
        play(
          game,
          sim,
          {
            ...x,
            deal: { ...(x.deal as DealSlice), connect: true },
            economy: { ...(x.economy as object), amounts: { cash: 10_000_000 } },
          } as GameState,
          {
            type: 'clock/wait-until',
            hour: 15,
            minute: 0,
          },
        ).state;
      expect(offered(met(c), 'deal/wholesale').length).toBeGreaterThan(0);
      expect(offered(met(step.state), 'deal/wholesale')).toEqual([]);
      // An heir's slice starts again; the city's stays as the last life left it.
      const slice = { ...fed(step.state), stage: 'sworn', case: { target: 'crew', person: 3, opened: 0, evidence: 9 } };
      const out = { ...slice } as FederalSlice;
      succeeded({ read: () => slice as never, write: () => out as never });
      expect(out).toEqual({ ...NO_APPLICATION(), away: fed(step.state).away, down: fed(step.state).down });
      return;
    }
    throw new Error('never convicted in 30');
  });

  it('drops the case when the agent leaves the bureau', () => {
    const { s, head } = held();
    const open = withCase(s, { person: head, evidence: 30 });
    expect(fed(play(game, sim, open, { type: 'job/quit' }).state).case).toBeNull();
  });
});
