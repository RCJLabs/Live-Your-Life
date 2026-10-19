/**
 * The clock: what this game adds to the engine's time module (docs/DESIGN.md, Time). The time
 * module owns the tick, the calendar, timers and wall-clock time. The clock keeps no state of
 * its own (as the engine's logic module keeps none). It reads the time of day as hours and
 * minutes, for content and the HUD, and gives the player the one time verb a life needs that
 * the engine lacks: wait until a time of day, as sleeping until 06:30 or waiting for a 16:00
 * shift does.
 */
import { defineModule } from '@eb/core';
import { MINUTES_PER_DAY, MINUTES_PER_HOUR, PHASES } from './calendar.ts';

/** Minutes from `now` to the next `target`, both minutes of the day: a whole day when it is that time now. */
export function minutesUntil(now: number, target: number): number {
  const ahead = (target - now + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return ahead === 0 ? MINUTES_PER_DAY : ahead;
}

const whole = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;

const minuteOfDay = (view: { fact(id: string): unknown }): number => view.fact('time.of-day') as number;

export const clockModule = defineModule<Record<string, never>>({
  id: 'clock',
  init: () => ({}),
  actions: {
    'wait-until': {
      run(ctx, action) {
        const { hour, minute = 0 } = action;
        if (!whole(hour, 0, 23) || !whole(minute, 0, MINUTES_PER_HOUR - 1)) return ctx.refuse('bad-time');
        const minutes = minutesUntil(minuteOfDay(ctx), hour * MINUTES_PER_HOUR + minute);
        ctx.apply({ effect: 'wait', minutes });
      },
      // What a bot, or the HUD's wait menu, offers: the start of each part of the day.
      options: () => PHASES.map((phase) => ({ hour: phase.from / MINUTES_PER_HOUR, minute: 0 })),
    },
  },
  facts: {
    hour: {
      read: (view) => Math.floor(minuteOfDay(view) / MINUTES_PER_HOUR),
      domain: { type: 'int', min: 0, max: 23 },
      label: 'hour of the day',
    },
    minute: {
      read: (view) => minuteOfDay(view) % MINUTES_PER_HOUR,
      domain: { type: 'int', min: 0, max: MINUTES_PER_HOUR - 1 },
      label: 'minute of the hour',
    },
  },
  modes: {
    // Out in the city with time running. The life modules add their actions here as they arrive.
    world: { actions: ['time/*', 'clock/*'] },
  },
});
