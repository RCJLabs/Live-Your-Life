/**
 * One palette (docs/DESIGN.md, Presentation). The ink, the cream and the lit windows are
 * Dirtbag's (`app/src/view/paint/people.ts`, `fx.ts`, `fronts.ts`), so the Mix carries over:
 * people and bubbles are inked; buildings and ground are flat colour with no outlines.
 */

export const INK = '#1B1B1F';
export const CREAM = '#FFFDF5';
export const ACCENT = '#D8553F';
/** A window lit from inside at night. */
export const LIT = '#FFD27A';
/** The night sky's colour, laid over the scene (Dirtbag v0.956's night, docs/audit/world-ui.md). */
export const NIGHT = '#0F142E';

export const GROUND = {
  asphalt: '#55585F',
  alley: '#66676B',
  laneYellow: '#E3C66A',
  laneWhite: '#E8E5DC',
  sidewalk: '#C2BCAF',
  joint: '#A9A396',
  curb: '#D6D0C3',
  grass: '#84A064',
  gravel: '#A8A08F',
  dirt: '#97876C',
  lot: '#B5AE9E',
} as const;

export const BUILDING = {
  brick: '#A0553F',
  brickDark: '#7E3F2F',
  stucco: '#E2D5BB',
  siding: '#9DB0B7',
  dinerTeal: '#2E8C87',
  dinerRed: '#C9473A',
  chrome: '#CDD2D6',
  roof: '#5C5853',
  roofEdge: '#77716A',
  cornice: '#CDBB9C',
  glass: '#86A9B8',
  glassDark: '#56717E',
  frame: '#EDE6D6',
  door: '#6B4A35',
  sign: '#F3EBD8',
  wallInside: '#E6DAC1',
  /** Sills, lintels, brackets and copings: cast stone. */
  stone: '#D3C7AE',
  /** Plywood over a window nobody lives behind. */
  board: '#A3835A',
  boardDark: '#7C6142',
} as const;

export const INSIDE = {
  checkerLight: '#ECE6D8',
  checkerDark: '#33333A',
  wood: '#B98E5E',
  woodDark: '#9C7448',
  dinerWall: '#E8DCC2',
  flatWall: '#D8D0C3',
  rug: '#8F5A4E',
  steel: '#AEB3B8',
  steelDark: '#7E8389',
  white: '#E3E5E7',
  counterTop: '#C9BB9F',
  counterFront: '#2E8C87',
  booth: '#B9473D',
  tableTop: '#DCD3C2',
  bedFrame: '#7A5A40',
  sheet: '#EEEBE3',
  blanket: '#5C7A9E',
  pillow: '#F5F2EB',
  couch: '#6F7F5A',
  screen: '#26282C',
  flame: '#F2A23A',
} as const;

export const STREET = {
  pole: '#4A4E55',
  lampHead: '#3E4248',
  trunk: '#6C5440',
  leaves: '#5E8A4A',
  leavesLight: '#79A35C',
  bench: '#7B5A3E',
  benchFrame: '#3E4248',
  hydrant: '#C9473A',
} as const;

/** Skin, from light to dark: a city's range, drawn from the seed. */
export const SKIN = ['#F1D3BD', '#E6B998', '#D49E7A', '#B97F5B', '#93603F', '#6E452C', '#4E3020'] as const;

export const HAIR = ['#1E1A18', '#3B2A20', '#6A4A30', '#B8873F', '#D9B66A', '#8E3B22', '#9A9A98'] as const;

export const CLOTH = [
  '#3E5C7A',
  '#7A3B3B',
  '#4F6B47',
  '#C9A44C',
  '#5B5B66',
  '#D8D2C4',
  '#2E2E33',
  '#A65F3A',
  '#7E8FA6',
  '#35496B',
  '#6E5A8A',
  '#E9E5DA',
] as const;

export const SHOES = ['#2B2A2E', '#4A3A30', '#E6E1D6', '#5B5B66'] as const;
