import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRecordStore, type RecordPack } from '@eb/core';
import { PACK } from '@lyl/content';
import { describe, expect, it } from 'vitest';
import { lineCook } from '../../test/slice.ts';
import { type CareerRecord, careerOf, eventsFor, type ShiftEventRecord, shiftEventOf, taxOf } from './records.ts';

const store = createRecordStore(PACK.records);
const records = (type: string) => store.ids(type);
const event = (id: string) => store.get<ShiftEventRecord>('shift-event', id) as ShiftEventRecord;

/** The pack with one record changed. */
const changed = (type: string, id: string, value: object): RecordPack => ({
  ...PACK.records,
  [type]: { ...PACK.records[type], [id]: value },
});
const read =
  (reader: (s: ReturnType<typeof createRecordStore>, id: string) => unknown, pack: RecordPack, id: string) => () =>
    reader(createRecordStore(pack), id);

describe("the slice's job content", () => {
  it('reads every career, shift event and tax, with their checks', () => {
    expect(records('career')).toEqual(['detective', 'line-cook', 'police-officer', 'police-recruit']);
    for (const id of records('career')) careerOf(store, id);
    expect(records('shift-event').length).toBeGreaterThanOrEqual(12);
    for (const id of records('shift-event')) shiftEventOf(store, id);
    expect(records('tax')).toEqual(['city-resident', 'federal-single', 'medicare', 'michigan', 'social-security']);
    for (const id of records('tax')) taxOf(store, id);
  });

  it("pays at least Michigan's minimum wage, $12.48 an hour from 21 February 2025 (D37)", () => {
    for (const id of records('career')) expect(careerOf(store, id).wage).toBeGreaterThanOrEqual(1248);
  });

  it('draws every shift event from some career’s tags', () => {
    const drawn = new Set(records('career').flatMap((id) => eventsFor(store, careerOf(store, id)).map(([e]) => e)));
    expect([...drawn].sort()).toEqual(records('shift-event'));
  });

  it('puts certain choices first in every event, so the gamble is never the first tap', () => {
    for (const id of records('shift-event')) {
      expect(event(id).choices[0]?.odds, id).toBeUndefined();
    }
  });

  it('traces the wage and every tax to a row in CALIBRATION.md', () => {
    const calibration = readFileSync(resolve(import.meta.dirname, '../../../../docs/CALIBRATION.md'), 'utf8');
    for (const id of records('career')) expect(calibration, id).toContain(`career/${id}.json`);
    for (const id of records('tax')) expect(calibration, id).toContain(`tax/${id}.json`);
  });
});

describe('a bad record is refused when it is read', () => {
  const cook = lineCook();
  const career = (c: Partial<CareerRecord>) =>
    read(careerOf, changed('career', 'line-cook', { ...cook, ...c }), 'line-cook');

  it('in a career', () => {
    const shift = { id: 'breakfast', hour: 6, minute: 0, minutes: 480 };
    expect(career({ shifts: [shift, shift] })).toThrow('two shifts have one id');
    expect(career({ shifts: [{ ...shift, hour: 20 }] })).toThrow('runs past midnight');
    expect(career({ posting: { ...cook.posting, fewest: 6, most: 3 } })).toThrow('more at its fewest');
    expect(career({ open: ['monday', 'monday'] })).toThrow('open twice');
    expect(career({ withholding: ['no-such-tax'] })).toThrow('tax "no-such-tax": no such record');
    expect(() => careerOf(store, 'no-such-career')).toThrow('no such record');
  });

  it('in a shift event', () => {
    const rush = event('rush');
    const [ask, push] = rush.choices as [ShiftEventRecord['choices'][number], ShiftEventRecord['choices'][number]];
    const bad = (choices: object[]) => read(shiftEventOf, changed('shift-event', 'rush', { ...rush, choices }), 'rush');
    expect(bad([ask, ask])).toThrow('two choices have one id');
    expect(bad([ask, { ...push, failure: undefined }])).toThrow('needs a failure exactly when it has odds');
    expect(bad([ask, { ...ask, id: 'other', failure: push.failure }])).toThrow(
      'needs a failure exactly when it has odds',
    );
    expect(bad([push, { ...ask, id: 'after' }])).toThrow('comes after a chancy one');
  });

  it('in a tax', () => {
    const federal = taxOf(store, 'federal-single');
    const tax = (t: object, id = 'federal-single') => read(taxOf, changed('tax', id, { ...federal, ...t }), id);
    expect(tax({ brackets: [{ over: 100, rate: 1000 }] })).toThrow('the first bracket must start at 0');
    const [first, second] = federal.brackets;
    expect(tax({ brackets: [first, second, second] })).toThrow('bracket 2 starts too low');
    expect(tax({ cap: 1000 })).toThrow('a tax with a cap has one rate and no deduction');
  });
});
