/**
 * `node tools/edition/check.ts`: the check that nothing full-only can show in the free year (M2.11,
 * D138). A record is full-only when its id ends in `-full` (D17's `*.full`, as ids hold no dots). It must be of a type
 * whose draws read a `when` condition, and its `when` must ask for `edition.unlocked`, so the free
 * year never draws it. Part of `pnpm lint`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const RECORDS = join(ROOT, 'packages/content/records');

/** Types whose records are drawn only while their `when` holds: shift events (D40) and life events (D135). */
export const GATED = new Set(['shift-event', 'life-event']);

export interface Problem {
  readonly file: string;
  readonly why: string;
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('-full.json') ? [p] : [];
  });
}

/** What is wrong with each full-only record under `records`. */
export function problems(records = RECORDS): Problem[] {
  const out: Problem[] = [];
  for (const path of files(records)) {
    const file = relative(ROOT, path);
    const type = relative(records, path).split(/[\\/]/)[0] ?? '';
    const when = (JSON.parse(readFileSync(path, 'utf8')) as { when?: unknown }).when;
    if (!GATED.has(type)) out.push({ file, why: `a ${type} record can't be gated: its draws read no condition` });
    else if (
      typeof when !== 'string' ||
      !/\bedition\.unlocked\b/.test(when) ||
      /\bnot\s+edition\.unlocked\b/.test(when)
    )
      out.push({ file, why: 'its "when" must ask for edition.unlocked' });
  }
  return out;
}

if (import.meta.main) {
  const found = problems();
  for (const p of found) console.log(`full-only ${p.file}\n          ${p.why}`);
  console.log(`edition: ${found.length} problems`);
  if (found.length > 0) process.exit(1);
}
