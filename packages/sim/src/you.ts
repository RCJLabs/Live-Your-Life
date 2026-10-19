/**
 * Who you are (M1.6): a name for the chronicle's third person (D52). Until the background pick at
 * the start (D20) is built, the name is drawn from the seed and the name pool, as the
 * coworker's is (ties/person.ts). A life with no name pool, a test's, is "You".
 */
import { defineModule } from '@eb/core';
import { namePoolOf, type Pronouns } from './ties/records.ts';

export const NAMES = 'rust-belt';

export interface YouSlice {
  readonly first: string;
  readonly last: string;
  readonly pronouns: Pronouns;
}

export const youModule = defineModule<YouSlice>({
  id: 'you',
  init: (ctx) => {
    if (!ctx.content.has('name-pool', NAMES)) return { first: 'You', last: '', pronouns: 'they' };
    const pool = namePoolOf(ctx.content, NAMES);
    const rng = ctx.rng('you');
    const first = rng.pick(pool.first);
    return { first: first.name, last: rng.pick(pool.last), pronouns: first.pronouns };
  },
});
