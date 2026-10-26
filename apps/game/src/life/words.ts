/**
 * The interface's words (M1.6): second person, present tense, and plain (VOICE.md). Every number
 * is formatted from what the sim says, never typed in: times from the clock's facts, money from
 * cents, odds from the preview the roll uses.
 */
import { DEFAULT_START, dateOf, holidayToday, hours, money, type Need } from '@lyl/sim';
import type { Life } from './session.ts';

export { hours, money };

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** "Monday 2 June, 07:00": the clock line. */
export function clockText(life: Life, minuteOfDay = life.fact('time.of-day') as number): string {
  const hh = String(Math.floor(minuteOfDay / 60) % 24).padStart(2, '0');
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  return `${cap(String(life.fact('time.weekday')))} ${life.fact('time.day-of-month')} ${cap(String(life.fact('time.month')))}, ${hh}:${mm}`;
}

/** What the day is beside its date (D131, D132): a holiday's name, snow on the ground, or nothing. */
export function seasonText(life: Life): string {
  const holiday = holidayToday({ content: life.sim.content, fact: (id, args) => life.fact(id, args) });
  const snow = life.fact('season.snow') === true ? 'Snow' : '';
  return [holiday ?? '', snow].filter(Boolean).join(', ');
}

/** A day of the life: "Thursday 5 June", or "today" and "tomorrow". */
export function dayText(life: Life, day: number): string {
  const today = life.fact('time.day') as number;
  if (day === today) return 'today';
  if (day === today + 1) return 'tomorrow';
  return dateOf(DEFAULT_START, day);
}

/** A tick as a day and a time: "tomorrow at 14:20". */
export function whenText(life: Life, tick: number): string {
  const now = life.fact('time.tick') as number;
  const ofDay = life.fact('time.of-day') as number;
  const minute = (((ofDay + tick - now) % 1440) + 1440) % 1440;
  const day = (life.fact('time.day') as number) + Math.floor((ofDay + tick - now) / 1440);
  return `${dayText(life, day)} at ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** What each need is called on the bar: what it is, not a meter's name. */
export const NEED_WORD: Readonly<Record<Need, string>> = {
  rest: 'Rest',
  food: 'Food',
  hygiene: 'Clean',
  company: 'Company',
  calm: 'Calm',
  health: 'Health',
};

const DOING: Readonly<Record<string, string>> = {
  sleep: 'Sleep',
  eat: 'Eat',
  wash: 'Shower',
  relax: 'Sit and rest',
  socialize: 'Talk with people here',
  work: 'Work',
};

/** A menu's line for an activity offered for some minutes. */
export function doingText(activity: string, minutes: number, onShift = false): string {
  if (activity === 'work') return `Work the rest of the shift, ${hours(minutes)}`;
  return `${DOING[activity] ?? cap(activity)} for ${hours(minutes)}${onShift ? '' : ''}`;
}

/** Odds as the interface states them: "45 in 100". The preview's number, as it is rolled. */
export const odds = (chance: number): string => `${chance} in 100`;
