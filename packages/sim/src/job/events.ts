/**
 * Shift events (D40): drawn by tag from the pool careers share, weighted, without repeats until
 * every event the career can draw now has come up (Rule or Drool's deck). An event stops the
 * routine: the job pushes the `shift-event` mode, and only a choice is allowed until one is made.
 *
 * A choice's odds come from `oddsOf`, the one function the preview and the roll both use, so
 * what the player is shown is what is rolled. The roll itself is the engine's `roll`.
 */
import type { Action, DeepReadonly, OptionsView, PreviewContext, Rng } from '@eb/core';
import { type Choice, eventsFor, type Odds, type Outcome, shiftEventOf } from './records.ts';
import { careerFor, type JobContext, type JobSlice, moveStanding, shiftNow, skillOf } from './state.ts';

/** No choice with odds is ever certain either way (tune). */
export const LEAST = 5;
export const MOST = 95;

/**
 * The chance in percent: the base, plus skill's share of its points, less tiredness's share of
 * its, and for a choice that leans on someone, their regard's share: all of it at 100, none at
 * 50, all of it taken away at 0 (D43).
 */
export function oddsOf(odds: Odds, skill: number, rest: number, regard = 50): number {
  const leaning = odds.regard === undefined ? 0 : Math.floor((odds.regard * (regard - 50)) / 50);
  const chance =
    odds.base + Math.floor((odds.skill * skill) / 100) - Math.floor((odds.tired * (100 - rest)) / 100) + leaning;
  return Math.min(MOST, Math.max(LEAST, chance));
}

type Reader = Pick<JobContext, 'content' | 'fact'> & { read(): DeepReadonly<JobSlice> };

/** The odds of a choice for whoever is choosing now. */
function chanceNow(reader: Reader, odds: Odds): number {
  const slice = reader.read();
  const skill = skillOf(slice.practice, careerFor(reader.content, slice).skill.half);
  const regard = odds.regard === undefined ? 50 : (reader.fact('ties.regard') as number);
  return oddsOf(odds, skill, reader.fact('life.need', { need: 'rest' }) as number, regard);
}

/**
 * One draw from the deck: of the events that can come up now, those not drawn since the deck
 * was last shuffled, by weight. When none is left, the deck is shuffled: everything drawable is
 * back. Returns the event and the drawn list after it, or null when nothing can come up.
 */
export function drawFrom(
  pool: readonly (readonly [string, number])[],
  drawn: readonly string[],
  rng: Rng,
): { id: string; drawn: string[] } | null {
  let deck = pool.filter(([id]) => !drawn.includes(id));
  let before = drawn;
  if (deck.length === 0) {
    deck = [...pool];
    before = [];
  }
  if (deck.length === 0) return null;
  const [id] = deck[rng.weightedIndex(deck.map(([, weight]) => weight))] as readonly [string, number];
  return { id, drawn: [...before, id] };
}

/** The event a shift's timer comes due for, if you are at work on it: drawn from the deck. */
export function shiftEvent(ctx: JobContext, day: number): void {
  const now = shiftNow(ctx);
  if (!now || now.s.day !== day || ctx.fact('life.activity') !== 'work') return;
  const career = careerFor(ctx.content, ctx.read());
  const pool = eventsFor(ctx.content, career)
    .filter(([, e]) => e.when === undefined || ctx.check(e.when) === true)
    .map(([id, e]) => [id, e.weight] as const);
  const next = drawFrom(pool, ctx.read().drawn, ctx.rng('events'));
  if (!next) return;
  ctx.write().drawn = next.drawn;
  ctx.modes.push('shift-event', { event: next.id, day });
  ctx.emit('event', { event: next.id, day });
}

interface Picked {
  readonly event: string;
  readonly day: number;
  readonly choice: Choice;
}

function picked(reader: Pick<JobContext, 'content'>, effect: Readonly<Record<string, unknown>>): Picked {
  const event = shiftEventOf(reader.content, effect.event as string);
  const choice = event.choices.find((c) => c.id === effect.choice);
  if (!choice) throw new Error(`shift event "${String(effect.event)}" has no choice "${String(effect.choice)}"`);
  return { event: effect.event as string, day: effect.day as number, choice };
}

/** What an outcome would do, without the words: for a preview. */
const stakes = (o: Outcome) => ({
  standing: o.standing ?? 0,
  practice: o.practice ?? 0,
  home: o.home ?? false,
  needs: o.needs ?? {},
  // What the coworker would remember of it, if they are there to see (D42).
  act: o.act ?? null,
});

/** `shift-choice`: the choice made, rolled if it has odds. Its preview is what the player is shown. */
export const shiftChoice = {
  run(ctx: JobContext, effect: Readonly<Record<string, unknown>>) {
    const { event, day, choice } = picked(ctx, effect);
    const follow = (failed: boolean) => ({ effect: 'shift-outcome', event, day, choice: choice.id, failed });
    if (!choice.odds) return ctx.apply(follow(false));
    const chance = chanceNow(ctx, choice.odds);
    ctx.apply({
      effect: 'roll',
      outcomes: [
        { chance, effects: [follow(false)] },
        { chance: 100 - chance, effects: [follow(true)] },
      ],
    });
  },
  preview(ctx: PreviewContext<JobSlice>, effect: Readonly<Record<string, unknown>>) {
    const { choice } = picked(ctx, effect);
    if (!choice.odds) return { chance: 100, outcome: stakes(choice.outcome) };
    return {
      chance: chanceNow(ctx, choice.odds),
      outcome: stakes(choice.outcome),
      failure: stakes(choice.failure as Outcome),
    };
  },
};

/** `shift-outcome`: what follows a choice. */
export function shiftOutcome(ctx: JobContext, effect: Readonly<Record<string, unknown>>): void {
  const { event, day, choice } = picked(ctx, effect);
  const failed = effect.failed === true;
  const o = (failed ? choice.failure : choice.outcome) as Outcome;
  // Remembered first, while the shift is still theirs and yours: an outcome can send you home.
  if (o.act) ctx.apply({ effect: 'shift-act', act: o.act, day });
  if (o.practice) ctx.write().practice += o.practice;
  if (o.needs) ctx.apply({ effect: 'adjust-needs', needs: o.needs });
  if (o.home) {
    const s = ctx.write().signed.find((x) => x.day === day);
    if (s) s.home = true;
  }
  ctx.emit('outcome', { event, choice: choice.id, failed });
  if (o.standing) moveStanding(ctx, o.standing, `event:${event}`);
}

/** `job/choose`: only in the `shift-event` mode, one of the event's choices. */
export const choose = {
  run(ctx: JobContext, action: Action) {
    const data = ctx.modes.current.data as { event: string; day: number };
    const event = shiftEventOf(ctx.content, data.event);
    if (!event.choices.some((c) => c.id === action.choice)) return ctx.refuse('bad-choice');
    ctx.apply({ effect: 'shift-choice', event: data.event, day: data.day, choice: action.choice });
    ctx.modes.pop();
    ctx.emit('chose', { event: data.event, choice: action.choice as string });
  },
  options: (view: OptionsView<JobSlice>) => {
    const data = view.mode.data as { event?: string } | undefined;
    if (!data?.event) return [];
    return shiftEventOf(view.content, data.event).choices.map((c) => ({ choice: c.id }));
  },
};
