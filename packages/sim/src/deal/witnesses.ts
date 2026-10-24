/**
 * Who passes the corner (D78): of the tier-1 people out on the street this hour, on their way
 * somewhere, the share the trade says pass a corner. Read from the same hour plans the people are
 * moved on by (people/gather.ts), with whoever has left or changed jobs (people/work.ts), so the
 * street is emptier at 3 am than at the morning rush for the same reason the town is.
 */
import type { FactView, ModuleContext, PreviewContext } from '@eb/core';
import { WEEKDAYS } from '../calendar.ts';
import { rosterWith } from '../people/careers.ts';
import { planAt } from '../people/gather.ts';
import { tradeOf } from './records.ts';

type View = FactView<unknown> | ModuleContext<unknown> | PreviewContext<unknown>;

const counted = new Map<string, number>();

/** The people out on the street in this game hour, of the whole roster. */
export function outNow(v: View): number {
  const n = v.fact('people.count') as number;
  if (n === 0) return 0;
  const seed = v.fact('people.seed') as number;
  const hour = (v.fact('time.day') as number) * 24 + Math.floor((v.fact('time.of-day') as number) / 60);
  const weekday = WEEKDAYS.indexOf(v.fact('time.weekday') as (typeof WEEKDAYS)[number]);
  const version = v.fact('people-work.version') as number;
  const key = `${seed}:${n}:${version}:${hour}:${weekday}`;
  const known = counted.get(key);
  if (known !== undefined) return known;
  const roster = rosterWith(v.content, seed, n, v.fact('people-work.moves') as number[], version);
  const out = planAt(roster, seed, hour, weekday).kinds.filter((k) => k.at === 'away').length;
  if (counted.size >= 48) counted.delete(counted.keys().next().value as string);
  counted.set(key, out);
  return out;
}

/** The people who pass the corner this hour and could see a sale. */
export const passingNow = (v: View): number => Math.floor((outNow(v) * tradeOf(v.content).corner.passing) / 1000);
