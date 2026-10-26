import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { problems } from '../check.ts';

/** A records folder holding one full-only record of `type`. */
function withRecord(type: string, record: object): string {
  const dir = mkdtempSync(join(tmpdir(), 'edition-'));
  mkdirSync(join(dir, type));
  writeFileSync(join(dir, type, 'planted-full.json'), JSON.stringify(record));
  return dir;
}

describe('the full-only check (M2.11, D138)', () => {
  it('passes the content as it is', () => {
    expect(problems()).toEqual([]);
  });

  it('fails a full-only life event the free year could draw', () => {
    expect(problems(withRecord('life-event', { name: 'x' }))).toHaveLength(1);
    expect(problems(withRecord('life-event', { when: 'job.employed' }))).toHaveLength(1);
    expect(problems(withRecord('life-event', { when: 'not edition.unlocked' }))).toHaveLength(1);
    expect(problems(withRecord('life-event', { when: 'edition.unlocked and job.employed' }))).toEqual([]);
  });

  it('fails a full-only record of a type whose draws read no condition', () => {
    expect(problems(withRecord('career', { when: 'edition.unlocked' }))[0]?.why).toMatch(/can't be gated/);
  });
});
