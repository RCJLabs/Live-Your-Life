import { expect, test } from '@playwright/test';
import { expectNoAxeIssues, expectNothingOffscreen, picture, smallTargets, watchErrors } from './checks.ts';

const SCREENS = [
  { name: '390 px portrait', width: 390, height: 844 },
  { name: '360 px portrait', width: 360, height: 740 },
  { name: 'landscape', width: 844, height: 390 },
] as const;

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    test('draws the block, keeps to the screen, and every control is a 44 px target', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('./?at=13:00');
      await expect(page.locator('#when')).toContainText('13:0');
      const drawn = await picture(page);
      expect(drawn.colours, 'the city is drawn, not a blank canvas').toBeGreaterThan(40);
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '.controls')).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('has no accessibility issues', async ({ page }) => {
    await page.goto('./?at=13:00');
    await expect(page.locator('#when')).toContainText('13:0');
    await expectNoAxeIssues(page);
  });

  test('turns night and day, cuts the walls, hides and shows its controls, and pauses', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('./?at=13:00');
    await expect(page.locator('#when')).toContainText('13:0');
    const day = await picture(page);
    await page.locator('#night').click();
    await expect(page.locator('#when')).toContainText('22:3');
    await page.waitForTimeout(150);
    const night = await picture(page);
    expect(night.brightness, 'night is darker than day').toBeLessThan(day.brightness * 0.75);
    await page.locator('#day').click();
    await expect(page.locator('#when')).toContainText('13:0');
    const walls = page.locator('#walls');
    await expect(walls).toHaveAttribute('aria-pressed', 'true');
    await walls.click();
    await expect(walls).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#hide').click();
    await expect(page.locator('#controls')).toBeHidden();
    await page.locator('#city').tap({ position: { x: 195, y: 400 } });
    await expect(page.locator('#controls')).toBeVisible();
    await page.locator('#play').click();
    await expect(page.locator('#play')).toHaveText('Play');
    const held = await page.locator('#when').textContent();
    await page.waitForTimeout(1500);
    await expect(page.locator('#when')).toHaveText(held ?? '');
    expect(errors).toEqual([]);
  });

  test('asks nothing of another site, and opens offline once it has loaded', async ({ page, context, baseURL }) => {
    const home = new URL(baseURL ?? 'http://localhost:4173/').origin;
    const elsewhere: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).origin !== home && !r.url().startsWith('data:')) elsewhere.push(r.url());
    });
    await page.goto('./?at=13:00');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.locator('#when')).toContainText(':');
    expect(elsewhere).toEqual([]);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#when')).toContainText(':');
    expect((await picture(page)).colours).toBeGreaterThan(40);
    await context.setOffline(false);
  });
});
