/**
 * A 2D canvas context for Node: it records every call and fails on any number that isn't
 * finite, the NaN or Infinity that a browser draws as nothing without a word. The drawing tests
 * render whole scenes through it.
 */
const METHODS = [
  'beginPath',
  'moveTo',
  'lineTo',
  'arc',
  'ellipse',
  'quadraticCurveTo',
  'bezierCurveTo',
  'closePath',
  'rect',
  'fill',
  'stroke',
  'fillRect',
  'clearRect',
  'save',
  'restore',
  'setTransform',
  'transform',
  'translate',
  'scale',
  'rotate',
  'clip',
  'fillText',
  'strokeText',
  'drawImage',
] as const;

export interface FakeCanvas {
  readonly ctx: CanvasRenderingContext2D;
  readonly canvas: { width: number; height: number };
  /** Calls by method name. */
  readonly counts: Map<string, number>;
  /** Every fillText call's text. */
  readonly texts: string[];
}

export function fakeCanvas(width = 780, height = 1688): FakeCanvas {
  const counts = new Map<string, number>();
  const texts: string[] = [];
  const canvas = { width, height };
  const check = (name: string, args: unknown[]) => {
    args.forEach((a, i) => {
      if (typeof a === 'number' && !Number.isFinite(a)) {
        throw new Error(`${name}: argument ${i} is ${a}`);
      }
    });
  };
  const ctx: Record<string, unknown> = {
    canvas,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    createRadialGradient: (...args: unknown[]) => {
      check('createRadialGradient', args);
      return { addColorStop: (offset: number) => check('addColorStop', [offset]) };
    },
    createLinearGradient: (...args: unknown[]) => {
      check('createLinearGradient', args);
      return { addColorStop: (offset: number) => check('addColorStop', [offset]) };
    },
    measureText: (text: string) => ({ width: text.length * 6 }),
  };
  for (const name of METHODS) {
    ctx[name] = (...args: unknown[]) => {
      check(name, args);
      counts.set(name, (counts.get(name) ?? 0) + 1);
      if (name === 'fillText') texts.push(String(args[0]));
    };
  }
  // Setting a number property to NaN fails too.
  const guarded = new Proxy(ctx, {
    set(target, key, value) {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${String(key)} set to ${value}`);
      target[key as string] = value;
      return true;
    },
  });
  return { ctx: guarded as unknown as CanvasRenderingContext2D, canvas, counts, texts };
}
