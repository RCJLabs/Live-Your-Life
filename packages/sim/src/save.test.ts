import { readFileSync } from 'node:fs';
import { loadSave } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { sliceGame, sliceSim } from '../test/slice.ts';

/**
 * The first save fixture (M1.7; CLAUDE.md, Saves never break): a week saved by the build that
 * started keeping saves (life-v1), and one by M1.8's after the walk to work (life-v2), each written
 * once by test/fixture.ts and never again. Every later
 * build must load it with nothing skipped and every slice in the shape today's modules expect.
 * A change to a slice's shape needs a version and a migration, or this fails.
 */
const FIXTURE = new URL('../test/fixtures/saves/life-v1.json', import.meta.url);
/** The content the fixture was saved with. With other content its log may play out otherwise, which a load reports and allows. */
const SAVED_WITH = '0b75d724de0fc3b0';

const keysOf = (value: unknown): string[] =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.keys(value).sort() : [];

describe('the first save fixture', () => {
  const game = sliceGame();
  const sim = sliceSim();
  const raw = JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown;

  it('loads with nothing skipped, and to the state it saved while the content is the same', () => {
    const result = loadSave(game, raw, sim, { game: 'live-your-life', build: 'this-build' });
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.report.skipped).toBe(0);
    expect(result.report.kept).toEqual([]);
    expect(result.report.replayed).toBe(result.file.log.length);
    // Saved at version 1 of `you`; version 2 added the walk to work (D61).
    expect(result.report.migrated).toEqual([{ module: 'you', from: 1, to: 2 }]);
    // A migrated state isn't the state saved, so the saved hash is held only while nothing migrates.
    if (PACK.hash === SAVED_WITH && result.report.migrated.length === 0) expect(result.report.differs).toBe(false);
  });

  it('migrates every slice to the shape a new life has, down to the keys of each', () => {
    const result = loadSave(game, raw, sim, { game: 'live-your-life', build: 'this-build' });
    if (!result.ok) throw new Error(result.message);
    const fresh = game.init('shape', sim);
    expect(keysOf(result.state)).toEqual(keysOf(fresh));
    for (const module of keysOf(fresh)) {
      expect(keysOf(result.state[module]), module).toEqual(keysOf(fresh[module]));
    }
    expect(result.state.kernel.versions).toEqual(fresh.kernel.versions);
  });
});
