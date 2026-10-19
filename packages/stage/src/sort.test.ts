import { describe, expect, it } from 'vitest';
import { box, overlaps } from './geom.ts';
import { screenRect, type View } from './iso.ts';
import { behind, insertPiece, orderPieces, type Piece } from './sort.ts';

const piece = (name: string, b: ReturnType<typeof box>, bias = 0): Piece & { name: string } => ({
  name,
  box: b,
  bias,
  draw: () => {},
});

const names = (pieces: readonly Piece[]) => pieces.map((p) => (p as Piece & { name: string }).name);

// A room 10 m by 8 m with its near walls cut down, as the cutaway draws it.
const room = {
  backWall: piece('back wall', box(0, 0, 0, 10, 0.15, 3)),
  leftWall: piece('left wall', box(0, 0, 0, 0.15, 8, 3)),
  stove: piece('stove', box(6, 0.15, 0, 7, 0.85, 0.95)),
  frontStub: piece('front stub', box(0, 7.85, 0, 10, 8, 0.55)),
  sideStub: piece('side stub', box(9.85, 0, 0, 10, 8, 0.55)),
};
const cook = piece('cook', box(6.3, 0.95, 0, 6.7, 1.35, 1.8));

describe('the depth sort', () => {
  it('separates on any axis: the larger x, y or z draws later', () => {
    expect(behind(box(0, 0, 0, 1, 1, 1), box(1, 0, 0, 2, 1, 1))).toBe(true);
    expect(behind(box(0, 1, 0, 1, 2, 1), box(0, 0, 0, 1, 1, 1))).toBe(false);
    expect(behind(box(0, 0, 0, 1, 1, 1), box(0, 0, 1, 1, 1, 2))).toBe(true);
    expect(behind(box(0, 0, 0, 2, 2, 2), box(1, 1, 1, 3, 3, 3))).toBeNull();
  });

  it('draws a person in a cut-away room after the back wall and the stove, and before the front stub', () => {
    const ordered = orderPieces(Object.values(room));
    insertPiece(ordered, cook);
    const order = names(ordered.pieces);
    const at = (n: string) => order.indexOf(n);
    expect(at('back wall')).toBeLessThan(at('cook'));
    expect(at('stove')).toBeLessThan(at('cook'));
    expect(at('cook')).toBeLessThan(at('front stub'));
  });

  it('draws a person on the sidewalk after the building, and one behind it before', () => {
    const building = piece('building', box(0, 0, 0, 10, 8, 9));
    const front = piece('front', box(4, 9, 0, 4.4, 9.4, 1.8));
    const back = piece('back', box(4, -1.4, 0, 4.4, -1, 1.8));
    const ordered = orderPieces([building]);
    insertPiece(ordered, front);
    insertPiece(ordered, back);
    expect(names(ordered.pieces)).toEqual(['back', 'building', 'front']);
  });

  it('gives an order that agrees with every separated pair that overlaps on screen', () => {
    const all = [
      ...Object.values(room),
      piece('table', box(2, 4, 0, 3, 5, 0.75)),
      piece('lamp', box(8, 9, 0, 8.2, 9.2, 4)),
    ];
    const { pieces } = orderPieces(all);
    const unit: View = { u: 1, ox: 0, oy: 0, width: 0, height: 0 };
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const a = pieces[i] as Piece;
        const b = pieces[j] as Piece;
        if (!overlaps(screenRect(unit, a.box), screenRect(unit, b.box))) continue;
        const rule = behind(a.box, b.box);
        if (rule !== null) expect(rule, `${names([a])} before ${names([b])}`).toBe(true);
      }
    }
  });

  it('orders boxes that pass through each other by their middles, and never hangs on a cycle', () => {
    const tangle = [
      piece('a', box(0, 0, 0, 2, 2, 2)),
      piece('b', box(1, 1, 1, 3, 3, 3)),
      piece('c', box(0.5, 0.5, 0.5, 2.5, 2.5, 2.5)),
    ];
    expect(names(orderPieces(tangle).pieces)).toEqual(['a', 'c', 'b']);
    const raised = [piece('low', box(0, 0, 0, 2, 2, 2), 5), piece('high', box(1, 1, 1, 3, 3, 3))];
    expect(names(orderPieces(raised).pieces)).toEqual(['high', 'low']);
  });
});
