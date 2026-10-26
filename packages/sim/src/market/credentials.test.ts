import type { GameState, RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { lineCook, play, refusal, sliceGame, sliceSim } from '../../test/slice.ts';
import { type CareerRecord, careerOf } from '../job/records.ts';
import type { Listing } from './module.ts';
import { type Applicant, barred, hireOdds, REPUTATION } from './odds.ts';

// A career worked off screen with jobs going every day, asking for schooling: what the market needs to be tried on.
const CLERK = 'test-clerk';
const clerk = (changes: Partial<CareerRecord> = {}): CareerRecord => {
  const { place: _, crew: __, ...rest } = lineCook();
  return {
    ...rest,
    name: 'Test clerk',
    shifts: [{ id: 'office', hour: 9, minute: 0, minutes: 480 }],
    employers: { districts: ['downtown'], staff: 200, turnover: 60, share: 50 },
    requires: { schooling: 'associate' },
    hiring: { base: 30, record: 10, reputation: 20 },
    ...changes,
  };
};
const records = (c: CareerRecord): RecordPack => ({ ...PACK.records, career: { ...PACK.records.career, [CLERK]: c } });
const sim = sliceSim(records(clerk()));
const game = sliceGame();
const listed = (s: GameState): Listing[] => game.fact(s, 'market.openings', undefined, sim) as Listing[];
const schooled = (s: GameState, finished: string) =>
  ({ ...s, education: { ...(s.education as object), finished } }) as GameState;
const you = (schooling: string): Applicant => ({
  convictions: 0,
  felonies: 0,
  reputation: REPUTATION.start,
  schooling,
});

describe('credentials and careers (M2.8 step 5, D114)', () => {
  it('bars a career without the schooling it asks for; a GED counts as a diploma', () => {
    const teller = careerOf(PACK_STORE, 'bank-teller');
    expect(barred(teller, you('none'))).toBe('high-school');
    expect(barred(teller, you('ged'))).toBeNull();
    expect(barred(teller, you('diploma'))).toBeNull();
    const paralegal = careerOf(PACK_STORE, 'paralegal');
    expect(barred(paralegal, you('diploma'))).toBe('associate');
    expect(barred(paralegal, you('associate'))).toBeNull();
    // The police's own standard, after MCOLES: a diploma or GED, and no felony.
    const recruit = careerOf(PACK_STORE, 'police-recruit');
    expect(barred(recruit, you('none'))).toBe('high-school');
    expect(barred(recruit, { ...you('ged'), convictions: 1, felonies: 1 })).toBe('record');
  });

  it('adds the points a preferred credential is worth to the odds, and only for those who hold it', () => {
    const support = careerOf(PACK_STORE, 'computer-support');
    const points = support.hiring.prefers?.points as number;
    expect(points).toBeGreaterThan(0);
    expect(hireOdds(support, you('associate')) - hireOdds(support, you('diploma'))).toBe(points);
    expect(hireOdds(support, you('ged'))).toBe(hireOdds(support, you('diploma')));
  });

  it('lists the opening with why you can’t apply, refuses the application, and shows the better odds', () => {
    const s = game.init('credentials', sim);
    const without = listed(schooled(s, 'diploma')).find((l) => l.career === CLERK) as Listing;
    expect(without.problem).toBe('associate');
    expect(refusal(game, sim, schooled(s, 'diploma'), { type: 'market/apply', opening: without.opening })).toBe(
      'associate',
    );
    const withIt = listed(schooled(s, 'associate')).find((l) => l.career === CLERK) as Listing;
    expect(withIt.problem).toBeNull();
    const applied = play(game, sim, schooled(s, 'associate'), { type: 'market/apply', opening: withIt.opening });
    expect(applied.of('market/applied').length).toBe(1);
    // A preference shows in the odds listed, which are the odds rolled.
    const preferring = sliceSim(
      records(clerk({ requires: {}, hiring: { ...clerk().hiring, prefers: { schooling: 'associate', points: 20 } } })),
    );
    const odds = (finished: string) =>
      (game.fact(schooled(s, finished), 'market.openings', undefined, preferring) as Listing[]).find(
        (l) => l.career === CLERK,
      )?.odds;
    expect((odds('associate') as number) - (odds('diploma') as number)).toBe(20);
  });

  it('pays by credential as BLS reads it: the jobs each one opens, within 15% of the step up', () => {
    // BLS's median weekly earnings, full time, 25 and over, 2024: what each credential's jobs pay
    // against those without a diploma (CALIBRATION.md). The game's are the careers' starting wages.
    const BLS = { none: 738, 'high-school': 930, associate: 1099 } as const;
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s.length % 2
        ? (s[(s.length - 1) / 2] as number)
        : ((s[s.length / 2 - 1] as number) + (s[s.length / 2] as number)) / 2;
    };
    const hiring = PACK_STORE.ids('career')
      .map((id) => careerOf(PACK_STORE, id))
      .filter((c) => c.employers.staff > 0);
    const at = (need: keyof typeof BLS) =>
      median(hiring.filter((c) => (c.requires?.schooling ?? 'none') === need).map((c) => c.wage));
    for (const need of ['high-school', 'associate'] as const) {
      const game = at(need) / at('none');
      const real = BLS[need] / BLS.none;
      expect(Math.abs(game / real - 1), need).toBeLessThan(0.15);
    }
  });
});

const PACK_STORE = sim.content;
