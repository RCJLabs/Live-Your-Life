/** The population record (packages/content/types/population.json, M2.6): one, the city's. */
import type { RecordStore } from '@eb/core';

export const POPULATION = 'ridgefield';

export interface Band {
  readonly from: number;
  readonly to: number;
}

export interface PopulationRecord {
  readonly name: string;
  readonly names: string;
  readonly ages: readonly (Band & { readonly share: number })[];
  readonly drawn: readonly (Band & { readonly same: number; readonly both: number })[];
  readonly chemistry: { readonly free: number; readonly per: number };
  /** Per thousand who use each set of pronouns, whose bodies can carry a pregnancy (D96). */
  readonly carry: { readonly she: number; readonly he: number; readonly they: number };
  readonly ties: {
    readonly kept: number;
    readonly perHour: number;
    readonly half: number;
    readonly atWork: number;
    readonly haunts: number;
  };
}

const fail = (problem: string): never => {
  throw new Error(`population "${POPULATION}": ${problem}`);
};

/** Bands that run from 18 up without a gap or an overlap. */
function checkBands(what: string, bands: readonly Band[]): void {
  let next = 18;
  for (const b of bands) {
    if (b.from !== next || b.to < b.from) fail(`${what} band ${b.from}–${b.to} should start at ${next}`);
    next = b.to + 1;
  }
}

const checked = new WeakMap<object, PopulationRecord>();

/** The record, checked once: the age shares make a thousand, and nobody is drawn as under 18 (D89). */
export function populationOf(store: RecordStore): PopulationRecord {
  const p = store.get<PopulationRecord>('population', POPULATION) ?? fail('no such record');
  if (checked.has(p)) return p;
  checkBands('age', p.ages);
  checkBands('drawn', p.drawn);
  const total = p.ages.reduce((s, a) => s + a.share, 0);
  if (total !== 1000) fail(`age shares make ${total}, not 1000`);
  const oldest = (p.ages[p.ages.length - 1] as Band).to;
  if ((p.drawn[p.drawn.length - 1] as Band).to < oldest) fail(`drawn bands stop before ${oldest}`);
  for (const d of p.drawn) if (d.same + d.both > 1000) fail(`drawn ${d.from}–${d.to} is over a thousand`);
  checked.set(p, p);
  return p;
}

export const COURTSHIP = 'ridgefield';

/** A chance worked out from the three things a person goes by (packages/content/types/courtship.json). */
export interface Odds {
  readonly base: number;
  readonly attraction: number;
  readonly regard: number;
  readonly familiarity: number;
  readonly low: number;
  readonly high: number;
}

export interface CourtshipRecord {
  readonly name: string;
  readonly talk: { readonly minutes: number; readonly odds: Odds; readonly good: number; readonly bad: number };
  readonly ask: {
    readonly familiarity: number;
    readonly odds: Odds;
    readonly yes: number;
    readonly no: number;
    readonly again: number;
  };
  readonly date: {
    readonly hour: number;
    readonly window: number;
    readonly minutes: number;
    readonly cost: number;
    readonly odds: Odds;
    readonly good: number;
    readonly bad: number;
    readonly missed: number;
    readonly company: number;
  };
  readonly drift: { readonly days: number; readonly per: number };
  readonly leave: { readonly regard: number; readonly chance: number };
  readonly found: { readonly base: number; readonly shared: number; readonly most: number; readonly regard: number };
  readonly split: { readonly regard: number };
  readonly night: { readonly after: number; readonly living: number; readonly odds: Odds; readonly regard: number };
  readonly moveIn: Step;
  readonly propose: Step;
  readonly licence: {
    readonly fee: number;
    readonly wait: number;
    readonly valid: number;
    readonly opens: number;
    readonly closes: number;
  };
  readonly wedding: { readonly fee: number; readonly minutes: number };
  readonly divorce: { readonly fee: number; readonly wait: number };
  readonly share: { readonly rent: number };
}

/** A step a couple takes when one asks and the other says yes: after days dating, more likely each month. */
export interface Step {
  readonly after: number;
  readonly month: number;
  readonly odds: Odds;
  readonly no: number;
  readonly again: number;
}

export function courtshipOf(store: RecordStore): CourtshipRecord {
  const c = store.get<CourtshipRecord>('courtship', COURTSHIP);
  if (!c) throw new Error(`courtship "${COURTSHIP}": no such record`);
  return c;
}

/**
 * A chance in percent: the base, points for each 10 of attraction and familiarity, and for each 10
 * of regard above or below 50, kept between the record's low and high. Nobody drawn to you at all
 * says yes to nothing that needs them to be.
 */
export function oddsOf(o: Odds, attraction: number, regard: number, familiarity: number): number {
  const raw =
    o.base +
    Math.floor((attraction * o.attraction) / 10) +
    Math.trunc(((regard - 50) * o.regard) / 10) +
    Math.floor((familiarity * o.familiarity) / 10);
  return Math.max(o.low, Math.min(o.high, raw));
}
