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

/** The canvas as the average colour of each 8×8 block: small enough to compare two pictures. */
const blocks = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const c = document.getElementById('city') as HTMLCanvasElement;
    const { data, width, height } = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(
      0,
      0,
      c.width,
      c.height,
    );
    const out: number[] = [];
    for (let by = 0; by + 8 <= height; by += 8) {
      for (let bx = 0; bx + 8 <= width; bx += 8) {
        let sum = 0;
        for (let y = by; y < by + 8; y++) {
          for (let x = bx; x < bx + 8; x++) {
            const i = (y * width + x) * 4;
            sum += (data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0);
          }
        }
        out.push(sum / 64);
      }
    }
    return out;
  });

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

  test('keeps a still picture that matches painting everything every frame', async ({ page }) => {
    for (const at of ['13:00', '22:30']) {
      await page.goto(`./?at=${at}&freeze=1.2&hud=0`);
      await page.waitForTimeout(300);
      const kept = await blocks(page);
      await page.goto(`./?at=${at}&freeze=1.2&hud=0&cache=0`);
      await page.waitForTimeout(300);
      const full = await blocks(page);
      const worst = Math.max(...kept.map((v, i) => Math.abs(v - (full[i] ?? 0))));
      // Edges drawn twice inside a mover's clip anti-alias a shade darker: about 13 at most
      // (of 765). A piece drawn in the wrong order differs by 60 to 240.
      expect(worst, `at ${at}, a block differs by ${worst.toFixed(1)}`).toBeLessThan(40);
    }
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
