/**
 * What the address can set, so any view the tester brief shows can be opened again on a
 * phone or in a screenshot: the seed, the time, the framing, the walls, the bubbles, the
 * controls, and a frozen moment for screenshots that come out the same every time. Since M1.1,
 * which block, and the walk grid over a generated one.
 */
export type Framing = 'wide' | 'close' | 'block';

export interface Params {
  readonly seed: string;
  /** Jump the clock to this time of day on load. */
  readonly at: { readonly hour: number; readonly minute: number } | null;
  readonly framing: Framing;
  /** The building `close` frames. */
  readonly focus: 'diner' | 'apartment';
  readonly cut: boolean;
  readonly bubbles: boolean;
  readonly hud: boolean;
  /** Stage seconds to hold still at, for screenshots. */
  readonly freeze: number | null;
  /** Keep the still picture between frames; `cache=0` repaints everything, to compare. */
  readonly cache: boolean;
  /** Which block: the spike's (D33), or M1.1's generated one with `block=generated`. */
  readonly block: 'spike' | 'generated';
  /** Draw the walk grid over a generated block. */
  readonly grid: boolean;
}

export const DEFAULT_SEED = 'rust-belt-1';

function time(text: string | null): Params['at'] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text ?? '');
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export function readParams(search: string): Params {
  const q = new URLSearchParams(search);
  const framing = q.get('view');
  const focus = q.get('focus');
  const freeze = q.get('freeze');
  return {
    seed: q.get('seed') || DEFAULT_SEED,
    at: time(q.get('at')),
    framing: framing === 'close' || framing === 'block' ? framing : 'wide',
    focus: focus === 'apartment' ? 'apartment' : 'diner',
    cut: q.get('walls') !== 'up',
    bubbles: q.get('bubbles') !== '0',
    hud: q.get('hud') !== '0',
    freeze: freeze !== null && Number.isFinite(Number(freeze)) ? Number(freeze) : null,
    cache: q.get('cache') !== '0',
    block: q.get('block') === 'generated' ? 'generated' : 'spike',
    grid: q.get('grid') === '1',
  };
}
