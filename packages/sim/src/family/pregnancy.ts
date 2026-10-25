/**
 * A pregnancy (M2.6 step 4, D96, D97): begun on a night between one body that can carry and one
 * that can't, at the record's chance for the protection used and the carrier's age; known at its
 * week, when a miscarriage is rolled at the record's rate; the carrier's to continue or end at a
 * clinic, theirs if it's a partner's; and a birth at term.
 */
import type { Effect, ModuleContext, PreviewContext } from '@eb/core';
import { populationOf } from '../circle/records.ts';
import { mix } from '../people/roster.ts';
import { carriesFor } from '../people/who.ts';
import { namePoolOf } from '../ties/records.ts';
import { nightChance, pregnancyOf } from './records.ts';
import { type FamilySlice, type FamilyView, familyOf, type Pregnancy, YOU } from './state.ts';

type Ctx = ModuleContext<FamilySlice>;
type View = FamilyView;

const day = (v: View) => v.fact('time.day') as number;
const name = (v: View, person: number) => v.fact('circle.name', { person }) as string;
const ageOf = (v: View, who: number) =>
  (who === YOU ? v.fact('circle.your-age') : v.fact('circle.age', { person: who })) as number;
const carries = (v: View, who: number) =>
  (who === YOU ? v.fact('circle.carries') : v.fact('circle.they-carry', { person: who })) === true;

/** Who would carry between you and a person: one of you exactly, or nobody. */
export function carrierWith(v: View, person: number): number | null {
  const you = carries(v, YOU);
  const them = carries(v, person);
  if (you === them) return null;
  return you ? YOU : person;
}

/** A night's chance in ten thousand of a pregnancy with a person, and with or without protection. */
export function chanceWith(v: View, person: number, protect: boolean): number {
  if (familyOf(v).pregnancy) return 0;
  const carrier = carrierWith(v, person);
  if (carrier === null) return 0;
  return nightChance(pregnancyOf(v.content), protect, ageOf(v, carrier));
}

/**
 * `conceive-roll`: a chance in ten thousand rolled as two percent rolls, one of ten in a hundred
 * then the rest, so a chance under one in a hundred can still be rolled as the odds shown.
 */
export const conceiveRoll = {
  run(ctx: Ctx, effect: Effect) {
    const person = effect.person as number;
    const chance = chanceWith(ctx, person, effect.protect === true);
    if (chance === 0) return;
    const yes = [{ effect: 'conceived', person }];
    if (chance % 100 === 0) {
      ctx.apply({ effect: 'roll', outcomes: outcomes(chance / 100, yes) });
      return;
    }
    ctx.apply({ effect: 'roll', outcomes: outcomes(10, [{ effect: 'roll', outcomes: outcomes(chance / 10, yes) }]) });
  },
  preview: (ctx: PreviewContext<FamilySlice>, effect: Effect) => ({
    chance: chanceWith(ctx, effect.person as number, effect.protect === true),
  }),
};

const outcomes = (chance: number, yes: Effect[]) => [
  ...(chance > 0 ? [{ chance, effects: yes }] : []),
  ...(chance < 100 ? [{ chance: 100 - chance, effects: [] }] : []),
];

export function conceived(ctx: Ctx, effect: Effect): void {
  const person = effect.person as number;
  const carrier = carrierWith(ctx, person);
  if (carrier === null || ctx.read().pregnancy) return;
  const p = pregnancyOf(ctx.content);
  const today = day(ctx);
  const spread = mix(ctx.fact('people.seed') as number, 81, today, person) % (p.term.spread + 1);
  ctx.write().pregnancy = {
    carrier,
    other: carrier === YOU ? person : YOU,
    conceived: today,
    known: false,
    choice: 'open',
    loss: -1,
    due: today + p.term.week * 7 + spread,
  };
  // Nobody knows yet: the chronicle is told when it is known.
  ctx.emit('conceived', {});
}

/** The partner's number in a pregnancy, whichever of you carries. */
export const partnerIn = (p: Pick<Pregnancy, 'carrier' | 'other'>): number => (p.carrier === YOU ? p.other : p.carrier);

/** The week it's known: told; a loss rolled, mostly in the first trimester; a partner's choice made. */
export function known(ctx: Ctx): void {
  const p = pregnancyOf(ctx.content);
  const w = ctx.write().pregnancy as Pregnancy;
  w.known = true;
  const who = partnerIn(w);
  ctx.emit('pregnant', { carrier: w.carrier === YOU ? 'you' : 'them', name: name(ctx, who) });
  const rng = ctx.rng('family');
  if (rng.int(0, 999) < p.loss.chance) {
    const early = rng.int(0, 99) < p.loss.early;
    w.loss = w.conceived + (early ? rng.int(p.known * 7 + 1, 13 * 7) : rng.int(13 * 7 + 1, 20 * 7));
  }
  if (w.carrier !== YOU) {
    const goOn = rng.int(0, 99) < p.partner;
    ctx.emit('their-choice', { name: name(ctx, who), continue: goOn });
    if (goOn) w.choice = 'continue';
    else ctx.write().pregnancy = null;
  }
}

/** Born: the child drawn from the name pool, living with you if you carried or live with the other parent. */
export function born(ctx: Ctx): void {
  const preg = ctx.read().pregnancy as Pregnancy;
  const p = pregnancyOf(ctx.content);
  const pop = populationOf(ctx.content);
  const pool = namePoolOf(ctx.content, pop.names);
  const seed = mix(ctx.fact('people.seed') as number, 82, day(ctx));
  const first = pool.first[seed % pool.first.length] as (typeof pool.first)[number];
  const other = partnerIn(preg);
  const living = ctx.fact('circle.living') === other;
  const w = ctx.write();
  w.pregnancy = null;
  w.children.push({
    born: day(ctx),
    first: first.name,
    last: ctx.fact('you.last') as string,
    pronouns: first.pronouns,
    carries: carriesFor(pop, first.pronouns, mix(seed, 83)),
    other,
    with: preg.carrier === YOU || living ? 'you' : 'them',
    parted: living ? -1 : day(ctx),
  });
  if (preg.carrier === YOU) {
    const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: p.birth } }));
    if (!paid.ok) ctx.write().owed += p.birth;
  }
  ctx.emit('born', { name: first.name, other: name(ctx, other), carrier: preg.carrier === YOU ? 'you' : 'them' });
}
