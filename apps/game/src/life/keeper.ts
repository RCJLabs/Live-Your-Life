/**
 * The lives kept on this device (M1.7, D53–D54): three slots, each one life, saved by the engine's
 * slots (@eb/platform) with their backups and quarantine. Nothing is saved or loaded by hand: the
 * page saves after everything you do and as time passes, so what happened stands.
 *
 * The journal is kept beside each save, a key a day, because the save holds only the state and
 * the actions since its last compaction, which can't tell the chronicle again. Each entry carries
 * the step it happened at: the day's key is written before the save, so a save that fails after
 * it leaves entries the state never reached, and a load drops them by step.
 */
import type { GameState } from '@eb/core';
import {
  createSaves,
  openStore,
  requestPersistence,
  type Saves,
  type SlotLoad,
  type Store,
  storeError,
  type WriteResult,
} from '@eb/platform';
import type { Kept, Life } from './session.ts';

export const GAME = 'live-your-life';
export const EDITION = 'full';
export const SLOTS = ['life-1', 'life-2', 'life-3'] as const;
export type Slot = (typeof SLOTS)[number];

/** What a slot list shows of a life, and where you were when it was saved. */
export interface Summary {
  readonly name: string;
  readonly day: number;
  readonly cash: number;
  /** The place you last reached, from places.ts; a load stands you there. */
  readonly at: string | null;
}

export type Listed =
  | { readonly slot: Slot; readonly kind: 'empty' }
  | { readonly slot: Slot; readonly kind: 'life'; readonly summary: Summary; readonly savedAt: number }
  | { readonly slot: Slot; readonly kind: 'unreadable' };

export type Loaded =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly kept: Kept[];
      readonly at: string | null;
      /** The slot's last save would not load, and this is the one before it. */
      readonly fromBackup: boolean;
    }
  | { readonly ok: false; readonly problem: string; readonly message: string; readonly quarantined: boolean };

const journalOf = (slot: string) => `lyl/${EDITION}/journal/${slot}/`;
const dayKey = (slot: string, day: number) => `${journalOf(slot)}${String(day).padStart(6, '0')}`;

export class Keeper {
  readonly store: Store;
  readonly saves: Saves;
  readonly build: string;
  #queue: Promise<unknown> = Promise.resolve();
  #saved = new Map<string, number>();
  #asked = false;
  readonly #failed: (message: string) => void;

  constructor(store: Store, build: string, failed: (message: string) => void) {
    this.store = store;
    this.build = build;
    this.#failed = failed;
    this.saves = createSaves({ store, game: GAME, edition: EDITION, onFailure: (f) => failed(f.message) });
  }

  static async open(build: string, failed: (message: string) => void): Promise<Keeper> {
    return new Keeper(await openStore(), build, failed);
  }

  async list(): Promise<Listed[]> {
    const found = new Map((await this.saves.list()).map((s) => [s.slot, s]));
    return SLOTS.map((slot): Listed => {
      const s = found.get(slot);
      if (!s) return { slot, kind: 'empty' };
      if (!s.readable) return { slot, kind: 'unreadable' };
      return { slot, kind: 'life', summary: s.summary as unknown as Summary, savedAt: s.savedAt };
    });
  }

  async load(slot: Slot, life: Pick<Life, 'game' | 'sim'>): Promise<Loaded> {
    const result: SlotLoad = await this.saves.load(slot, life.game, life.sim, this.build);
    if (!result.ok) {
      return { ok: false, problem: result.problem, message: result.message, quarantined: !!result.quarantined };
    }
    const kept: Kept[] = [];
    for (const key of await this.store.keys(journalOf(slot))) {
      // A day that won't read costs that day's entries, never the life.
      try {
        const day = JSON.parse((await this.store.get(key)) ?? '[]') as unknown;
        if (Array.isArray(day)) kept.push(...(day as Kept[]));
      } catch {}
    }
    kept.sort((a, b) => a.step - b.step);
    this.#saved.set(slot, result.state.kernel.step);
    const summary = result.file.summary as Partial<Summary> | undefined;
    return { ok: true, state: result.state, kept, at: summary?.at ?? null, fromBackup: !!result.fromBackup };
  }

  /** Saves a life: its journal's new days, then the state. Saves queue, so two never cross. */
  save(slot: Slot, life: Life, at: string | null): Promise<WriteResult> {
    const work = this.#queue.then(() => this.#save(slot, life, at));
    this.#queue = work.catch(() => undefined);
    return work;
  }

  async #save(slot: Slot, life: Life, at: string | null): Promise<WriteResult> {
    const since = this.#saved.get(slot) ?? -1;
    const days = new Set(life.journal.filter((e) => e.step > since).map((e) => e.day));
    if (days.size > 0) {
      const entries: Record<string, string> = {};
      for (const day of days) {
        const kept = life.journal
          .filter((e) => e.day === day)
          .map(({ step, day: d, beat }) => ({ step, day: d, beat }));
        entries[dayKey(slot, day)] = JSON.stringify(kept);
      }
      try {
        await this.store.write(entries);
      } catch (error) {
        const failure = storeError(error);
        this.#failed(failure.message);
        return { ok: false, reason: failure.reason, message: failure.message };
      }
    }
    const you = life.names.you;
    const last = (life.state.you as { last: string }).last;
    const summary: Summary = {
      name: last ? `${you} ${last}` : you,
      day: life.fact('time.day') as number,
      cash: life.fact('economy.amount', { resource: 'cash' }) as number,
      at,
    };
    const result = await this.saves.writeSession(slot, life.session, {
      build: this.build,
      savedAt: Date.now(),
      summary: { ...summary },
    });
    if (result.ok) this.#saved.set(slot, life.state.kernel.step);
    if (result.ok && !this.#asked) {
      // Some browsers keep storage only once asked, and grant it only once the site is in use.
      this.#asked = true;
      void requestPersistence();
    }
    return result;
  }

  /** Ends a life: its save, backup and journal go. Quarantined copies stay. */
  async end(slot: Slot): Promise<WriteResult> {
    const result = await this.saves.remove(slot);
    const keys = await this.store.keys(journalOf(slot));
    if (keys.length > 0) await this.store.write(Object.fromEntries(keys.map((k) => [k, undefined])));
    this.#saved.delete(slot);
    return result;
  }
}
