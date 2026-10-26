/**
 * The free year and the unlock (M2.11, D137, D138). A save's free year ends on day 365, its first
 * character's 19th birthday (D20): the `year-end` mode stops the world there until the game is
 * unlocked. The unlock is an action the page sends when the device is unlocked, so a save replays
 * as it was played. A new life is a new save, with a free year of its own.
 */
import { defineModule, type ModuleContext } from '@eb/core';
import { WARD } from '../lives/ward.ts';

export interface EditionSlice {
  unlocked: boolean;
}

type Ctx = ModuleContext<EditionSlice>;

export const YEAR_END = 'year-end';
/** Days in the free year: from the first morning to the 19th birthday (D20). */
export const FREE_DAYS = 365;

/** Modes the year's end waits behind: a death's choice, and a ward's years until they wake. */
const WAITS = new Set(['dead', WARD, YEAR_END]);

function check(ctx: Ctx): void {
  if (ctx.read().unlocked || WAITS.has(ctx.modes.current.id)) return;
  if ((ctx.fact('time.day') as number) < FREE_DAYS) return;
  ctx.modes.push(YEAR_END, {});
  ctx.emit('year-ended', { day: FREE_DAYS });
}

/**
 * The edition. `unlocked` starts a life already unlocked: for tests and benches that live past the
 * first year. The page starts every life free and sends the unlock when the device has it.
 */
export const editionModule = (unlocked = false) =>
  defineModule<EditionSlice>({
    id: 'edition',
    init: () => ({ unlocked }),
    events: {
      'year-ended': { args: { day: { type: 'int', min: 0 } }, label: 'The free year ended' },
      unlocked: { args: {}, label: 'The game was unlocked' },
    },
    facts: {
      unlocked: { read: ({ state }) => state.unlocked, domain: { type: 'bool' }, label: 'the game unlocked' },
      'days-left': {
        read: (v) => Math.max(0, FREE_DAYS - (v.fact('time.day') as number)),
        domain: { type: 'int', min: 0 },
        label: 'days left in the free year',
      },
    },
    actions: {
      // The page's, when the device is unlocked: at the last card, or at the start of any life after.
      unlock: {
        run: (ctx) => {
          if (ctx.read().unlocked) return ctx.refuse('unlocked');
          ctx.write().unlocked = true;
          if (ctx.modes.current.id === YEAR_END) ctx.modes.pop();
          ctx.emit('unlocked', {});
        },
        options: () => [],
      },
    },
    on: { 'time/passed': (ctx) => check(ctx) },
    // At the year's end only the unlock goes on.
    modes: { [YEAR_END]: { actions: ['edition/unlock'] } },
  });
