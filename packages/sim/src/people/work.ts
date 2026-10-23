/**
 * Who works where among the tier-1 people, as it changes (M2.3, D74, open question 68): when an
 * opening goes up at a tier-1 workplace, one of the people working there has left it, and is
 * between jobs; when one closes unfilled by you, someone between jobs takes it, if anyone is, and
 * works its career's shifts. Which person is drawn from the seed and the opening. Only the moves
 * are kept; everyone else is where the roster puts them (careers.ts).
 */
import { type Beat, defineModule, type ModuleContext } from '@eb/core';
import { type Employer, employersOf, hashOf } from '../market/employers.ts';
import { FILL, postedIn } from '../market/openings.ts';
import { LINKED, mix, rosterOf } from './roster.ts';

const HOME = 'inner-ring';
const DAY = 24 * 60;
/** Openings you took that are kept, so nobody else fills them: the latest few (tune). */
const TAKEN = 16;
const MOVE = { person: { type: 'int', min: 0 }, place: { type: 'int', min: 0 }, opening: { type: 'text' } } as const;

export interface WorkSlice {
  /** [person, place] pairs, place -1 for someone between jobs, in the order they moved. */
  moves: number[];
  /** Counts the moves, so a roster built from them is told from another's. */
  version: number;
  /** The last day of the life whose openings have been heard. */
  day: number;
  /** Openings you took (market/module.ts): nobody else fills them. */
  taken: string[];
}

type Ctx = ModuleContext<WorkSlice>;

/** Where person i works now: the latest move, or the roster's place. */
function placeOf(slice: WorkSlice, base: readonly { work: number }[], i: number): number {
  for (let k = slice.moves.length - 2; k >= 0; k -= 2) if (slice.moves[k] === i) return slice.moves[k + 1] as number;
  return base[i]?.work ?? -1;
}

function move(slice: WorkSlice, i: number, place: number): void {
  // Each person's latest move only: earlier ones are dropped, so the list stays as long as the people moved.
  for (let k = slice.moves.length - 2; k >= 0; k -= 2) if (slice.moves[k] === i) slice.moves.splice(k, 2);
  slice.moves.push(i, place);
  slice.version++;
}

/** A day's openings at the tier-1 workplaces: who left with each posted, who took each that closed. */
function hearDay(ctx: Ctx, day: number, workplaces: readonly Employer[], seed: number, n: number): void {
  const base = rosterOf(seed, n).people;
  const week = Math.floor(day / 7);
  const slice = ctx.write();
  for (const e of workplaces) {
    for (let w = week - Math.ceil(FILL.most / 7); w <= week; w++) {
      for (const o of postedIn(seed, e, w)) {
        const h = hashOf(o.id);
        if (o.posted === day) {
          const staff: number[] = [];
          for (let i = LINKED.count; i < n; i++) if (placeOf(slice, base, i) === e.place) staff.push(i);
          if (staff.length > 0) {
            const who = staff[mix(seed, 47, h) % staff.length] as number;
            move(slice, who, -1);
            ctx.emit('left', { person: who, place: e.place, opening: o.id });
          }
        }
        if (o.closes === day && !slice.taken.includes(o.id)) {
          const between: number[] = [];
          for (let k = 0; k < slice.moves.length; k += 2)
            if (slice.moves[k + 1] === -1) between.push(slice.moves[k] as number);
          if (between.length > 0) {
            const who = between[mix(seed, 48, h) % between.length] as number;
            move(slice, who, e.place);
            ctx.emit('joined', { person: who, place: e.place, opening: o.id });
          }
        }
      }
    }
  }
}

/** Time passing, a day at a time (people/module.ts): each new day's openings heard as it begins. */
function onPassed(ctx: Ctx, event: Beat): void {
  const to = Math.floor((event.to as number) / DAY);
  const from = ctx.read().day;
  if (to <= from) return;
  const seed = ctx.fact('people.seed') as number;
  const n = ctx.fact('people.count') as number;
  const workplaces = employersOf(ctx.content, seed, rosterOf(seed, n), HOME).filter((e) => e.place >= 0);
  for (let day = from + 1; day <= to; day++) hearDay(ctx, day, workplaces, seed, n);
  ctx.write().day = to;
}

export const workModule = defineModule<WorkSlice>({
  id: 'people-work',
  init: () => ({ moves: [], version: 0, day: 0, taken: [] }),
  facts: {
    version: { read: ({ state }) => state.version, domain: { type: 'int', min: 0 }, label: 'moves among the people' },
    between: {
      read: ({ state }) => state.moves.filter((v, k) => k % 2 === 1 && v === -1).length,
      domain: { type: 'int', min: 0 },
      label: 'people between jobs',
    },
    // The moves themselves, for the shares and the stage: a list, so no domain.
    moves: ({ state }) => state.moves,
  },
  events: {
    left: { args: MOVE, label: 'Someone left a job' },
    joined: { args: MOVE, label: 'Someone between jobs took one' },
  },
  on: {
    'people/passed': onPassed,
    'market/took': (ctx, event) => {
      const w = ctx.write();
      w.taken = [...w.taken, String(event.opening)].slice(-TAKEN);
    },
  },
});
