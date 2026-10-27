import { readFileSync } from 'node:fs';
import { createGame, type GameState, loadSave, readPack, stateHash } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { LINE_COOK, sliceGame, sliceSim } from '../test/slice.ts';
import { migrateCircle2, migrateCircle3, migrateCircle5, newTie, noOne } from './circle/state.ts';
import { migrateDeal4 } from './deal/state.ts';
import { migrateFamily2, migrateFamily3, noFamily } from './family/state.ts';
import { lifeModules } from './game.ts';
import { jobModule } from './job/module.ts';
import { FIRST_BORN } from './lives/module.ts';

/**
 * The save fixtures (CLAUDE.md, Saves never break): a week saved by the build that started keeping
 * saves (life-v1, M1.7), one saved after the walk to work joined `you` (life-v2, D61), one before
 * the crew (life-v3, M2.4), and one with the 1,000 people and the people you know before courting
 * (life-v4, M2.6), each
 * written once by test/fixture.ts and never again. Every later build must load them with nothing
 * skipped and every slice in the shape today's modules expect. A change to a slice's shape needs
 * a version and a migration, or this fails.
 */
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../test/fixtures/saves/${name}`, import.meta.url), 'utf8'));
/**
 * The content both were saved with, kept beside them, so a replay can be held to the state saved
 * whatever the content is now. Against today's content a log may play out otherwise, which a load
 * reports and allows.
 */
const SAVED_WITH = 'pack-0b75d724de0fc3b0.json';

const keysOf = (value: unknown): string[] =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value).sort() : [];

type Migrated = { readonly module: string; readonly from: number; readonly to: number };
const byModule = (list: readonly Migrated[]) => [...list].sort((a, b) => a.module.localeCompare(b.module));
/** Every save from before M4.1 migrates the deal to version 5 (a crew of your own, rival corners, the trade's cash) as well. */
const withDeal = (list: readonly Migrated[]) =>
  byModule(
    list.some((m) => m.module === 'deal')
      ? list.map((m) => (m.module === 'deal' ? { ...m, to: 5 } : m))
      : [...list, { module: 'deal', from: 2, to: 5 }],
  );
/** Every save from before M2.5 step 2 migrates the job to its experience as well. */
const jobToo = (list: readonly Migrated[]) => byModule([...list, { module: 'job', from: 1, to: 2 }]);
/** And, if it had the trade, the deal. */
const withJob = (list: readonly Migrated[]) => withDeal(jobToo(list));
/** Every save from M2.8 to M4.1 migrates the education to version 7 (the university, law school) as well. */
const withSchool = (list: readonly Migrated[]) =>
  byModule(
    list.some((m) => m.module === 'education')
      ? list.map((m) => (m.module === 'education' ? { ...m, to: 7 } : m))
      : [...list, { module: 'education', from: 5, to: 7 }],
  );

describe('the save fixtures', () => {
  const game = sliceGame();
  const sim = sliceSim();
  const then = sliceSim(readPack(fixture(SAVED_WITH) as never).records);
  const load = (name: string, at = sim, with_ = game) =>
    loadSave(with_, fixture(name), at, { game: 'live-your-life', build: 'this-build' });
  // The game as it was before the tier-1 people joined the life (M2.2): what both fixtures were
  // saved by. The labor market (M2.3), the street trade and prison (M2.4) stay, since the modes
  // name their actions; each writes only its own slice, and the market starts you at the diner,
  // so the slices saved replay as they were.
  const since = (id: string) =>
    id.startsWith('people') ||
    id === 'market' ||
    id === 'deal' ||
    id === 'prison' ||
    id === 'circle' ||
    id === 'family' ||
    id === 'lives' ||
    id === 'health' ||
    id === 'education' ||
    id === 'travel' ||
    id === 'season' ||
    id === 'event' ||
    id === 'edition';
  const before = createGame({
    modules: lifeModules({ career: LINE_COOK }).filter((m) => !m.id.startsWith('people')),
    start: 'world',
  });
  const people = lifeModules()
    .filter((m) => since(m.id))
    .map((m) => m.id);

  it('loads the first with nothing skipped, migrating `you` from version 1 to 2 (D61) and the law to 2 (M2.4)', () => {
    const result = load('life-v1.json');
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.skipped).toBe(0);
    expect(result.report.kept).toEqual([]);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(byModule(result.report.migrated)).toEqual(
      jobToo([
        { module: 'law', from: 1, to: 3 },
        { module: 'you', from: 1, to: 2 },
      ]),
    );
    expect(result.report.added).toEqual(people);
  });

  it('migrates every slice of the first to the shape a new life has, down to the keys of each', () => {
    const result = load('life-v1.json');
    if (!result.ok) throw new Error(result.message);
    const fresh = game.init('shape', sim);
    expect(keysOf(result.state)).toEqual(keysOf(fresh));
    for (const module of keysOf(fresh)) {
      expect(keysOf(result.state[module]), module).toEqual(keysOf(fresh[module]));
    }
    expect(result.state.kernel.versions).toEqual(fresh.kernel.versions);
  });

  it('loads the second, saved after the walk to work, with only the law migrated (M2.4), nothing skipped, and the people added (M2.2)', () => {
    const result = load('life-v2.json');
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(jobToo([{ module: 'law', from: 1, to: 3 }]));
    expect(result.report.added).toEqual(people);
    expect(result.report.skipped).toBe(0);
    expect((result.state.you as { commute: number }).commute).toBe(36);
  });

  it('replays the second, by the game and the content it was saved with, to exactly the state it saved', () => {
    const result = load('life-v2.json', then, before);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.added).toEqual([
      'market',
      'deal',
      'prison',
      'circle',
      'family',
      'lives',
      'health',
      'education',
      'travel',
      'season',
      'event',
      'edition',
    ]);
    // Without the market's and the trade's own slices and versions, and the law's migration to 2
    // (M2.4) taken back, the very state saved.
    const {
      market: _,
      deal: _d,
      prison: _j,
      circle: _c,
      family: _fam,
      lives: _l,
      health: _h,
      education: _e,
      travel: _tr,
      season: _se,
      event: _ev,
      edition: _ed,
      law,
      job,
      ...rest
    } = result.state as unknown as Record<string, unknown>;
    // Experience and the shifts over (M2.5) are the job's since; the cook then was the cook it migrates from.
    const { experience: _x, done: _dn, ...jobThen } = job as Record<string, unknown>;
    const { prison: _p, felonies: _f, ...lawThen } = law as Record<string, unknown>;
    const probation = lawThen.probation as Record<string, unknown> | null;
    const { trainee: _t, ...probationThen } = probation ?? {};
    const kernel = result.state.kernel as unknown as { versions: Record<string, number> };
    const {
      market: __,
      deal: __d,
      prison: __j,
      circle: __c,
      family: __f,
      lives: __l,
      health: __h,
      education: __e,
      travel: __tr,
      season: __se,
      event: __ev,
      edition: __ed,
      ...versions
    } = kernel.versions;
    const saved = {
      ...rest,
      law: { ...lawThen, probation: probation ? probationThen : null },
      job: jobThen,
      kernel: { ...kernel, versions: { ...versions, law: 1, job: 1 } },
    } as unknown as GameState;
    expect(stateHash(saved)).toBe(result.file.hash);
  });

  it('loads the third, saved before the crew, migrating the trade from version 1 to 3 (M2.4, M4.1)', () => {
    const result = load('life-v3.json');
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(
      withJob([
        { module: 'deal', from: 1, to: 2 },
        { module: 'law', from: 2, to: 3 },
      ]),
    );
    // The people you know (M2.6): a save from before them knows no one.
    expect(result.report.added).toEqual([
      'circle',
      'family',
      'lives',
      'health',
      'education',
      'travel',
      'season',
      'event',
      'edition',
    ]);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const deal = result.state.deal as { crew: boolean; owed: number; recruit: number };
    expect([deal.crew, deal.owed, deal.recruit]).toEqual([false, 0, -1]);
  });

  it('loads the fifth, saved before life together, migrating the circle from 2 to 6 (M2.6)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v5.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withJob([{ module: 'circle', from: 2, to: 6 }]));
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const ties = (result.state.circle as { ties: Record<string, unknown>[] }).ties;
    expect(ties.length).toBeGreaterThan(0);
    for (const t of ties) {
      expect(Object.keys(t).sort()).toEqual(Object.keys(newTie(0, 0, 0)).sort());
      expect([t.living, t.licence, t.hearing]).toEqual([false, null, -1]);
    }
  });

  it('loads the sixth, saved before bodies, migrating the circle from 3 to 6 and adding the family (M2.6)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v6.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withJob([{ module: 'circle', from: 3, to: 6 }]));
    expect(result.report.added).toEqual([
      'family',
      'lives',
      'health',
      'education',
      'travel',
      'season',
      'event',
      'edition',
    ]);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect((result.state.circle as { carries: unknown }).carries).toBeNull();
  });

  it('loads the seventh, saved before a child’s care, migrating the family from 1 to 3 (M2.6)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v7.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(
      withJob([
        { module: 'circle', from: 4, to: 6 },
        { module: 'family', from: 1, to: 4 },
      ]),
    );
    expect(result.report.added).toEqual(['lives', 'health', 'education', 'travel', 'season', 'event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const fresh = people.init('v7-shape', sim).family as Record<string, unknown>;
    expect(keysOf(result.state.family)).toEqual(keysOf(fresh));
  });

  it('loads the eighth, saved before custody, migrating the family from 2 to 3 (M2.6)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v8.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(
      withJob([
        { module: 'circle', from: 4, to: 6 },
        { module: 'family', from: 2, to: 4 },
      ]),
    );
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const fresh = people.init('v8-shape', sim).family as Record<string, unknown>;
    expect(keysOf(result.state.family)).toEqual(keysOf(fresh));
  });

  it('loads the ninth, saved before the night asked, migrating the circle from 4 to 6 (M2.6)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v9.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(
      withJob([
        { module: 'circle', from: 4, to: 6 },
        { module: 'family', from: 3, to: 4 },
      ]),
    );
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const ties = (result.state.circle as { ties: { night: number }[] }).ties;
    expect(ties.length).toBeGreaterThan(0);
    for (const t of ties) expect(Object.keys(t).sort()).toEqual(Object.keys(newTie(0, 0, 0)).sort());
  });

  it('loads the tenth, saved before the safety plan, migrating the family from 3 to 4 (M2.6, D102)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v10.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(
      withJob([
        { module: 'circle', from: 5, to: 6 },
        { module: 'family', from: 3, to: 4 },
      ]),
    );
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const fresh = people.init('v10-shape', sim).family as Record<string, unknown>;
    expect(keysOf(result.state.family)).toEqual(keysOf(fresh));
    expect((result.state.family as { plan: unknown }).plan).toBeNull();
  });

  it('loads the eleventh, saved before the heir, migrating the circle from 5 to 6 and the lives from 1 to 2 (M2.7)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v11.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(
      withJob([
        { module: 'circle', from: 5, to: 6 },
        { module: 'lives', from: 1, to: 2 },
      ]),
    );
    expect(result.report.added).toEqual(['education', 'travel', 'season', 'event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(keysOf(result.state.lives)).toEqual(keysOf(people.init('v11-shape', sim).lives));
    expect(result.state.lives).toMatchObject({ gen: 0, born: FIRST_BORN });
    expect((result.state.circle as { self: number }).self).toBe(-1);
  });

  it('loads the twelfth, saved before the GED, migrating the education from 1 to 7 (M2.8)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v12.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withSchool(withJob([{ module: 'education', from: 1, to: 7 }])));
    expect(result.report.added).toEqual(['travel', 'season', 'event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(keysOf(result.state.education)).toEqual(keysOf(people.init('v12-shape', sim).education));
    expect((result.state.education as { ged: unknown }).ged).toEqual({ passed: [], prep: {} });
  });

  it('loads the thirteenth, saved before the college, migrating the education from 2 to 7 (M2.8)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v13.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withSchool(withJob([{ module: 'education', from: 2, to: 7 }])));
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(keysOf(result.state.education)).toEqual(keysOf(people.init('v13-shape', sim).education));
    expect((result.state.education as { college: { term: unknown } }).college.term).toBeNull();
  });

  it('loads the fourteenth, saved before paying for college, migrating the education from 3 to 7 (M2.8)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v14.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withSchool(withJob([{ module: 'education', from: 3, to: 7 }])));
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(keysOf(result.state.education)).toEqual(keysOf(people.init('v14-shape', sim).education));
    // Nothing was borrowed before; the pay before is not known, and pay since the snapshot is kept.
    expect((result.state.education as { loan: { owed: number } }).loan.owed).toBe(0);
  });

  it('loads the fifteenth, saved before retakes, migrating the education from 4 to 7 (M2.8)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v15.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withSchool(withJob([{ module: 'education', from: 4, to: 7 }])));
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(keysOf(result.state.education)).toEqual(keysOf(people.init('v15-shape', sim).education));
    // Grades weren't kept before: none is known, so nothing passed before can be retaken.
    expect((result.state.education as { college: { grades: object } }).college.grades).toEqual({});
  });

  it('loads the sixteenth, saved before the bus and rides, adding the travel module (M2.9)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v16.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withSchool(withJob([])));
    expect(result.report.added).toEqual(['travel', 'season', 'event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    // No fares paid on any day before.
    expect(result.state.travel).toEqual({ day: -1, paid: 0 });
  });

  it('loads the seventeenth, saved before experience, counting the job held as its practice (M2.5)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v17.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withSchool(withDeal([{ module: 'job', from: 1, to: 2 }])));
    expect(result.report.added).toEqual(['season', 'event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const job = result.state.job as { career: string; practice: number; experience: Record<string, number> };
    expect(Object.keys(job.experience)).toEqual(['line-cook']);
    // The snapshot's practice, then the minutes the log worked on top of it.
    expect(job.experience['line-cook']).toBeGreaterThanOrEqual(0);
    expect(job.experience['line-cook']).toBe(job.practice);
  });

  it('loads the eighteenth, saved before the season, adding the season module (M2.10)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v18.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual(withSchool(withDeal([])));
    expect(result.report.added).toEqual(['season', 'event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    // The log's time passing set the clocks' timer and the last day told.
    expect((result.state.season as { told: number }).told).toBe(people.fact(result.state, 'time.day', {}, sim));
    expect(people.fact(result.state, 'time.pending', { timer: 'clocks' }, sim)).toBe(true);
  });

  it('loads the nineteenth, saved before the life events, adding them with nothing drawn for the days gone (M2.10)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v19.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual(withSchool(withDeal([])));
    expect(result.report.added).toEqual(['event', 'edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const ev = result.state.event as { settled: number; waiting: string[] };
    expect(ev.waiting).toEqual([]);
    expect(ev.settled).toBe(people.fact(result.state, 'time.day', {}, sim));
  });

  it('loads the twentieth, saved before the editions, adding the edition as a free save (M2.11)', () => {
    // The page's game: every life starts free.
    const people = sliceGame({ people: 1000, unlocked: false });
    const result = load('life-v20.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual(withSchool(withDeal([])));
    expect(result.report.added).toEqual(['edition']);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(result.state.edition).toEqual({ unlocked: false });
  });

  it('loads the twenty-first, saved before a crew of your own, migrating the deal to version 4 (M4.1)', () => {
    const people = sliceGame({ people: 1000, unlocked: false });
    const result = load('life-v21.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual(withSchool([{ module: 'deal', from: 2, to: 5 }]));
    expect(result.report.added).toEqual([]);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(result.state.deal).toMatchObject({ connect: false, members: [] });
  });

  it('loads the twenty-second, saved before rival corners, migrating the deal from 3 to 5 (M4.1 step 2)', () => {
    const people = sliceGame({ people: 1000, unlocked: false });
    const result = load('life-v22.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual(withSchool([{ module: 'deal', from: 3, to: 5 }]));
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(result.state.deal).toMatchObject({ rival: { warned: 0, stretch: -1, off: -1 } });
  });

  it('loads the twenty-third, saved before the trade’s cash was counted, migrating the deal from 4 to 5 (M4.1 step 4)', () => {
    const people = sliceGame({ people: 1000, unlocked: false });
    const result = load('life-v23.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual(withSchool([{ module: 'deal', from: 4, to: 5 }]));
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(result.state.deal).toMatchObject({ dirty: 0 });
  });

  it('loads the twenty-fourth, saved before the university, migrating the education from 5 to 7 (M4.2)', () => {
    const people = sliceGame({ people: 1000, unlocked: false });
    const result = load('life-v24.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual([{ module: 'education', from: 5, to: 7 }]);
    expect(result.report.added).toEqual([]);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    // Never applied: not admitted, nothing earned there.
    expect((result.state.education as { university: object }).university).toEqual({
      term: null,
      credits: 0,
      points: 0,
      graded: 0,
      passed: [],
      grades: {},
      admitted: false,
      applied: -1,
      transferred: 0,
    });
  });

  it('loads the twenty-fifth, saved before law school, migrating the education from 6 to 7 (M4.2 step 2)', () => {
    const people = sliceGame({ people: 1000, unlocked: false });
    const result = load('life-v25.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual([{ module: 'education', from: 6, to: 7 }]);
    expect(result.report.added).toEqual([]);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const e = result.state.education as { law: { lsat: number; admitted: boolean; licensed: boolean }; grad: object };
    expect(e.law).toMatchObject({ lsat: -1, admitted: false, licensed: false });
    expect(e.grad).toEqual({ owed: 0, interest: 0, since: 0, repay: -1, monthly: 0, behind: 0 });
  });

  it('migrates a version-3 crew’s members as never warned off a corner', () => {
    const member = { person: 4, since: 2, held: 283, owed: 140000, due: 23, taken: 0, cutOff: false };
    const migrated = migrateDeal4({ members: [member] });
    expect(migrated.members[0]).toEqual({ ...member, rival: { warned: 0, stretch: -1, off: -1 } });
    expect(migrated.rival).toEqual({ warned: 0, stretch: -1, off: -1 });
  });

  it('migrates a version-1 job’s practice into its experience, and nothing for someone never hired', () => {
    const migrate = (jobModule().migrate as Record<number, (s: unknown) => unknown>)[2] as (s: unknown) => unknown;
    expect((migrate({ career: 'line-cook', practice: 900 }) as { experience: object }).experience).toEqual({
      'line-cook': 900,
    });
    expect((migrate({ career: null, practice: 0 }) as { experience: object }).experience).toEqual({});
  });

  it('migrates a version-4 circle’s ties as never asked to stay', () => {
    const { night: _n, ...old } = { ...newTie(5, 300, 2), status: 'dating' as const, nights: 4 };
    expect(migrateCircle5({ ...noOne(), ties: [old] }).ties[0]).toEqual({ ...old, night: -1 });
  });

  it('migrates a version-2 family’s children as never parted', () => {
    const child = { born: 3, first: 'Ava', last: 'K', pronouns: 'she', carries: true, other: 9, with: 'you' };
    const v2 = { ...noFamily(), children: [child] };
    const { given: _g, arrears: _a, ...old } = v2;
    expect(migrateFamily3(old).children).toEqual([{ ...child, parted: -1 }]);
    expect(migrateFamily3(old).arrears).toEqual({ owe: 0, owed: 0 });
  });

  it('migrates a version-1 family keeping its children and what is owed', () => {
    const kept = { pregnancy: null, children: [], owed: 120, settled: 9 };
    expect(migrateFamily2(kept)).toEqual({ ...noFamily(), ...kept });
  });

  it('migrates a version-2 circle keeping what each tie had, a partner’s time together from when last seen', () => {
    const v2 = { ...newTie(4, 50, 1), status: 'dating', seen: 9 };
    const { since: _s, living: _l, dated: _d, nights: _n, proposed: _p, licence: _c, hearing: _h, ...old } = v2;
    const migrated = migrateCircle3({ ties: [{ ...old, regard: 77 }], out: -1, drawnTo: null, settled: 9 });
    expect(migrated.ties[0]).toEqual({ ...v2, regard: 77, since: 9 });
  });

  it('migrates a version-1 circle keeping each tie’s regard, as people you know, never asked out', () => {
    const migrated = migrateCircle2({
      ties: [{ person: 7, together: 90, regard: 81, met: 3 }],
      out: -1,
      drawnTo: 'men',
    });
    expect(migrated).toEqual({
      ties: [{ ...newTie(7, 90, 3), regard: 81, seen: 3 }],
      out: -1,
      drawnTo: 'men',
      settled: 0,
    });
  });

  it('loads the fourth, saved with people you know before courting, migrating the circle from 1 to 6 (M2.6)', () => {
    const people = sliceGame({ people: 1000 });
    const result = load('life-v4.json', sim, people);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(byModule(result.report.migrated)).toEqual(withJob([{ module: 'circle', from: 1, to: 6 }]));
    expect(result.report.added).toEqual([
      'family',
      'lives',
      'health',
      'education',
      'travel',
      'season',
      'event',
      'edition',
    ]);
    expect(result.report.skipped).toBe(0);
    expect(result.report.replayed).toBe(result.file.log.length);
    const saved = (fixture('life-v4.json') as { snapshot: { circle: { ties: { person: number; regard: number }[] } } })
      .snapshot.circle.ties;
    const ties = (result.state.circle as { ties: { person: number; regard: number; status: string }[] }).ties;
    expect(saved.length).toBeGreaterThan(0);
    expect(ties.map((t) => [t.person, t.regard, t.status])).toEqual(saved.map((t) => [t.person, t.regard, 'known']));
    // Each tie in the shape a new one has, down to its keys.
    const fresh = people.init('v4-shape', sim).circle as { ties: unknown[] };
    expect(keysOf(result.state.circle)).toEqual(keysOf(fresh));
    for (const t of ties) expect(Object.keys(t).sort()).toEqual(Object.keys(newTie(0, 0, 0)).sort());
  });
});
