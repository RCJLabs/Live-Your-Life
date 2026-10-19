import { calendarOf, dateAt } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_START, type LifeStart, lifeCalendar } from './calendar.ts';

const hours = (n: number) => n * 60;
const days = (n: number) => n * 24 * 60;
const read = (start: LifeStart, minutes: number) => dateAt(calendarOf(lifeCalendar(start)), minutes);
const at = (minutes: number) => read(DEFAULT_START, minutes);
const startOn = (year: number, month: number, day: number): LifeStart => ({ year, month, day, hour: 9, minute: 0 });
// The default life starts at 07:00, so its first midnight is 17 hours in.
const MIDNIGHT = hours(17);

describe('the calendar', () => {
  it('starts a default life on Monday 2 June 2025 at 07:00, a summer morning', () => {
    expect(at(0)).toMatchObject({
      day: 0,
      ofDay: hours(7),
      weekday: 'monday',
      year: 2025,
      month: 'june',
      dayOfMonth: 2,
      phase: 'morning',
      season: 'summer',
    });
  });

  it('turns the day at midnight', () => {
    expect(at(MIDNIGHT - 1)).toMatchObject({ day: 0, ofDay: days(1) - 1, weekday: 'monday', phase: 'night' });
    expect(at(MIDNIGHT)).toMatchObject({ day: 1, ofDay: 0, weekday: 'tuesday', dayOfMonth: 3, phase: 'night' });
  });

  it('reads the parts of the day at their edges', () => {
    const phaseAt = (hour: number, minute: number) => at(MIDNIGHT + hours(hour) + minute).phase;
    expect(phaseAt(5, 59)).toBe('night');
    expect(phaseAt(6, 0)).toBe('morning');
    expect(phaseAt(11, 59)).toBe('morning');
    expect(phaseAt(12, 0)).toBe('afternoon');
    expect(phaseAt(17, 59)).toBe('afternoon');
    expect(phaseAt(18, 0)).toBe('evening');
    expect(phaseAt(21, 59)).toBe('evening');
    expect(phaseAt(22, 0)).toBe('night');
  });

  // Days from the default start (2 June, day 152 of 2025) to each date, checked against a real calendar.
  it.each([
    { date: 'Monday 1 September 2025', from: 243 - 152, month: 'september', weekday: 'monday', season: 'fall' },
    { date: 'Monday 1 December 2025', from: 334 - 152, month: 'december', weekday: 'monday', season: 'winter' },
    { date: 'Thursday 1 January 2026', from: 365 - 152, month: 'january', weekday: 'thursday', season: 'winter' },
    { date: 'Sunday 1 March 2026', from: 365 + 59 - 152, month: 'march', weekday: 'sunday', season: 'spring' },
  ])('reads $date with its weekday and season', ({ from, month, weekday, season }) => {
    expect(at(days(from) - hours(7))).toMatchObject({ ofDay: 0, month, dayOfMonth: 1, weekday, season });
  });

  it('has 365 days in a year: 2 June 2026, a Tuesday, is 365 days after the start', () => {
    expect(at(days(365))).toMatchObject({ year: 2026, month: 'june', dayOfMonth: 2, weekday: 'tuesday' });
  });

  it.each([
    { date: 'Wednesday 1 January 2025', start: startOn(2025, 1, 1), weekday: 'wednesday' },
    { date: 'Friday 4 July 2025', start: startOn(2025, 7, 4), weekday: 'friday' },
    { date: 'Thursday 1 January 2026', start: startOn(2026, 1, 1), weekday: 'thursday' },
  ])('starts a life on $date', ({ start, weekday }) => {
    expect(read(start, 0)).toMatchObject({ weekday, ofDay: hours(9) });
  });

  it('runs a day early after each skipped 29 February: 1 January 2030, a Tuesday, reads as a Monday', () => {
    expect(read(startOn(2030, 1, 1), 0).weekday).toBe('monday');
  });

  it('counts weekdays the same way before 2025', () => {
    // 365 days are 52 weeks and a day, so a year earlier is a weekday earlier.
    expect(read(startOn(2024, 6, 2), 0).weekday).toBe('sunday');
  });

  it.each([
    { what: 'month 0', start: { ...DEFAULT_START, month: 0 } },
    { what: 'month 13', start: { ...DEFAULT_START, month: 13 } },
    { what: '29 February', start: { ...DEFAULT_START, month: 2, day: 29 } },
    { what: '31 April', start: { ...DEFAULT_START, month: 4, day: 31 } },
    { what: 'day 0', start: { ...DEFAULT_START, day: 0 } },
    { what: 'hour 24', start: { ...DEFAULT_START, hour: 24 } },
    { what: 'minute 60', start: { ...DEFAULT_START, minute: 60 } },
    { what: 'year 0', start: { ...DEFAULT_START, year: 0 } },
    { what: 'half a day', start: { ...DEFAULT_START, day: 1.5 } },
  ])('throws on a start at $what', ({ start }) => {
    expect(() => lifeCalendar(start)).toThrow(/LifeStart/);
  });

  it('makes calendars the engine accepts', () => {
    expect(() => calendarOf(lifeCalendar())).not.toThrow();
    expect(calendarOf(lifeCalendar()).daysPerYear).toBe(365);
  });
});
