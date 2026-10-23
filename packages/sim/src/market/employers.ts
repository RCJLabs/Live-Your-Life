/**
 * Who employs in Ridgefield (M2.3, D74). Each workplace of the tier-1 people works one career of
 * the catalogue, and its people are that career's staff there; the city's other employers are
 * tier-2, statistics like the passers-by, a few to a career in the districts its record names.
 * A career worked on your block (the diner) is an employer too. All of it is worked out from the
 * seed and the records, never stored; a job keeps its employer's id and its career's.
 */
import type { RecordStore } from '@eb/core';
import { type CareerRecord, careerOf } from '../job/records.ts';
import { mix, type Roster } from '../people/roster.ts';

export interface Employer {
  /** Stable while the content is: `w<place>` for a tier-1 workplace, `<career>-<k>` for the rest. */
  readonly id: string;
  readonly career: string;
  readonly district: string;
  readonly staff: number;
  /** Separations a month per thousand staff, the career's. */
  readonly turnover: number;
  /** The roster's place for a tier-1 workplace; -1 otherwise. */
  readonly place: number;
  /** On your block: the career's building there (the diner). */
  readonly home: boolean;
}

/** Tier-2 employers of each career, beside the tier-1 workplaces (tune). */
export const SITES = 4;

/** The id of your block's employer of a career worked there. */
export const homeEmployer = (career: string): string => `${career}-home`;

/** A string as a number for `mix`: FNV-1a, so an id hashes the same on every device. */
export function hashOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function employer(id: string, c: string, r: CareerRecord, district: string, place: number, home: boolean): Employer {
  return { id, career: c, district, staff: r.employers.staff, turnover: r.employers.turnover, place, home };
}

const kept = new Map<string, readonly Employer[]>();
const KEPT = 4;

/**
 * The city's employers for a seed and roster: the tier-1 workplaces first, each given a career by
 * the seed and placed in one of its districts (placed.ts reads `district`), then each career's
 * tier-2 sites and, for one worked on your block, the home employer. `homeDistrict` is your block's.
 */
export function employersOf(
  store: RecordStore,
  seed: number,
  roster: Roster,
  homeDistrict: string,
): readonly Employer[] {
  const careers = [...store.ids('career')].sort();
  const key = `${seed}:${roster.people.length}:${homeDistrict}:${careers.join(',')}`;
  const found = kept.get(key);
  if (found) return found;
  const records = new Map(careers.map((c) => [c, careerOf(store, c)]));
  const out: Employer[] = [];
  // Content with no careers (a test's) has nobody hiring.
  if (careers.length === 0) return out;
  for (let p = roster.firstShared; p < roster.firstThird; p++) {
    const c = careers[mix(seed, 40, p) % careers.length] as string;
    const r = records.get(c) as CareerRecord;
    const ds = r.employers.districts;
    out.push(employer(`w${p}`, c, r, ds[mix(seed, 41, p) % ds.length] as string, p, false));
  }
  for (const c of careers) {
    const r = records.get(c) as CareerRecord;
    const ds = r.employers.districts;
    if (r.place) out.push(employer(homeEmployer(c), c, r, homeDistrict, -1, true));
    for (let k = 0; k < SITES; k++) out.push(employer(`${c}-${k}`, c, r, ds[k % ds.length] as string, -1, false));
  }
  if (kept.size >= KEPT) kept.delete(kept.keys().next().value as string);
  kept.set(key, out);
  return out;
}
