import { expect, test } from '@playwright/test';
import { expectNoAxeIssues, expectNothingOffscreen, picture, smallTargets, watchErrors } from './checks.ts';

/** M1.1's generated block (`?block=generated`, D33) gets the checks every page gets. */
const SCREENS = [
  { name: '390 px portrait', width: 390, height: 844 },
  { name: '360 px portrait', width: 360, height: 740 },
  { name: 'landscape', width: 844, height: 390 },
] as const;

interface Drawn {
  readonly lots: number;
  readonly buildings: readonly string[];
  readonly open: string;
}

const blockOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __lyl: { block: () => Drawn | null } }).__lyl.block());

for (const screen of SCREENS) {
  test.describe(`the generated block, ${screen.name}`, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    test('draws the block, keeps to the screen, and every control is a 44 px target', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('./?block=generated&at=13:00');
      await expect(page.locator('#when')).toContainText('13:0');
      const drawn = await picture(page);
      expect(drawn.colours, 'the street is drawn, not a blank canvas').toBeGreaterThan(40);
      const block = await blockOf(page);
      expect(block?.buildings).toEqual(expect.arrayContaining(['apartment', 'diner', 'corner-shop']));
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '.controls')).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('the generated block on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('has no accessibility issues', async ({ page }) => {
    await page.goto('./?block=generated&at=13:00');
    await expect(page.locator('#when')).toContainText(':');
    await expectNoAxeIssues(page);
  });

  test('is a different street for another seed, and the same one for the same seed', async ({ page }) => {
    await page.goto('./?block=generated&seed=one&at=13:00');
    const one = await blockOf(page);
    await page.goto('./?block=generated&seed=two&at=13:00');
    const two = await blockOf(page);
    await page.goto('./?block=generated&seed=one&at=13:00');
    expect(await blockOf(page)).toEqual(one);
    expect(two).not.toEqual(one);
  });

  test('draws the walk grid over it when asked', async ({ page }) => {
    await page.goto('./?block=generated&at=13:00&hud=0&freeze=1');
    await page.waitForTimeout(300);
    const plain = await picture(page);
    await page.goto('./?block=generated&at=13:00&hud=0&freeze=1&grid=1');
    await page.waitForTimeout(300);
    expect((await picture(page)).brightness).toBeGreaterThan(plain.brightness);
  });

  test('opens offline once it has loaded, its own code cached with the rest', async ({ page, context }) => {
    await page.goto('./?block=generated&at=13:00');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.locator('#when')).toContainText(':');
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#when')).toContainText(':');
    expect((await blockOf(page))?.lots).toBeGreaterThan(0);
    await context.setOffline(false);
  });
});
