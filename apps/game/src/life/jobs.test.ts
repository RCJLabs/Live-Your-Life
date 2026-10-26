import type { GameState } from '@eb/core';
import { careerOf, postOpen } from '@lyl/sim';
import { describe, expect, it } from 'vitest';
import { nextRank } from './jobs.ts';
import { Life } from './session.ts';

const withJob = (life: Life, job: object): Life =>
  new Life({ state: { ...life.state, job: { ...(life.state.job as object), ...job } } as GameState, kept: [] });

/** A life whose kitchen lead's post at the diner is open today, or held. */
function lifeWhere(open: boolean): Life {
  for (let i = 0; i < 400; i++) {
    const l = new Life(`rank-${i}`);
    const turnover = careerOf(l.sim.content, 'kitchen-lead').employers.turnover;
    const seed = l.fact('people.seed') as number;
    const at = postOpen(
      seed,
      l.fact('market.employer') as string,
      'kitchen-lead',
      turnover,
      l.fact('time.day') as number,
    );
    if (at === open) return l;
  }
  throw new Error('no life found');
}

describe('the Jobs tab’s next rank (M2.5 step 4, D122)', () => {
  const life = new Life('next-rank');
  const ladder = careerOf(life.sim.content, 'line-cook').ladder as { practice: number; standing: number };

  it('names the next rank and the hours left, from the ladder and the practice in this job', () => {
    const line = nextRank(withJob(life, { practice: ladder.practice - 90 * 60, standing: ladder.standing }));
    expect(line).toBe('Next here: kitchen lead, after 90 more hours of work.');
    const fresh = nextRank(withJob(life, { practice: 0, standing: 50 }));
    expect(fresh).toBe(
      `Next here: kitchen lead, after 2,000 more hours of work, with your standing at ${ladder.standing} or more; it is 50 now.`,
    );
  });

  it('says when only the standing is short, and when the next shift will do it', () => {
    expect(nextRank(withJob(life, { practice: ladder.practice, standing: 60 }))).toBe(
      `Next here: kitchen lead, once your standing reaches ${ladder.standing}; it is 60 now.`,
    );
    // Ready, and the post open today, or held (D124): the same reckoning the sim promotes by.
    const ready = { practice: ladder.practice, standing: ladder.standing };
    expect(nextRank(withJob(lifeWhere(true), ready))).toBe('Next here: kitchen lead, at the end of your next shift.');
    expect(nextRank(withJob(lifeWhere(false), ready))).toBe(
      'You’re ready to be a kitchen lead here once the post comes open. Other kitchens in the city hire for it too.',
    );
  });

  it('shows nothing for a rank that leads nowhere, or with no job', () => {
    expect(nextRank(withJob(life, { career: 'chef' }))).toBeNull();
    expect(nextRank(withJob(life, { employed: false }))).toBeNull();
  });
});
