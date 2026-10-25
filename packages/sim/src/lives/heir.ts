/**
 * Who carries on when you die, and what they are left (M2.7 step 3, D20, D107, D109). The order
 * is D20's: a child of 18 or over, the eldest first; a spouse or a partner who lived with you;
 * a child under 18, as a ward (D108); a close friend. The family and the circle say who they
 * have (`family.heirs`, `circle.heirs`); this puts them in order. The estate is what you leave
 * less your debts and, above Michigan's small-estate limit, probate's share. Debts past it die
 * with it: the heir owes none of them.
 */
import type { RecordStore } from '@eb/core';
import { ADULT } from '../people/who.ts';
import type { Pronouns } from '../ties/records.ts';
import { estateOf } from './records.ts';

export type HeirKind = 'child' | 'partner' | 'ward' | 'friend' | 'newcomer';

/** Someone who could carry on: a child of yours, by their place in your family, or a tier-1 person. */
export interface Candidate {
  /** Their number in the roster, or -1 for a child of yours. */
  readonly person: number;
  /** Their place among your children, or -1. */
  readonly child: number;
  readonly first: string;
  readonly last: string;
  readonly pronouns: Pronouns;
  readonly carries: boolean;
  /** The day they were born, counted from the life's first day: before it for anyone older. */
  readonly born: number;
  /** A child's other parent, who raises a ward (D108): their number, or below 0 for none. */
  readonly other: number;
}

export interface Heir extends Candidate {
  readonly kind: HeirKind;
}

type View = { readonly content: RecordStore; fact(id: string, args?: Readonly<Record<string, unknown>>): unknown };

const ageOf = (c: Candidate, day: number) => Math.floor((day - c.born) / 365);

/** The heir by D20's order, or null if nobody qualifies. */
export function heirOf(v: View): Heir | null {
  const day = v.fact('time.day') as number;
  const children = (v.fact('family.heirs') as readonly Candidate[] | undefined) ?? [];
  const circle = v.fact('circle.heirs') as { partner: Candidate | null; friend: Candidate | null } | undefined;
  const eldest = [...children].sort((a, b) => a.born - b.born);
  const adult = eldest.find((c) => ageOf(c, day) >= ADULT);
  if (adult) return { ...adult, kind: 'child' };
  if (circle?.partner) return { ...circle.partner, kind: 'partner' };
  const minor = eldest[0];
  if (minor) return { ...minor, kind: 'ward' };
  if (circle?.friend) return { ...circle.friend, kind: 'friend' };
  return null;
}

export interface Estate {
  /** What you left in cash. */
  readonly cash: number;
  /** What you owed: rent, the court, care, the family's bills and support behind. */
  readonly debts: number;
  /** Probate's share, above the small-estate limit. */
  readonly probate: number;
  /** What the heir gets. */
  readonly left: number;
}

/** The estate as it would be settled now. A pack without the record settles debts alone. */
export function estateNow(v: View): Estate {
  const cash = Math.max(0, v.fact('economy.amount', { resource: 'cash' }) as number);
  const owed = ['home.owed', 'law.owed', 'health.owed', 'family.owed', 'family.behind'];
  const debts = owed.reduce((n, id) => n + Math.max(0, (v.fact(id) as number | undefined) ?? 0), 0);
  const net = Math.max(0, cash - debts);
  const r = estateOf(v.content);
  const probate = r && net > r.small ? Math.floor((net * r.probate) / 100) : 0;
  return { cash, debts, probate, left: net - probate };
}
