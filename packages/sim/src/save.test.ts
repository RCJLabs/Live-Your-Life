import { readFileSync } from 'node:fs';
import { createGame, loadSave, readPack } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { LINE_COOK, sliceGame, sliceSim } from '../test/slice.ts';
import { lifeModules } from './game.ts';

/**
 * The save fixtures (CLAUDE.md, Saves never break): a week saved by the build that started keeping
 * saves (life-v1, M1.7), and one saved after the walk to work joined `you` (life-v2, D61), each
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

describe('the save fixtures', () => {
  const game = sliceGame();
  const sim = sliceSim();
  const then = sliceSim(readPack(fixture(SAVED_WITH) as never).records);
  const load = (name: string, at = sim, with_ = game) =>
    loadSave(with_, fixture(name), at, { game: 'live-your-life', build: 'this-build' });
  // The game as it was before the tier-1 people joined the life (M2.2): what both fixtures were saved by.
  const before = createGame({
    modules: lifeModules({ career: LINE_COOK }).filter((m) => !m.id.startsWith('people')),
    start: 'world',
  });
  const people = lifeModules()
    .filter((m) => m.id.startsWith('people'))
    .map((m) => m.id);

  it('loads the first with nothing skipped, migrating `you` from version 1 to 2 (D61)', () => {
    const result = load('life-v1.json');
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.skipped).toBe(0);
    expect(result.report.kept).toEqual([]);
    expect(result.report.replayed).toBe(result.file.log.length);
    expect(result.report.migrated).toEqual([{ module: 'you', from: 1, to: 2 }]);
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

  it('loads the second, saved after the walk to work, with nothing migrated or skipped, and the people added (M2.2)', () => {
    const result = load('life-v2.json');
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.migrated).toEqual([]);
    expect(result.report.added).toEqual(people);
    expect(result.report.skipped).toBe(0);
    expect((result.state.you as { commute: number }).commute).toBe(36);
  });

  it('replays the second, by the game and the content it was saved with, to exactly the state it saved', () => {
    const result = load('life-v2.json', then, before);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.differs).toBe(false);
  });
});
