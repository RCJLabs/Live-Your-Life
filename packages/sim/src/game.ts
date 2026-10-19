/**
 * The game as the engine runs it (engine/docs/specs/sim.md): the engine's time module on this
 * game's calendar, and the clock. Needs, money and people join this list in M0.2.
 */
import { createGame, type Game, type RealTime, timeModule } from '@eb/core';
import { DEFAULT_START, type LifeStart, lifeCalendar } from './calendar.ts';
import { clockModule } from './clock.ts';

/**
 * Wall-clock time into game time at speed 1: half a second a game minute, so a day lasts 12
 * real minutes (tune; docs/DESIGN.md, Time). The stage scales the milliseconds it passes for the
 * faster speeds and passes none while paused or hidden, so the cap only has to absorb a stalled
 * frame; anything longer was not time the player meant to spend.
 */
export const REAL_TIME: RealTime = { msPerTick: 500, maxElapseMs: 2000 };

export interface LifeOptions {
  readonly start?: LifeStart;
}

export function createLifeGame(options: LifeOptions = {}): Game {
  return createGame({
    modules: [timeModule({ calendar: lifeCalendar(options.start ?? DEFAULT_START), realTime: REAL_TIME }), clockModule],
    start: 'world',
  });
}
