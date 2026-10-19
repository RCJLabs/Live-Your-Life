/**
 * The life on the page (M1.6): the sim's session for one life, with the line cook hired and the
 * pack's records. The page only reads facts, offers what the game offers and sends actions; the
 * sim decides. Time passes only out in the world: while a choice, a hold or the court is up, or
 * the page is paused, no `time/elapse` is sent (ROADMAP open question 22). What happens is
 * written to the chronicle as it drains (D52).
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
import { createLifeGame, DEFAULT_START, type LawState, lifeSim, lineFor, type YouSlice } from '@lyl/sim';

export interface Entry {
  readonly day: number;
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

  constructor(seed: string) {
    this.session = createSession(this.game, this.sim, this.game.init(seed, this.sim));
    this.session.drain();
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

  /** Real milliseconds at a speed's factor, out in the world only; a part of a game minute waits. */
  elapse(ms: number, factor: number): void {
    if (this.mode.id !== 'world' || ms <= 0) return;
    this.#fraction += ms * factor;
    const whole = Math.floor(this.#fraction);
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

  #write(beats: readonly Beat[]): void {
    const day = this.fact('time.day') as number;
    for (const beat of beats) {
      const text = lineFor(this.sim.content, beat, this.names, DEFAULT_START);
      if (!text) continue;
      this.journal.push({ day, text });
      this.fresh.push(text);
    }
  }
}
