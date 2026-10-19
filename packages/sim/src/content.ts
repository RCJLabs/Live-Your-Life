/**
 * The records this game's modules read. The cash, an economy-kit resource counted in cents, is
 * written here; everything else comes from packages/content's pack, in the engine's project
 * format and checked by `eb validate`: the career, its shift events and the taxes (M1.3).
 */
import { createRecordStore, type RecordPack, type SimContext } from '@eb/core';
import { START_CASH } from './dials.ts';

export const LIFE_CONTENT: RecordPack = {
  resource: { cash: { name: 'Cash', start: START_CASH, min: 0 } },
};

/** What the sim reads but never saves, for a session, a bot or a test: the cash, and the pack's records if given. */
export const lifeSim = (records: RecordPack = {}): SimContext => ({
  content: createRecordStore({ ...records, ...LIFE_CONTENT }),
});
