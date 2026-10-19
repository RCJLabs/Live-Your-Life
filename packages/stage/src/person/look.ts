/**
 * How a person looks: one record, derived once from who they are (Landnám's "one person, one
 * look", `render/look.ts`), with the fields of Dirtbag's `Look` (`app/src/view/paint/people.ts`)
 * plus a body: height and build, because a 3/4 view shows both.
 */
export interface Look {
  readonly skin: string;
  readonly hair: string;
  readonly hairStyle: 'short' | 'long' | 'bun' | 'bald';
  readonly top: string;
  readonly sleeve: 'short' | 'long';
  readonly bottom: string;
  readonly shoe: string;
  /** Standing height in metres. */
  readonly height: number;
  /** Width of shoulders and hips against the usual: 0.85 slight, 1.2 broad. */
  readonly build: number;
  /** A cap's colour: the cook's white paper cap. */
  readonly cap?: string;
  /** An apron's colour, over the top. */
  readonly apron?: string;
}

/** The figure the measurements below are for; others scale by height. */
export const STANDARD_HEIGHT = 1.75;

/**
 * The body's measurements in metres for a 1.75 m person (tune). The head and limbs are drawn
 * a little larger than life, as a comic figure is, because at 30 to 50 px tall a true-size
 * head is three pixels across (docs/research/art-spike.md).
 */
export const BODY = {
  ankle: 0.08,
  shin: 0.42,
  thigh: 0.44,
  hipHalf: 0.1,
  spine: 0.47,
  shoulderHalf: 0.19,
  neck: 0.07,
  head: 0.145,
  upperArm: 0.29,
  forearm: 0.26,
  foot: 0.2,
  thighR: 0.08,
  shinR: 0.062,
  upperArmR: 0.058,
  forearmR: 0.048,
  handR: 0.05,
  shoeR: 0.05,
  torsoDepth: 0.21,
  waistHalf: 0.155,
} as const;
