/**
 * Who you are (M1.6): a name for the chronicle's third person (D52). Until the background pick at
 * the start (D20) is built, the name is drawn from the seed and the name pool, as the
 * coworker's is (ties/person.ts). A life with no name pool, a test's, is "You".
 *
 * And your walk to work (D61): the stage measures the route from your bed to where you work and
 * tells the sim, as it tells it you arrived somewhere. The alarm (D57) sets that walk aside, with
 * a margin; until the stage has said, it sets aside ALARM_MINUTES.
 */
import { defineModule } from '@eb/core';
import { ALARM_MINUTES } from './dials.ts';
import { namePoolOf, type Pronouns } from './ties/records.ts';

export const NAMES = 'rust-belt';

/** Minutes the alarm adds to the walk: time to get up and out of the door (tune). */
export const ALARM_MARGIN = 10;
/** The longest walk to work the stage may report, in game minutes: past it, the route is wrong. */
export const LONGEST_WALK = 180;

export interface YouSlice {
  readonly first: string;
  readonly last: string;
  readonly pronouns: Pronouns;
  /** Game minutes from your bed to where you work, as the stage measured them; null until it has. */
  commute: number | null;
}

export const youModule = defineModule<YouSlice>({
  id: 'you',
  // 2 (M1.8, D61): the walk to work.
  version: 2,
  migrate: {
    2: (slice) => ({ ...(slice as object), commute: null }),
  },
  init: (ctx) => {
    if (!ctx.content.has('name-pool', NAMES)) return { first: 'You', last: '', pronouns: 'they', commute: null };
    const pool = namePoolOf(ctx.content, NAMES);
    const rng = ctx.rng('you');
    const first = rng.pick(pool.first);
    return { first: first.name, last: rng.pick(pool.last), pronouns: first.pronouns, commute: null };
  },
  actions: {
    // The stage's measure of the walk, sent once a life is on the page. No bot is offered it.
    commute: (ctx, action) => {
      const minutes = action.minutes;
      if (typeof minutes !== 'number' || !Number.isSafeInteger(minutes) || minutes < 1 || minutes > LONGEST_WALK)
        return ctx.refuse('bad-minutes');
      ctx.write().commute = minutes;
    },
  },
  facts: {
    last: { read: ({ state }) => state.last, label: 'your last name' },
    pronouns: {
      read: ({ state }) => state.pronouns,
      domain: { type: 'enum', values: ['she', 'he', 'they'] },
      label: 'your pronouns',
    },
    alarm: {
      read: ({ state }) => (state.commute === null ? ALARM_MINUTES : state.commute + ALARM_MARGIN),
      domain: { type: 'int', min: 1 },
      label: 'minutes the alarm sets aside before a shift',
    },
  },
});
