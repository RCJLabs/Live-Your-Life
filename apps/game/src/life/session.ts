/**
 * The life on the page (M1.6): the sim's session for one life, with the line cook hired and the
 * pack's records. The page only reads facts, offers what the game offers and sends actions; the
 * sim decides. Time passes only out in the world: while a choice, a hold or the court is up, or
 * the page is paused, no `time/elapse` is sent (ROADMAP open question 22), and out in the world it
 * is sent in whole game minutes, a few times a second rather than every frame (open question 10).
 * What happens is written to the chronicle as it drains (D52). Each entry keeps the event and the
 * step it happened at, so a save can keep the journal beside it and a load can drop what the
 * save didn't reach (M1.7, keeper.ts).
 */
import {
  type Action,
  type Beat,
  createSession,
  type Effect,
  type EffectPreview,
  type GameState,
  type ModeFrame,
  type Session,
} from '@eb/core';
import { PACK } from '@lyl/content';
import { createLifeGame, DEFAULT_START, type LawState, lifeSim, lineFor, REAL_TIME, type YouSlice } from '@lyl/sim';

/** A chronicle entry as kept: the event, the day and the step it happened at. */
export interface Kept {
  readonly step: number;
  readonly day: number;
  readonly beat: Beat;
}

export interface Entry extends Kept {
  readonly text: string;
}

export class Life {
  readonly game = createLifeGame({ career: 'line-cook' });
  readonly sim = lifeSim(PACK.records);
  readonly session: Session;
  /** The chronicle so far, oldest first, and the lines not yet shown as toasts. */
  readonly journal: Entry[] = [];
  readonly fresh: string[] = [];
  /** Actions the sim refused: the page should never send one (the day-by-taps gate). */
  readonly refused: { action: Action; reason: unknown }[] = [];
  #fraction = 0;

  /** A new life from a seed, or one a save brought back with the journal kept beside it. */
  constructor(from: string | { readonly state: GameState; readonly kept: readonly Kept[] }) {
    const state = typeof from === 'string' ? this.game.init(from, this.sim) : from.state;
    this.session = createSession(this.game, this.sim, state);
    this.session.drain();
    if (typeof from === 'string') return;
    for (const k of from.kept) {
      if (k.step > state.kernel.step) continue;
      const text = this.#line(k.beat);
      if (text) this.journal.push({ ...k, text });
    }
  }

  get seed(): string {
    return this.state.kernel.seed;
  }

  get state(): GameState {
    return this.session.state;
  }

  fact(id: string, args?: Record<string, unknown>): unknown {
    return this.game.fact(this.state, id, args, this.sim);
  }

  get mode(): ModeFrame {
    return this.state.kernel.modes.at(-1) as ModeFrame;
  }

  options(): readonly Action[] {
    return this.game.options(this.state, this.sim);
  }

  preview(effects: readonly Effect[]): readonly EffectPreview[] {
    return this.game.preview(this.state, effects, this.sim);
  }

  /** One effect's preview, read as the shape its module gives it. */
  peek<T>(effect: Effect): T {
    return this.preview([effect])[0] as unknown as T;
  }

  /**
   * How far into the next game minute the page's clock has run, 0 to 1: time the sim hasn't been
   * sent yet, since it takes whole minutes. What the stage places people by, so they move every
   * frame, not in a step each game minute.
   */
  get partial(): number {
    return this.mode.id === 'world' ? Math.min(1, this.#fraction / REAL_TIME.msPerTick) : 0;
  }

  /**
   * Real milliseconds at a speed's factor, out in the world only. They are sent as whole game
   * minutes, so the log holds two actions a second at speed 1, not one a frame; the rest waits.
   */
  elapse(ms: number, factor: number): void {
    if (this.mode.id !== 'world' || ms <= 0) return;
    this.#fraction += ms * factor;
    const whole = Math.floor(this.#fraction / REAL_TIME.msPerTick) * REAL_TIME.msPerTick;
    this.#fraction -= whole;
    if (whole > 0) this.act({ type: 'time/elapse', ms: whole });
    if (this.session.log.length > 600) this.session.compact();
  }

  /** Sends an action; true if the sim took it. */
  act(action: Action): boolean {
    const step = this.session.dispatch(action);
    if (!step.accepted) this.refused.push({ action, reason: step.beats[0]?.reason });
    this.#write(this.session.drain());
    return step.accepted;
  }

  get names() {
    const you = this.state.you as YouSlice;
    const ties = this.state.ties as { coworker: { first: string } | null };
    const law = this.state.law as LawState;
    return {
      you: you.first,
      ...(ties.coworker ? { coworker: ties.coworker.first } : {}),
      ...(law.fence ? { fence: law.fence.first } : {}),
    };
  }

  #line(beat: Beat): string | null {
    return lineFor(this.sim.content, beat, this.names, DEFAULT_START);
  }

  #write(beats: readonly Beat[]): void {
    const day = this.fact('time.day') as number;
    const step = this.state.kernel.step;
    for (const beat of beats) {
      const text = this.#line(beat);
      if (!text) continue;
      this.journal.push({ step, day, beat, text });
      this.fresh.push(text);
    }
  }
}
