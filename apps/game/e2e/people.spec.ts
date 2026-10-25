import { expect, type Page, test } from '@playwright/test';
import { expectNothingOffscreen, smallTargets, watchErrors } from './checks.ts';

/**
 * M2.6's People tab on the page, by taps: go out to a haunt, the walk passing on the clock, spend
 * the evening there until you meet someone, see them listed with what you can do and its odds,
 * and walk home. At both phone widths, nothing past the edge and every target 44 px.
 */

type Life = Record<string, (...args: unknown[]) => unknown>;
const L = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([f, a]) => (window as unknown as { __lyl: { life: Life } }).__lyl.life[f as string]?.(...(a as unknown[])),
    [fn, args],
  ) as Promise<T>;

const people = async (page: Page) => {
  if (!(await page.locator('#panel').isVisible())) await page.click('#badge');
  await page.click('button[data-tab="people"]');
};
const idle = (page: Page) => expect.poll(() => L<boolean>(page, 'busy'), { timeout: 20_000 }).toBe(false);

for (const width of [360, 390]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    test('goes out, meets someone, and walks home', async ({ page }) => {
      test.setTimeout(180_000);
      const errors = watchErrors(page);
      await page.goto('./?seed=life-1');
      await expect(page.locator('#when')).toContainText('07:0');

      await people(page);
      await expect(page.locator('#ties')).toContainText('don’t know anyone');
      await expect(page.locator('#family')).toContainText('no children');
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);

      const before = await L<number>(page, 'fact', 'time.tick');
      await page.locator('#out button[data-action="trip/out"]').first().click();
      await idle(page);
      expect(await L<number>(page, 'fact', 'circle.out')).toBeGreaterThanOrEqual(0);
      expect(await L<number>(page, 'fact', 'time.tick'), 'the walk passed').toBeGreaterThan(before);

      // Two hours at a time until someone is met: the bar fills in the evening, so the morning passes first.
      for (let n = 0; n < 16 && (await L<number>(page, 'fact', 'circle.known')) === 0; n++) {
        await people(page);
        await page.locator('#out button[data-action="life/do"]').click();
        await idle(page);
      }
      await people(page);
      await expect(page.locator('#ties li').first()).toBeVisible();
      await expect(page.locator('#ties li').first()).toContainText(/, \d+\./);
      await expect(page.locator('#ties li button[data-action="circle/talk"]').first()).toBeVisible();
      // The odds on screen are the preview's: the talk's chance, read from the sim.
      const person = Number(await page.locator('#ties li').first().getAttribute('data-person'));
      const talk = await L<{ chance: number }>(page, 'peek', { effect: 'talk-roll', person });
      await expect(page.locator('#ties li .note').first()).toHaveText(`It goes well about ${talk.chance} in 100.`);
      // Talked once this hour: the sim offers no second talk, so the panel shows none.
      await page.locator('#ties li button[data-action="circle/talk"]').first().click();
      await expect(page.locator(`#ties li[data-person="${person}"] button[data-action="circle/talk"]`)).toHaveCount(0);
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);

      await page.locator('#out button[data-action="trip/home"]').click();
      await idle(page);
      expect(await L<number>(page, 'fact', 'circle.out')).toBe(-1);
      expect(errors).toEqual([]);
    });
  });
}
