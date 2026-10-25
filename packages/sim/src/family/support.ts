/**
 * Custody and child support (M2.6 step 4c, D100). When parents part, a child who lived with you
 * stays with whichever of you gave more of their care; the other has Michigan's standard
 * parenting time. Support each month follows the shape of Michigan's formula (CALIBRATION.md):
 * a base share of the parents' combined net income, split by each one's share of it, then the
 * formula's offset for the nights each has the child.
 */
import type { ModuleContext } from '@eb/core';
import { rosterNow } from '../circle/meet.ts';
import { careerOf } from '../job/records.ts';
import { pregnancyOf } from './records.ts';
import type { Child, FamilySlice, FamilyView } from './state.ts';

type Ctx = ModuleContext<FamilySlice>;

/** Monthly net from an hourly wage, at the record's hours and the share kept after tax. */
export function monthlyNet(v: FamilyView, wage: number): number {
  const s = pregnancyOf(v.content).support;
  return Math.floor((wage * s.hours * 52 * s.keep) / (12 * 100));
}

/** A tier-1 person's hourly wage: their workplace career's, from their shift; 0 out of work. */
export function wageOf(v: FamilyView, person: number): number {
  const p = rosterNow(v as never)?.people[person];
  const career = p && p.work >= 0 ? p.shift?.id.split('/')[0] : undefined;
  return career && v.content.has('career', career) ? careerOf(v.content, career).wage : 0;
}

/** n to the power 2.5, from whole numbers: n² times the square root, found by Newton's method. */
export function pow25(n: number): number {
  if (n <= 0) return 0;
  const scaled = n * 10_000;
  let r = scaled;
  for (let k = 0; k < 40; k++) {
    const next = Math.floor((r + Math.floor(scaled / r)) / 2);
    if (next >= r) break;
    r = next;
  }
  return Math.floor((n * n * r) / 100);
}

/**
 * The month's support between you and another parent for `children` of theirs who live with one
 * of you: positive, they pay you; negative, you pay them (the formula's sign, you as parent A).
 */
export function supportFor(v: FamilyView, other: number, children: readonly Child[]): number {
  const s = pregnancyOf(v.content).support;
  if (children.length === 0) return 0;
  const a = monthlyNet(v, v.fact('job.wage') as number);
  const b = monthlyNet(v, wageOf(v, other));
  const combined = a + b;
  if (combined === 0) return 0;
  const share = s.base[Math.min(children.length, s.base.length) - 1] ?? 0;
  const base = Math.floor((combined * share) / 100);
  const aBase = Math.floor((base * a) / combined);
  const bBase = base - aBase;
  // Nights with you: every child of theirs lives with the same parent, as custody is decided once.
  const withYou = children[0]?.with === 'you';
  const aN = pow25(withYou ? s.nights.custodial : s.nights.parenting);
  const bN = pow25(withYou ? s.nights.parenting : s.nights.custodial);
  const offset = Math.trunc((aN * bBase - bN * aBase) / (aN + bN));
  // Only the parent with fewer nights pays here; the formula can turn the other way at the edges,
  // which waits for its low-income rules (CALIBRATION.md, a departure).
  return withYou ? Math.max(0, offset) : Math.min(0, offset);
}

/** A parting: each child of theirs who lived with you stays with whoever cared more (D100). */
export function parted(ctx: Ctx, other: number): void {
  const s = ctx.read();
  const today = ctx.fact('time.day') as number;
  const name = ctx.fact('circle.name', { person: other }) as string;
  ctx.write().children = s.children.map((c) => {
    if (c.other !== other || c.parted >= 0) return c;
    const keep = c.with === 'you' && s.given.you >= s.given.them ? 'you' : 'them';
    ctx.emit('custody', { child: c.first, other: name, with: keep });
    return { ...c, with: keep, parted: today };
  });
}

/** The month's support, on the 1st with the rent: paid by you, or to you if they work. */
export function monthOfSupport(ctx: Ctx): void {
  const others = [
    ...new Set(
      ctx
        .read()
        .children.filter((c) => c.parted >= 0)
        .map((c) => c.other),
    ),
  ];
  for (const other of others) {
    const kids = ctx.read().children.filter((c) => c.parted >= 0 && c.other === other);
    const cents = supportFor(ctx, other, kids);
    const name = ctx.fact('circle.name', { person: other }) as string;
    if (cents < 0) {
      const paid = ctx.attempt(() => ctx.apply({ effect: 'pay-cost', cost: { cash: -cents } }));
      if (!paid.ok) ctx.write().arrears = { ...ctx.read().arrears, owe: ctx.read().arrears.owe - cents };
      ctx.emit('support', { name, cents: -cents, by: 'you', paid: paid.ok });
    } else if (cents > 0) {
      ctx.apply({ effect: 'add-resource', resource: 'cash', by: cents });
      ctx.emit('support', { name, cents, by: 'them', paid: true });
    }
  }
}
