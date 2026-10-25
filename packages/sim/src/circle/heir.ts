/**
 * The people you knew when you die and someone carries on (M2.7 step 3, D107). A spouse, or a
 * partner who lived with you, can be the heir; past your family and them, a close friend. The heir
 * becomes you: their own tie goes, and their place in the city is yours, so you don't meet
 * yourself (`self`). The rest you knew are known to the heir too, as people: what was between you
 * and them ends, and what they thought of you moves toward neutral, since it was you they knew.
 */
import type { FactView, ModuleContext } from '@eb/core';
import type { Candidate } from '../lives/heir.ts';
import { estateOf } from '../lives/records.ts';
import { mix } from '../people/roster.ts';
import { drawnFor } from '../people/who.ts';
import type { Pronouns } from '../ties/records.ts';
import { occupant } from './meet.ts';
import { populationOf } from './records.ts';
import { type CircleSlice, partnered, type Tie } from './state.ts';

type View = FactView<CircleSlice>;

/** A tier-1 person as an heir: who holds their place today, and the day they were born. */
function asHeir(v: View, person: number): Candidate {
  const o = occupant(v.content, v.fact('people.seed') as number, person, v.fact('time.day') as number);
  return {
    person,
    child: -1,
    first: o.who.first,
    last: o.who.last,
    pronouns: o.who.pronouns,
    carries: o.who.carries,
    born: o.since - o.who.age * 365,
    other: -1,
  };
}

/** A spouse first, then a partner who lived with you. */
const partnerOf = (ties: readonly Tie[]): Tie | undefined =>
  ties.find((t) => t.status === 'married') ?? ties.find((t) => t.living && partnered(t));

/** The circle's heirs: a spouse or live-in partner, and the closest friend past the record's bar. */
export function circleHeirs(v: View): { partner: Candidate | null; friend: Candidate | null } {
  const ties = v.state.ties;
  const partner = partnerOf(ties);
  const bar = estateOf(v.content)?.friend ?? 101;
  const friends = ties
    .filter((t) => t !== partner && t.status === 'known' && t.regard >= bar)
    .sort((a, b) => b.regard - a.regard || b.together - a.together);
  const friend = friends[0];
  return {
    partner: partner ? asHeir(v, partner.person) : null,
    friend: friend ? asHeir(v, friend.person) : null,
  };
}

/** A tie as the heir finds it: someone known, what was between you over. */
const asKnown = (t: Tie, pull: number): Tie => ({
  ...t,
  regard: t.regard + Math.trunc(((50 - t.regard) * pull) / 100),
  status: 'known',
  asked: -1,
  date: null,
  since: -1,
  living: false,
  dated: -1,
  nights: 0,
  proposed: -1,
  licence: null,
  hearing: -1,
  night: -1,
});

export interface Succession {
  readonly kind: string;
  readonly person: number;
  readonly pronouns: Pronouns;
  readonly carries: boolean;
  readonly born: number;
  readonly gen: number;
}

/** The circle as the heir finds it. */
export function succeeded(ctx: ModuleContext<CircleSlice>, h: Succession): void {
  const pull = estateOf(ctx.content)?.pull ?? 0;
  const seed = ctx.fact('people.seed') as number;
  const day = ctx.fact('time.day') as number;
  const age = Math.floor((day - h.born) / 365);
  const s = ctx.read();
  const w = ctx.write();
  // A newcomer knows nobody yet; an heir knows those you knew.
  w.ties = h.kind === 'newcomer' ? [] : s.ties.filter((t) => t.person !== h.person).map((t) => asKnown(t as Tie, pull));
  w.self = h.person;
  w.out = -1;
  w.carries = h.carries;
  w.drawnTo = drawnFor(populationOf(ctx.content), age, h.pronouns, mix(seed, 67, h.gen), mix(seed, 68, h.gen));
}
