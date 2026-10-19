/**
 * Ties between tier-1 people: up to `TIES.cap` a person, each [other person, familiarity], grown
 * by the meetings at shared places (gather.ts). A person's list changes only by their own
 * meetings, in the order they happened, so it can be worked out without touching anyone else's.
 */
import { TIES } from './templates.ts';

/** Numbers a person's list takes in a slice. */
export const TIE_ROW = 2 * TIES.cap;

/** Adds familiarity to the tie in `row` with person j: a new tie in a free place, or over a passing one. */
export function meet(ties: number[], row: number, j: number, by: number): void {
  const base = row * TIE_ROW;
  let free = -1;
  let weakest = -1;
  for (let k = 0; k < TIES.cap; k++) {
    const other = ties[base + 2 * k] as number;
    if (other === j) {
      ties[base + 2 * k + 1] = (ties[base + 2 * k + 1] as number) + by;
      return;
    }
    if (other < 0) {
      if (free < 0) free = k;
    } else if (weakest < 0 || (ties[base + 2 * k + 1] as number) < (ties[base + 2 * weakest + 1] as number)) {
      weakest = k;
    }
  }
  // A full list keeps its ties, unless the weakest is someone met only once.
  const at = free >= 0 ? free : (ties[base + 2 * weakest + 1] as number) <= 1 ? weakest : -1;
  if (at < 0) return;
  ties[base + 2 * at] = j;
  ties[base + 2 * at + 1] = by;
}
