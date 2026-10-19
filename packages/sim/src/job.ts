/**
 * The job module: Phase 0's one job, a placeholder until the career template (M1.3). It knows
 * when the shift is, counts the minutes worked, and pays them on payday into the economy kit's
 * cash. The life module does the working; this module only hears about it, through `paid-work`.
 */
import { defineModule, type FactView } from '@eb/core';
import { JOB } from './dials.ts';

export interface JobSlice {
  /** Minutes worked since the last payday. */
  unpaid: number;
}

/** Whole cents for minutes of work, rounded down: a wage that divides by 60 makes it exact. */
export const payFor = (minutes: number): number => Math.floor((minutes * JOB.wagePerHour) / 60);

/** Minutes left in today's shift: 0 off shift. */
function shiftLeft(view: FactView<JobSlice>): number {
  const weekday = view.fact('time.weekday') as string;
  if (!(JOB.days as readonly string[]).includes(weekday)) return 0;
  const minute = view.fact('time.of-day') as number;
  const end = JOB.from + JOB.minutes;
  return minute >= JOB.from && minute < end ? end - minute : 0;
}

export const jobModule = defineModule<JobSlice>({
  id: 'job',
  init: () => ({ unpaid: 0 }),
  facts: {
    'on-shift': { read: (view) => shiftLeft(view) > 0, domain: { type: 'bool' }, label: 'on shift' },
    'shift-left': {
      read: shiftLeft,
      domain: { type: 'int', min: 0, max: JOB.minutes },
      label: 'minutes left in the shift',
    },
    unpaid: {
      read: ({ state }) => payFor(state.unpaid),
      domain: { type: 'int', min: 0 },
      label: 'pay earned and not yet paid',
    },
  },
  effects: {
    'paid-work': (ctx, effect) => {
      const minutes = effect.minutes;
      if (typeof minutes !== 'number' || !Number.isSafeInteger(minutes) || minutes < 1) {
        throw new Error('paid-work: "minutes" is a whole number, at least 1');
      }
      ctx.write().unpaid += minutes;
    },
    payday: (ctx) => {
      const cents = payFor(ctx.read().unpaid);
      ctx.write().unpaid = 0;
      if (cents > 0) ctx.apply({ effect: 'add-resource', resource: 'cash', by: cents });
      ctx.emit('paid', { cents });
    },
  },
});
