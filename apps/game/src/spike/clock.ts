/**
 * The game's clock on the page: the sim's session, given each frame's milliseconds (M0.1's
 * loop), at speed 1 or 2. The light and the clock line read its facts; the stage never sets
 * the time.
 */
import { createSession, type Session } from '@eb/core';
import { createLifeGame, lifeSim } from '@lyl/sim';

/** Speed 2 runs the clock four times as fast as speed 1 (docs/DESIGN.md, Time). */
export const SPEEDS = { 1: 1, 2: 4 } as const;
export type Speed = keyof typeof SPEEDS;

export class Clock {
  readonly #sim = lifeSim();
  readonly #game = createLifeGame();
  readonly #session: Session;
  #fraction = 0;

  constructor(seed: string) {
    this.#session = createSession(this.#game, this.#sim, this.#game.init(seed, this.#sim));
  }

  fact(id: string): unknown {
    return this.#game.fact(this.#session.state, id, undefined, this.#sim);
  }

  /** Lets real milliseconds pass at a speed: whole ones go to the sim, the rest waits. */
  elapse(ms: number, speed: Speed): void {
    this.#fraction += ms * SPEEDS[speed];
    const whole = Math.floor(this.#fraction);
    this.#fraction -= whole;
    if (whole > 0) this.#session.dispatch({ type: 'time/elapse', ms: whole });
    this.#session.drain();
    if (this.#session.log.length > 600) this.#session.compact();
  }

  /** Moves the clock on to the next time it is this time of day. */
  jump(hour: number, minute: number): void {
    this.#session.dispatch({ type: 'clock/wait-until', hour, minute });
    this.#session.drain();
  }

  get minuteOfDay(): number {
    return this.fact('time.of-day') as number;
  }

  /** "Monday 2 June, 07:00": the clock line. */
  get text(): string {
    const word = (id: string) => {
      const t = String(this.fact(id));
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    const two = (id: string) => String(this.fact(id)).padStart(2, '0');
    return `${word('time.weekday')} ${this.fact('time.day-of-month')} ${word('time.month')}, ${two('clock.hour')}:${two('clock.minute')}`;
  }
}
