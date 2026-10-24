import { expect, type Page, test } from '@playwright/test';
import { expectNothingOffscreen, smallTargets, watchErrors } from './checks.ts';

/**
 * The corner on the page (M2.4, D78): reached by a tap like any place, its menu inside the screen
 * at a phone's width, every control a 44 px target. The life of `?seed=life-1`, unsaved.
 */

type Life = Record<string, (...args: unknown[]) => unknown>;
const L = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([f, a]) => (window as unknown as { __lyl: { life: Life } }).__lyl.life[f as string]?.(...(a as unknown[])),
    [fn, args],
  ) as Promise<T>;

for (const screen of [
  { name: '390 px portrait', width: 390, height: 844 },
  { name: '360 px portrait', width: 360, height: 740 },
] as const) {
  test.describe(screen.name, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    test('walks to the corner by a tap, and its menu says what you hold and when the supplier comes', async ({
      page,
    }) => {
      const errors = watchErrors(page);
      await page.goto('./?seed=life-1');
      await expect(page.locator('#when')).toContainText('June');
      const places = await L<{ id: string; kind: string }[]>(page, 'places');
      expect(places.filter((p) => p.kind === 'corner').map((p) => p.id)).toEqual(['corner']);
      await L(page, 'focus', 'corner');
      await page.waitForTimeout(80);
      const at = await L<{ x: number; y: number }>(page, 'screenOf', 'corner');
      await page.mouse.click(at.x, at.y);
      await expect(page.locator('#menu h2')).toHaveText('The corner', { timeout: 30_000 });
      await expect(page.locator('#menu .lead')).toContainText('You hold nothing to sell.');
      await expect(page.locator('#menu .lead')).toContainText('comes at 20:00');
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#menu')).toEqual([]);
      expect(await L<unknown[]>(page, 'refused')).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
