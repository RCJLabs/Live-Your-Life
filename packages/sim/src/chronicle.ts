/**
 * The chronicle (M1.6, D52): what happened, in third person and past tense (VOICE.md), from the
 * events the sim raises. Each line is a record (packages/content/types/line.json) keyed by the
 * event, and by one of its fields when it reads differently by it; its placeholders are filled
 * from the event and the names in the life. Events nobody would write down, such as rolls, time
 * passing and money moving, are listed in QUIET, with why. Anything else with no line is a gap,
 * which the tests fail on.
 */
import type { RecordStore } from '@eb/core';
import { type LifeStart, MONTHS, WEEKDAYS, weekdayOf } from './calendar.ts';

export interface LineRecord {
  readonly beat: string;
  readonly when?: { readonly field: string; readonly is: string };
  readonly text: string;
}

/** The names a line can use: yours, the coworker's and the fence's. */
export interface Names {
  readonly you: string;
  readonly coworker?: string;
  readonly fence?: string;
}

/** Events the chronicle leaves out: the machinery, and what another event already tells. */
export const QUIET: Readonly<Record<string, string>> = {
  'economy/changed': 'money moving; the event that moved it is told',
  'inventory/gained': 'the bag; taking and selling are told',
  'inventory/lost': 'the bag; selling and eating are told',
  'inventory/full': 'the bag',
  'logic/rolled': 'a roll; its outcome is told',
  mode: 'the interface',
  'time/fired': 'the clock',
  'time/passed': 'the clock',
  'time/scheduled': 'the clock',
  'time/cancelled': 'the clock',
  'time/capped': 'the clock',
  'people/passed': 'the clock, as the tier-1 people hear it',
  'life/started': 'every activity; the chronicle tells what mattered',
  'life/ended': 'every activity',
  'job/posted': 'the interface: the week’s shifts are in the panel',
  'job/standing': 'a number; lateness and no-shows are told',
  'job/started': 'the shift’s end is told',
  'job/worked': 'part of a shift; the shift’s end is told',
  'job/event': 'its outcome is told',
  'job/chose': 'its outcome is told',
  'job/covered': 'told as the coworker covering',
  'job/took-shift': 'told as agreeing to cover',
  'ties/remembered': 'what they remember is theirs, shown in their panel',
  'law/notice': 'the interface: what is coming is in the panel',
  'law/in-court': 'the plea is told',
  'law/trainee': 'told with the plea',
};

const fail = (problem: string): never => {
  throw new Error(`chronicle: ${problem}`);
};

/** Cents as dollars and cents: $1,234.50. */
export function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

/** Minutes as hours: "8 hours", "7 hours and 30 minutes", "45 minutes". */
export function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hs = h === 1 ? '1 hour' : `${h} hours`;
  const ms = m === 1 ? '1 minute' : `${m} minutes`;
  return h === 0 ? ms : m === 0 ? hs : `${hs} and ${ms}`;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A day of the life as the chronicle writes it: "Thursday 3 July". */
export function dateOf(start: LifeStart, day: number): string {
  const weekday = WEEKDAYS[(weekdayOf(start) + day) % 7] as string;
  let month = start.month - 1;
  let date = start.day + day;
  for (let len = (MONTHS[month] as { days: number }).days; date > len; len = (MONTHS[month] as { days: number }).days) {
    date -= len;
    month = (month + 1) % 12;
  }
  return `${capital(weekday)} ${date} ${capital((MONTHS[month] as { id: string }).id)}`;
}

/** A record's name as it reads mid-sentence: "A candy bar" becomes "a candy bar". */
const named = (store: RecordStore, type: string, id: unknown): string => {
  const record = store.get<{ name: string }>(type, String(id)) ?? fail(`no ${type} "${String(id)}"`);
  return record.name.charAt(0).toLowerCase() + record.name.slice(1);
};

/** The line for an event, if the chronicle writes one, in its order of records. */
export function lineRecord(store: RecordStore, beat: Readonly<Record<string, unknown>>): LineRecord | undefined {
  return store
    .entries<LineRecord>('line')
    .map(([, l]) => l)
    .find((l) => l.beat === beat.type && (!l.when || String(beat[l.when.field]) === l.when.is));
}

/**
 * The chronicle's line for an event, or null for one it leaves out. Throws for a placeholder it
 * can't fill, so a line never reads with a hole in it.
 */
export function lineFor(
  store: RecordStore,
  beat: Readonly<Record<string, unknown>>,
  names: Names,
  start: LifeStart,
): string | null {
  const type = String(beat.type);
  if (type in QUIET) return null;
  const line = lineRecord(store, beat);
  if (!line) return null;
  const fill = (key: string): string => {
    const v = beat[key];
    switch (key) {
      case 'you':
        return names.you;
      case 'coworker':
      case 'fence':
        return names[key] ?? fail(`"${line.text}" names the ${key}, and there is none`);
      case 'item':
        return named(store, 'item', v);
      case 'offence':
        return named(store, 'offence', v);
      case 'event':
        return named(store, 'shift-event', v);
      case 'date':
        return dateOf(start, beat.day as number);
      case 'court':
        return dateOf(start, beat.court as number);
      case 'hours':
        return hours((beat.worked ?? beat.minutes) as number);
      case 'rent':
        return money(beat.cents as number);
      case 'net':
      case 'owed':
      case 'paid':
      case 'demand':
        return money(v as number);
      default:
        return v === undefined ? fail(`"${line.text}" has {${key}}, which ${type} doesn't carry`) : String(v);
    }
  };
  return line.text.replace(/\{(\w+)\}/g, (_, key: string) => fill(key));
}
