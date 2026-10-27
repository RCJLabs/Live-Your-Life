import type { GameState } from '@eb/core';
import { type Agency, agencyOf, type FederalSlice } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { bureau } from './bureau.ts';
import { Life } from './session.ts';
import { odds } from './words.ts';

type Fed = FederalSlice;
const fed = (life: Life) => life.state.federal as Fed;
const a = agencyOf(new Life('bureau-record').sim.content) as Agency;
const itemOf = (life: Life, id: string) => bureau(life).find((i) => i.id === id);
const labels = (life: Life, id: string) => itemOf(life, id)?.actions.map((x) => x.label);

/** A life of 26 with its schooling, two years as an accountant, the bureau's slice and its job changed, at ten. */
function lifeWith(
  seed: string,
  o: { finished?: string; worked?: number; felonies?: number; federal?: Partial<Fed>; job?: object } = {},
): Life {
  const base = new Life(seed);
  const s = base.state;
  const job = s.job as { experience: Record<string, number> };
  const life = new Life({
    state: {
      ...s,
      lives: { ...(s.lives as object), born: -26 * 365 },
      education: { ...(s.education as object), finished: o.finished ?? 'bachelor' },
      job: { ...job, experience: { ...job.experience, accountant: o.worked ?? a.requires.minutes }, ...o.job },
      law: { ...(s.law as object), felonies: o.felonies ?? 0, convictions: o.felonies ?? 0 },
      federal: { ...fed(base), ...o.federal },
    } as GameState,
    kept: [],
  });
  life.act({ type: 'clock/wait-until', hour: 10, minute: 0 });
  return life;
}

describe('the Jobs tab’s federal bureau (M4.3 step 4)', () => {
  it('says nothing to someone without a bachelor’s, and why not to someone who can’t apply', () => {
    expect(bureau(lifeWith('b-none', { finished: 'diploma' }))).toEqual([]);
    expect(itemOf(lifeWith('b-felony', { felonies: 1 }), 'apply')?.text).toBe(
      'The bureau won’t take anyone with a felony on their record.',
    );
    const short = itemOf(lifeWith('b-short', { worked: 1000 * 60 }), 'apply');
    expect(short?.text).toContain('You have 1,000 hours of it.');
    expect(short?.actions).toEqual([]);
  });

  it('applies, then shows the written test’s day and the chance as previewed, with study and training', () => {
    const life = lifeWith('b-apply');
    expect(itemOf(life, 'apply')?.text).toContain(`from ${a.requires.least} to ${a.requires.most}`);
    life.act(itemOf(life, 'apply')?.actions[0]?.action as never);
    expect(fed(life).stage).toBe('written');
    const shown = life.peek<{ chance: number }>({ effect: 'federal-odds' }).chance;
    expect(itemOf(life, 'written')?.text).toContain(`about ${odds(shown)} pass so prepared`);
    expect(labels(life, 'written')).toEqual(['Study an hour']);
    expect(labels(life, 'training')).toEqual(['Train an hour']);
    life.act(itemOf(life, 'written')?.actions[0]?.action as never);
    expect(fed(life).study).toBe(60);
    expect(itemOf(life, 'written')?.text).toContain('You’ve studied 1 hour for it');
    const after = life.peek<{ chance: number }>({ effect: 'federal-odds' }).chance;
    expect(after).toBeGreaterThan(shown);
    expect(itemOf(life, 'written')?.text).toContain(`about ${odds(after)} pass so prepared`);
  });

  it('offers each stage’s sitting on its day, and the background as decided on its day', () => {
    const today = (l: Life) => l.fact('time.day') as number;
    const due = lifeWith('b-fit', { federal: { stage: 'fitness', due: 0, training: 30 * 60 } });
    expect(itemOf(due, 'fitness')?.text).toContain(`You’ve trained 30 hours of the ${a.fitness.hours} hours`);
    expect(labels(due, 'fitness')).toEqual(['Train an hour', 'Take the test']);
    const interview = lifeWith('b-int', { federal: { stage: 'interview', due: 0 } });
    expect(itemOf(interview, 'interview')?.text).toContain(`About ${odds(a.interview.pass)} are passed`);
    expect(labels(interview, 'interview')).toEqual(['Go to the interview']);
    const bg = lifeWith('b-bg', { federal: { stage: 'background', due: 40 } });
    expect(itemOf(bg, 'background')?.text).toContain(`About ${odds(a.background.pass)} with your record pass`);
    expect(today(bg)).toBeLessThan(40);
  });

  it('reports to the Academy once cleared, and the job takes it from there', () => {
    const life = lifeWith('b-report', { federal: { stage: 'cleared' } });
    expect(labels(life, 'cleared')).toEqual(['Report']);
    life.act(itemOf(life, 'cleared')?.actions[0]?.action as never);
    expect(fed(life).stage).toBe('academy');
    expect(life.fact('job.career')).toBe(a.trainee);
    expect(bureau(life)).toEqual([]);
  });

  it('opens a case on a named crew, then shows its evidence and the indictment’s chance', () => {
    const agentJob = { career: 'special-agent', employed: true };
    for (let i = 0; i < 30; i++) {
      const life = lifeWith(`b-case-${i}`, { federal: { stage: 'sworn' }, job: agentJob });
      const open = itemOf(life, 'case');
      const crew = open?.actions.find((x) => x.action.target === 'crew');
      if (!crew) continue;
      expect(open?.actions.at(-1)?.label).toBe('Open a case against the supplier’s crew');
      const name = life.fact('circle.name', { person: crew.action.person as number }) as string;
      expect(crew.label).toBe(`Open a case against ${name}’s crew`);
      life.act(crew.action);
      expect(itemOf(life, 'case')?.text).toBe(
        `Your case against ${name}’s crew has 0 points of evidence. An indictment can be asked for once it reaches ${a.cases.least}.`,
      );
      expect(labels(life, 'case')).toEqual([]);
      const f = fed(life);
      const built = new Life({
        state: { ...life.state, federal: { ...f, case: { ...f.case, evidence: 60 } } } as GameState,
        kept: [],
      });
      expect(itemOf(built, 'case')?.text).toContain(`About ${odds(60)} of indictments hold on what you have.`);
      expect(labels(built, 'case')).toEqual(['Ask for an indictment']);
      return;
    }
    throw new Error('no crew on a corner in 30 lives');
  });
});
