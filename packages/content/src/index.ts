/**
 * @lyl/content: the game's content (CLAUDE.md, "Content is data"). The records in records/ are
 * checked by the engine's compiler against the types in types/ (`pnpm eb validate
 * packages/content`) and built into pack.json (`pnpm content`), which this reads. Nothing at run
 * time reads the records themselves; pack.test.ts holds the pack to them.
 */
import { createRecordStore, type Pack, type RecordStore, readPack } from '@eb/core';
import built from '../pack.json' with { type: 'json' };

/** The pack, checked as the engine checks any pack before it is read. */
export const PACK: Pack = readPack(built);

/** The records, for a session, a generator or a test. */
export const contentStore = (): RecordStore => createRecordStore(PACK.records);
