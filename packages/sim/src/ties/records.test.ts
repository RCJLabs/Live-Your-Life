import type { RecordStore } from '@eb/core';
import { describe, expect, it } from 'vitest';
import { lineCook, sliceSim } from '../../test/slice.ts';
import { actOf, type Crew, crewOf, favourOf, namePoolOf } from './records.ts';

const store = sliceSim().content as RecordStore;
const crew = lineCook().crew as Crew;
const check = (changes: Partial<Crew>) => () => crewOf(store, 'line-cook', { ...crew, ...changes });

describe("the slice's ties content", () => {
  it('has the line cook’s crew whole: its pool, favour and every act', () => {
    expect(check({})()).toEqual(crew);
    expect(namePoolOf(store, crew.names).first.length).toBeGreaterThanOrEqual(10);
    expect(favourOf(store, crew.favour).asks).toContain('{name}');
    for (const act of Object.values(crew.acts)) expect(actOf(store, act).says.length).toBeGreaterThan(0);
  });

  it('draws first names with each set of pronouns', () => {
    const sets = new Set(namePoolOf(store, crew.names).first.map((f) => f.pronouns));
    expect([...sets].sort()).toEqual(['he', 'she', 'they']);
  });

  it('throws for a crew that names what is not there, or is older at its youngest', () => {
    expect(check({ ages: { min: 40, max: 30 } })).toThrow('older at its youngest');
    expect(check({ names: 'nowhere' })).toThrow('name pool "nowhere": no such record');
    expect(check({ favour: 'nothing' })).toThrow('favour "nothing": no such record');
    expect(check({ acts: { ...crew.acts, late: 'shrugged' } })).toThrow('act "shrugged": no such record');
  });
});
