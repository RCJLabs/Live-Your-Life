import type { GameState } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../../test/slice.ts';
import { newTie } from '../circle/state.ts';
import { type EducationRecord, educationOf } from './records.ts';

const sim = sliceSim();
const game = sliceGame();
const r = educationOf(sim.content) as EducationRecord;

describe('your schooling at the start (M2.8 step 1, D112)', () => {
  it('starts a life with a diploma at the state’s graduation rate, by the seed', () => {
    const n = 2000;
    let with_ = 0;
    for (let i = 0; i < n; i++) if (game.fact(game.init(`school-${i}`, sim), 'education.high-school', {}, sim)) with_++;
    const p = r.diploma / 10_000;
    // Within three standard deviations of the record's rate.
    expect(Math.abs(with_ - n * p)).toBeLessThan(3 * Math.sqrt(n * p * (1 - p)));
    expect(game.fact(game.init('school-0', sim), 'education.finished', {}, sim)).toBe(
      game.fact(game.init('school-0', sim), 'education.finished', {}, sim),
    );
  });

  it('gives everyone a diploma in a pack from before the record', () => {
    const old = sliceSim({ ...PACK.records, education: {} });
    for (let i = 0; i < 50; i++)
      expect(game.fact(game.init(`old-${i}`, old), 'education.finished', {}, old)).toBe('diploma');
  });

  it('draws an heir’s schooling as their own, not the one who died', () => {
    let with_ = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const s = game.init(`heir-school-${i}`, sim);
      const dead = {
        ...s,
        education: { finished: 'none' },
        lives: { ...(s.lives as object), died: 0 },
        circle: { ...(s.circle as object), ties: [{ ...newTie(40, 600, 0), regard: 100 }] },
        kernel: { ...s.kernel, modes: [...s.kernel.modes, { id: 'dead', data: {} }] },
      } as GameState;
      const r = game.reduce(dead, { type: 'lives/succeed' }, sim);
      expect(r.accepted).toBe(true);
      if (game.fact(r.state, 'education.high-school', {}, sim)) with_++;
    }
    const p = r.diploma / 10_000;
    expect(Math.abs(with_ - n * p)).toBeLessThan(3 * Math.sqrt(n * p * (1 - p)));
  });
});
