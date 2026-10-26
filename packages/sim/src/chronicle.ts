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
import { choiceOf } from './events/records.ts';

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
  readonly supplier?: string;
}

/** Events the chronicle leaves out: the machinery, and what another event already tells. */
export const QUIET: Readonly<Record<string, string>> = {
  'economy/changed': 'money moving; the event that moved it is told',
  'inventory/gained': 'the bag; taking and selling are told',
  'inventory/lost': 'the bag; selling and eating are told',
  'inventory/full': 'the bag',
  'logic/rolled': 'a roll; its outcome is told',
  'event/asked': 'the interface: the sheet asks; what followed is told',
  'edition/unlocked': 'the interface: the game, not the life',
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
  'market/applied': 'the interface: applications wait in the Jobs panel; the answer is told',
  'market/took': 'told as starting the job',
  'people-work/left': 'the city’s people, off screen',
  'people-work/joined': 'the city’s people, off screen',
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
  'deal/sold': 'each sale; the hour on the corner is told, and the money shows in your cash',
  'deal/turned-away': 'a buyer you had nothing for; the hour on the corner is told',
  'deal/seen': 'who saw you is not yours to know; what the police do about it is told',
  'prison/hearing': 'its outcome is told',
  'circle/talked': 'every talk; what it did is theirs, shown in their panel',
  'circle/shared-rent': 'money moving; moving in is told',
  'family/cared': 'each sitting of care; a day without enough is weighed',
  'family/short': 'a day short of care; a report, if it comes, is told',
  'family/daycare': 'money moving',
  'family/support': 'money moving, each month; custody is told',
  'education/studied': 'each hour of study; the test or grade it was for is told',
  'education/attended': 'each class; the grade is told',
  'family/conceived': 'nobody knows yet; finding out is told',
  'circle/planned': 'the interface: the date is in the panel, and going or missing it is told',
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

/** A count of something: "1 day", "30 days". */
const counted = (n: number, what: string): string => (n === 1 ? `1 ${what}` : `${n} ${what}s`);

/** Tenths of a gram as a weight: "3.5 grams", "28 grams". */
export function weight(tenths: number): string {
  const whole = Math.floor(tenths / 10);
  return tenths % 10 === 0 ? `${whole} grams` : `${whole}.${tenths % 10} grams`;
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
/** The journal's line for what followed a life event's choice. */
function lifeLine(store: RecordStore, beat: Readonly<Record<string, unknown>>): string {
  const c = choiceOf(store, beat.event as string, beat.choice);
  return (beat.failed === true ? (c.failure ?? c.outcome) : c.outcome).line;
}

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
      case 'supplier':
        return names[key] ?? fail(`"${line.text}" names the ${key}, and there is none`);
      case 'item':
        return named(store, 'item', v);
      // A life event's line is its record's own (M2.10 step 4), with the name in it.
      case 'line':
        return lifeLine(store, beat).replace(/\{you\}/g, names.you);
      case 'offence':
        return named(store, 'offence', v);
      case 'event':
        return named(store, 'shift-event', v);
      case 'course': {
        const r = store.get<{ college?: { courses: { id: string; name: string }[] } }>('education', 'michigan');
        return r?.college?.courses.find((c) => c.id === v)?.name ?? fail(`no course "${String(v)}"`);
      }
      case 'subject': {
        const r = store.get<{ ged: { subjects: { id: string; name: string }[] } }>('education', 'michigan');
        return r?.ged.subjects.find((s) => s.id === v)?.name ?? fail(`no GED subject "${String(v)}"`);
      }
      case 'career': {
        const name = named(store, 'career', v);
        return `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`;
      }
      case 'date':
        return dateOf(start, beat.day as number);
      case 'court':
        return dateOf(start, beat.court as number);
      case 'minimum':
        return dateOf(start, beat.minimum as number);
      case 'due':
        return dateOf(start, beat.due as number);
      case 'hours':
        return hours((beat.worked ?? beat.minutes) as number);
      case 'jail':
      case 'probation':
      case 'days':
        return counted(v as number, 'day');
      case 'prison':
        return counted(v as number, 'month');
      case 'rent':
      case 'cents':
        return money(beat.cents as number);
      case 'grams':
        return weight(v as number);
      case 'net':
      case 'price':
      case 'yours':
      case 'bond':
      case 'posted':
      case 'owed':
      case 'paid':
      case 'demand':
      case 'left':
      case 'charge':
      case 'pell':
      case 'borrowed':
      case 'cash':
        return money(v as number);
      default:
        return v === undefined ? fail(`"${line.text}" has {${key}}, which ${type} doesn't carry`) : String(v);
    }
  };
  return line.text.replace(/\{(\w+)\}/g, (_, key: string) => fill(key));
}
