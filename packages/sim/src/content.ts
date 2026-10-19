/**
 * The records this game's modules read. For now one: cash, an economy-kit resource counted in
 * cents. They move into packages/content, in the engine's project format and checked by
 * `eb validate`, when there is content to write (careers, events, places).
 */
import { createRecordStore, type RecordPack, type SimContext } from '@eb/core';
import { START_CASH } from './dials.ts';

export const LIFE_CONTENT: RecordPack = {
  resource: { cash: { name: 'Cash', start: START_CASH, min: 0 } },
};

/** What the sim reads but never saves, for a session, a bot or a test. */
export const lifeSim = (): SimContext => ({ content: createRecordStore(LIFE_CONTENT) });
