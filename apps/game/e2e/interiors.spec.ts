import { expect, type Page, test } from '@playwright/test';
import { watchErrors } from './checks.ts';

/** M1.2's interiors and the walker on the commute (D36), at `?block=generated`. */
interface Walker {
  readonly unit: string;
  readonly metres: number;
  readonly round: number;
  readonly legs: readonly { readonly doing: string; readonly from: number; readonly to: number }[];
  readonly at: { readonly x: number; readonly y: number; readonly pose: string };
  readonly cut: readonly string[];
}

type Lyl = { __lyl?: { walker: () => Walker | null; heights: () => Record<string, number> } };

/** The walker where the page has them, once its script has run. */
async function walkerOn(page: Page, query: string): Promise<Walker> {
  await page.goto(`./?block=generated&hud=0&at=13:00&${query}`);
  await page.waitForFunction(() => (window as unknown as Lyl).__lyl !== undefined);
  const walker = await page.evaluate(() => (window as unknown as Required<Lyl>).__lyl.walker());
  if (!walker) throw new Error('no walker on the block');
  return walker;
}

const middle = (w: Walker, leg: number) => {
  const l = w.legs[leg];
  if (!l) throw new Error(`no leg ${leg}`);
  return (l.from + l.to) / 2;
};

test.describe('the walker on the commute', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('sleeps in the flat and cooks at the griddle, the building they are in cut away and they in sight', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    const round = await walkerOn(page, 'walls=up&freeze=0');
    expect(round.legs.map((l) => l.doing)).toEqual(['walk', 'cook', 'walk', 'sleep']);
    expect(round.metres).toBeGreaterThan(10);
    const asleep = await walkerOn(page, `walls=up&view=close&focus=apartment&freeze=${middle(round, 3)}`);
    expect(asleep.at.pose).toBe('lie');
    expect(asleep.cut).toContain('apartment');
    const cooking = await walkerOn(page, `walls=up&view=close&focus=diner&freeze=${middle(round, 1)}`);
    expect(cooking.at.pose).toBe('cook');
    expect(cooking.cut).toContain('diner');
    await page.waitForTimeout(200);
    const heights = await page.evaluate(() => (window as unknown as Required<Lyl>).__lyl.heights());
    expect(heights.walker, 'the cook is drawn, not hidden by a wall').toBeGreaterThan(25);
    expect(errors).toEqual([]);
  });

  test('walks between them at a walking pace, drawn all the way', async ({ page }) => {
    const round = await walkerOn(page, 'walls=up&freeze=0');
    const from = round.legs[0]?.from ?? 0;
    const to = round.legs[0]?.to ?? 0;
    let last: Walker | null = null;
    for (let t = from + 1; t < to - 1; t += (to - from) / 6) {
      const now = await walkerOn(page, `walls=up&freeze=${t}`);
      expect(now.at.pose).toBe('walk');
      await page.waitForTimeout(150);
      const heights = await page.evaluate(() => (window as unknown as Required<Lyl>).__lyl.heights());
      expect(heights.walker, `drawn at ${t.toFixed(1)} s`).toBeGreaterThan(10);
      if (last) {
        const step = Math.hypot(now.at.x - last.at.x, now.at.y - last.at.y);
        expect(step).toBeLessThanOrEqual(((to - from) / 6) * 1.3 + 1e-6);
        expect(step).toBeGreaterThan(0);
      }
      last = now;
    }
  });

  test('cuts every interior with the walls down, wherever the walker is', async ({ page }) => {
    const round = await walkerOn(page, 'freeze=0');
    for (const leg of [0, 1, 3]) {
      const now = await walkerOn(page, `freeze=${middle(round, leg)}`);
      expect(now.cut).toEqual(['apartment', 'corner-shop', 'diner']);
    }
  });
});
