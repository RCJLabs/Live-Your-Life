import { expect, type Page, test } from '@playwright/test';
import { expectNoAxeIssues, expectNothingOffscreen, picture, smallTargets, watchErrors } from './checks.ts';

/**
 * M1.6's life on the page (D49–D52), played by taps on the screen, as a player would. The screens'
 * checks open the page as a first visit does; the rest play the life of `?seed=life-1`, unsaved,
 * so the block, and the walk to the diner, are the same every run (a new life's seed is random).
 */

type Life = Record<string, (...args: unknown[]) => unknown>;
const L = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([f, a]) => (window as unknown as { __lyl: { life: Life } }).__lyl.life[f as string]?.(...(a as unknown[])),
    [fn, args],
  ) as Promise<T>;

interface PlaceInfo {
  id: string;
  kind: string;
  label: string;
  building: string;
}

/** Taps a place where it is on the screen, with the camera brought round to it first, as a player would scroll. */
async function tap(page: Page, id: string): Promise<void> {
  await L(page, 'focus', id);
  await page.waitForTimeout(80);
  const at = await L<{ x: number; y: number }>(page, 'screenOf', id);
  await page.mouse.click(at.x, at.y);
}

/** Waits until you have stopped walking. */
async function arrive(page: Page): Promise<void> {
  await expect
    .poll(async () => (await L<{ walking: boolean }>(page, 'where')).walking, { timeout: 30_000 })
    .toBe(false);
}

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

    test('draws the life, keeps to the screen, and every control is a 44 px target, in the bar, the panel and the map', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.goto('./');
      await expect(page.locator('#when')).toContainText('June');
      expect((await picture(page)).colours, 'the city is drawn').toBeGreaterThan(40);
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#bar')).toEqual([]);
      await page.click('#badge');
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);
      await page.click('#panel-close');
      await page.click('#map-button');
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#map')).toEqual([]);
      await expectNoAxeIssues(page);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('plays a day by taps alone, and the sim refuses nothing it is sent', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await page.goto('./?seed=life-1');
    await expect(page.locator('#when')).toContainText('07:0');
    const places = await L<PlaceInfo[]>(page, 'places');
    const bed = places.find((p) => p.label === 'Bed' && p.building === 'apartment') as PlaceInfo;
    const kitchen = places.find((p) => p.label === 'Kitchenette') as PlaceInfo;
    const griddle = places.find((p) => p.label === 'Griddle') as PlaceInfo;

    // Sign up for the first shift posted.
    await page.click('#badge');
    await page.click('button[data-tab="week"]');
    await page.locator('#postings button').first().click();
    await page.click('#panel-close');
    expect((await L<{ kind: string }[]>(page, 'waiting')).filter((w) => w.kind === 'shift').length).toBe(1);
    await expect(page.locator('#badge')).toHaveText('Waiting: 1');

    // Eat, then sleep until the shift is near: each sleep runs to its usual end or the shift's start.
    // Nothing is sent to the sim while you are still on your way (D49).
    await tap(page, kitchen.id);
    await page.waitForTimeout(150);
    expect((await L<{ walking: boolean }>(page, 'where')).walking).toBe(true);
    await expect(page.locator('#menu')).toBeHidden();
    expect(await L<string[]>(page, 'log')).not.toContain('life/do');
    await arrive(page);
    await page.locator('#menu button[data-action="life/do"]').first().click();
    for (let i = 0; i < 6 && (await L<number | undefined>(page, 'fact', 'job.next-shift-in')) !== undefined; i++) {
      await page.waitForTimeout(3200);
      if ((await L<number>(page, 'fact', 'job.next-shift-in')) <= 0) break;
      await tap(page, bed.id);
      await arrive(page);
      await page.locator('#menu button[data-action="life/do"]').first().click();
      await page.waitForTimeout(3200);
      if ((await L<boolean>(page, 'fact', 'job.on-shift')) === true) break;
    }

    // To the diner by the map, then work the shift, answering whatever stops it.
    await page.click('#map-button');
    await page.locator('#map-places button', { hasText: 'Diner' }).first().click();
    await arrive(page);
    for (let i = 0; i < 6 && (await L<boolean>(page, 'fact', 'job.on-shift')); i++) {
      if (await page.locator('#choice').isVisible()) {
        await page.locator('#choice button').first().click();
        await page.waitForTimeout(3200);
        continue;
      }
      await tap(page, griddle.id);
      await arrive(page);
      const work = page.locator('#menu button[data-action="life/do"]');
      if ((await work.count()) === 0) break;
      await work.first().click();
      await page.waitForTimeout(3200);
    }
    if (await page.locator('#choice').isVisible()) await page.locator('#choice button').first().click();

    // Home, and to bed.
    await page.click('#map-button');
    await page.locator('#map-places button', { hasText: 'Your building' }).click();
    await arrive(page);
    await tap(page, bed.id);
    await arrive(page);
    await page.locator('#menu button[data-action="life/do"]').first().click();
    await page.waitForTimeout(3200);

    expect(await L(page, 'refused')).toEqual([]);
    const journal = await L<string[]>(page, 'journal');
    expect(
      journal.some((line) => line.includes('signed up')),
      journal.join('\n'),
    ).toBe(true);
    expect(
      journal.some((line) => line.includes('worked')),
      journal.join('\n'),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

  test('drops the clock to 1× when the alarm goes off, and says why (D60)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('./?seed=life-1');
    await expect(page.locator('#when')).toContainText('07:0');
    await page.click('#badge');
    await page.click('button[data-tab="week"]');
    await page.locator('#postings button').first().click();
    await page.click('#panel-close');
    await page.click('#speed');
    await expect(page.locator('#speed')).toHaveText('4×');
    const bed = (await L<PlaceInfo[]>(page, 'places')).find(
      (p) => p.label === 'Bed' && p.building === 'apartment',
    ) as PlaceInfo;
    let line = '';
    for (let i = 0; i < 10 && line === ''; i++) {
      await tap(page, bed.id);
      await arrive(page);
      await page.locator('#menu button[data-action="life/do"]').first().click();
      // Sleep ends at the alarm (D57); the line comes once its fast-forward is shown.
      for (let w = 0; w < 20 && line === ''; w++) {
        await page.waitForTimeout(250);
        const toast = (await page.locator('#toast').textContent()) ?? '';
        if (toast.includes('time to walk')) line = toast;
      }
    }
    expect(line).toContain('time to walk to the diner');
    await expect(page.locator('#speed')).toHaveText('1×');
    expect(await L<number>(page, 'fact', 'job.next-shift-in')).toBeLessThanOrEqual(30);
  });

  test('stops the clock in the panel, a menu and the map, and when paused', async ({ page }) => {
    await page.goto('./?seed=life-1');
    await expect(page.locator('#when')).toContainText('07:0');
    const still = async () => {
      const before = await L<number>(page, 'tick');
      await page.waitForTimeout(1500);
      return (await L<number>(page, 'tick')) - before;
    };
    expect(await still(), 'running').toBeGreaterThan(0);
    await page.click('#badge');
    expect(await still(), 'the panel').toBe(0);
    await page.click('#panel-close');
    await page.click('#map-button');
    expect(await still(), 'the map').toBe(0);
    await page.click('#map-close');
    const places = await L<PlaceInfo[]>(page, 'places');
    await tap(page, (places.find((p) => p.label === 'Couch') as PlaceInfo).id);
    await arrive(page);
    await expect(page.locator('#menu')).toBeVisible();
    expect(await still(), 'a menu').toBe(0);
    await page.click('#menu button[data-action="leave"]');
    await page.click('#play');
    expect(await still(), 'paused').toBe(0);
    await page.click('#play');
    expect(await still(), 'playing again').toBeGreaterThan(0);
  });

  test('walks at a brisk pace with the clock running: about 20 game minutes from the flat to the diner', async ({
    page,
  }) => {
    await page.goto('./?seed=life-1');
    await expect(page.locator('#when')).toContainText('07:0');
    const before = await L<number>(page, 'tick');
    await page.click('#map-button');
    await page.locator('#map-places button', { hasText: 'Diner' }).first().click();
    await arrive(page);
    const took = (await L<number>(page, 'tick')) - before;
    // D49: three times a walking pace; the bed to the diner's door is 30 to 50 m on the slice's blocks.
    expect(took).toBeGreaterThanOrEqual(12);
    expect(took).toBeLessThanOrEqual(30);
  });

  test('the map names every building, and a tap on one walks you to its door', async ({ page }) => {
    await page.goto('./?seed=life-1');
    await page.click('#map-button');
    const buttons = page.locator('#map-places button');
    const doors = (await L<PlaceInfo[]>(page, 'places')).filter((p) => p.kind === 'door');
    await expect(buttons).toHaveCount(doors.length);
    for (const d of doors) await expect(page.locator(`#map-places button[data-place="${d.id}"]`)).toHaveText(d.label);
    const shop = doors.find((d) => d.building === 'corner-shop') as PlaceInfo;
    await page.click(`#map-places button[data-place="${shop.id}"]`);
    await arrive(page);
    const at = await L<{ x: number; y: number }>(page, 'where');
    const want = await L<{ x: number; y: number }>(page, 'standOf', shop.id);
    expect(Math.hypot(at.x - want.x, at.y - want.y)).toBeLessThan(0.05);
  });
});
