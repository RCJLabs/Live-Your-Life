import { stateHash } from '@eb/core';
import { memoryStore, type Store } from '@eb/platform';
import { describe, expect, it } from 'vitest';
import { Keeper } from './keeper.ts';
import { Life } from './session.ts';

const keeperOn = (store: Store = memoryStore(), failed: string[] = []) =>
  new Keeper(store, 'test-build', (m) => failed.push(m));

/** A life with a few things in its journal: signed up, and a day of time gone by. */
function livedIn(seed: string): Life {
  const life = new Life(seed);
  life.act(life.options().find((a) => a.type === 'job/sign-up') as never);
  for (let i = 0; i < 30; i++) life.elapse(2000, 4);
  return life;
}

describe('the lives kept on this device (M1.7, D54)', () => {
  it('brings a life back as it was saved: the state, the journal and where you were', async () => {
    const keeper = keeperOn();
    const life = livedIn('kept');
    expect((await keeper.save('life-2', life, 'door-diner')).ok).toBe(true);
    const back = await keeper.load('life-2', life);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(stateHash(back.state)).toBe(stateHash(life.state));
    expect(back.at).toBe('door-diner');
    expect(new Life(back).journal.map((e) => e.text)).toEqual(life.journal.map((e) => e.text));
  });

  it('lists each slot with its life’s name, day and money, and the empty ones as empty', async () => {
    const keeper = keeperOn();
    const life = livedIn('listed');
    await keeper.save('life-3', life, null);
    const list = await keeper.list();
    expect(list.map((l) => l.kind)).toEqual(['empty', 'empty', 'life']);
    const kept = list[2];
    if (kept?.kind !== 'life') throw new Error('not listed');
    expect(kept.summary.name).toContain(life.names.you);
    expect(kept.summary.day).toBe(life.fact('time.day'));
    expect(kept.summary.cash).toBe(life.fact('economy.amount', { resource: 'cash' }));
  });

  it('drops journal entries the saved state never reached', async () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    const life = livedIn('ahead');
    await keeper.save('life-1', life, null);
    // A day's journal written, then the save after it failed: the entry is past the saved step.
    const key = (await store.keys('lyl/full/journal/life-1/'))[0] as string;
    const day = JSON.parse((await store.get(key)) as string) as unknown[];
    const late = { step: life.state.kernel.step + 5, day: 0, beat: { type: 'job/signed-up', day: 1, shift: 'x' } };
    await store.write({ [key]: JSON.stringify([...day, late]) });
    const back = await keeper.load('life-1', life);
    if (!back.ok) throw new Error(back.message);
    expect(new Life(back).journal.length).toBe(life.journal.length);
  });

  it('loads the life when a day of its journal won’t read', async () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    const life = livedIn('torn');
    await keeper.save('life-1', life, null);
    const key = (await store.keys('lyl/full/journal/life-1/'))[0] as string;
    await store.write({ [key]: '{torn' });
    const back = await keeper.load('life-1', life);
    expect(back.ok).toBe(true);
  });

  it('quarantines a save that won’t load, says so, and never writes over it', async () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    const life = livedIn('broken');
    await keeper.save('life-1', life, null);
    await store.write({ 'eb/live-your-life/full/slot/life-1': '{"format":1,"broken":true}' });
    const back = await keeper.load('life-1', life);
    expect(back.ok).toBe(false);
    if (back.ok) return;
    expect(back.quarantined).toBe(true);
    const aside = await keeper.saves.quarantined();
    expect(aside.length).toBe(1);
  });

  it('goes on from the save before when the last one is damaged', async () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    const life = livedIn('backup');
    await keeper.save('life-1', life, null);
    life.elapse(2000, 4);
    await keeper.save('life-1', life, null);
    await store.write({ 'eb/live-your-life/full/slot/life-1': 'not json' });
    const back = await keeper.load('life-1', life);
    expect(back.ok && back.fromBackup).toBe(true);
  });

  it('ends a life: its save and journal go, and its slot is empty again', async () => {
    const store = memoryStore();
    const keeper = keeperOn(store);
    await keeper.save('life-1', livedIn('ended'), null);
    expect((await keeper.end('life-1')).ok).toBe(true);
    expect((await keeper.list())[0]?.kind).toBe('empty');
    expect(await store.keys('lyl/full/journal/life-1/')).toEqual([]);
  });

  it('tells the player when storage refuses a save, whether the journal or the state', async () => {
    // At 10 characters the journal's day is refused; at 200 it fits and the state is refused.
    for (const quota of [10, 200]) {
      const failed: string[] = [];
      const result = await keeperOn(memoryStore({ quota }), failed).save('life-1', livedIn('full'), null);
      expect(result.ok, `quota ${quota}`).toBe(false);
      expect(failed.length, `quota ${quota}`).toBe(1);
    }
  });
});
