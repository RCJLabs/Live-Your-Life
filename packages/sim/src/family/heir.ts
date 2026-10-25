/**
 * The family when you die and someone carries on (M2.7 step 3, D107). Your children can be the
 * heir (lives/heir.ts). A child who carries on leaves their brothers and sisters to the rest of
 * the family, outside the save for now (open question 93). A partner who carries on keeps the
 * children you had together, whose other parent is now you who died; a child of yours by someone
 * else goes to that parent. Debts the estate settled, and what was owed to you, end with you.
 */
import type { DeepReadonly, ModuleContext } from '@eb/core';
import type { Candidate } from '../lives/heir.ts';
import { type FamilySlice, noFamily, OTHER_DIED, YOU } from './state.ts';

type Ctx = ModuleContext<FamilySlice>;

/** Your children, as heirs: by their place among them. */
export const childHeirs = (s: DeepReadonly<FamilySlice>): Candidate[] =>
  s.children.map((c, i) => ({
    person: -1,
    child: i,
    first: c.first,
    last: c.last,
    pronouns: c.pronouns,
    carries: c.carries,
    born: c.born,
  }));

/** The family as the heir finds it. */
export function succeeded(ctx: Ctx, kind: string, person: number): void {
  const s = ctx.read();
  const fresh = { ...noFamily(), settled: s.settled };
  if (kind !== 'partner') {
    Object.assign(ctx.write(), fresh);
    return;
  }
  const children = s.children
    .filter((c) => c.other === person)
    .map((c) => ({ ...c, other: OTHER_DIED, with: c.with === 'care' ? ('care' as const) : ('you' as const) }));
  // A pregnancy the partner carries by you goes on, with you who died as the other parent.
  const p = s.pregnancy;
  const pregnancy = p && p.carrier === person && p.other === YOU ? { ...p, carrier: YOU, other: OTHER_DIED } : null;
  Object.assign(ctx.write(), { ...fresh, children, pregnancy });
}
