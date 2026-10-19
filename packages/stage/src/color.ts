/** Colours as numbers, so faces can be shaded and night can be mixed in. */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const cache = new Map<string, Rgb>();

/** '#rrggbb' as numbers. Throws on anything else, so a typo in the palette fails loudly. */
export function rgb(hex: string): Rgb {
  const hit = cache.get(hex);
  if (hit) return hit;
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Not a colour: ${hex}`);
  const n = Number.parseInt(m[1] as string, 16);
  const c = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  cache.set(hex, c);
  return c;
}

const channel = (n: number): number => Math.round(Math.min(255, Math.max(0, n)));

export const css = (c: Rgb, alpha = 1): string =>
  alpha >= 1
    ? `rgb(${channel(c.r)},${channel(c.g)},${channel(c.b)})`
    : `rgba(${channel(c.r)},${channel(c.g)},${channel(c.b)},${Math.max(0, alpha).toFixed(3)})`;

/** A colour lit by `k`: 1 is the colour as written, less is in shade. */
export const shade = (c: Rgb, k: number): Rgb => ({ r: c.r * k, g: c.g * k, b: c.b * k });

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
});

/** A hex colour lit by `k`, as CSS. */
export const lit = (hex: string, k: number): string => css(shade(rgb(hex), k));

/** A hex colour lit by `k`, as hex: a darker material that is shaded again, like a wall's cut top. */
export const shadeHex = (hex: string, k: number): string => {
  const c = shade(rgb(hex), k);
  const two = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${two(c.r)}${two(c.g)}${two(c.b)}`;
};
