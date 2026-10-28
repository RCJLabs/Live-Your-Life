import { expect, type Page, test } from '@playwright/test';
import { expectNothingOffscreen, smallTargets, watchErrors } from './checks.ts';

/**
 * M2.8's School tab on the page, by taps. A life without a diploma (life-3) sees the GED's four
 * tests, each with the chance the sim previews, and studies an hour for one; a life with one
 * (life-1) sees the college and when it can enroll, and the university's chance, and applies
 * (M4.2), and the EMT course and the college's nursing program (M4.4). At both phone widths, nothing past the edge and every target 44 px.
 */

type Life = Record<string, (...args: unknown[]) => unknown>;
const L = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> =>
  page.evaluate(
    ([f, a]) => (window as unknown as { __lyl: { life: Life } }).__lyl.life[f as string]?.(...(a as unknown[])),
    [fn, args],
  ) as Promise<T>;

const schoolTab = async (page: Page) => {
  if (!(await page.locator('#panel').isVisible())) await page.click('#badge');
  await page.click('button[data-tab="school"]');
};

for (const width of [360, 390]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

    test('shows the GED without a diploma, its odds as previewed, and studies for a test', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('./?seed=life-3');
      await expect(page.locator('#when')).toContainText('07:0');
      expect(await L<string>(page, 'fact', 'education.finished')).toBe('none');
      await schoolTab(page);
      await expect(page.locator('#school')).toContainText('You didn’t finish high school.');
      const subjects = page.locator('#school [data-section="ged"] li[data-item="math"]');
      const before = await L<{ chance: number }>(page, 'peek', { effect: 'ged-odds', subject: 'math' });
      await expect(subjects).toContainText(`about ${before.chance} in 100 pass`);
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);

      await subjects.locator('button', { hasText: 'Study an hour' }).click();
      await expect(subjects).toContainText('studied 1 hour');
      const after = await L<{ chance: number }>(page, 'peek', { effect: 'ged-odds', subject: 'math' });
      expect(after.chance).toBeGreaterThan(before.chance);
      await expect(subjects).toContainText(`about ${after.chance} in 100 pass`);
      expect(errors).toEqual([]);
    });

    test('shows the college and when it can enroll, with a diploma', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('./?seed=life-1');
      await expect(page.locator('#when')).toContainText('07:0');
      await schoolTab(page);
      await expect(page.locator('#school')).toContainText('You have a high school diploma.');
      await expect(page.locator('#school [data-section="college"]')).toContainText('days before a term starts');
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('shows the EMT course and the college’s nursing program with what it asks (M4.4)', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('./?seed=life-1');
      await expect(page.locator('#when')).toContainText('07:0');
      await schoolTab(page);
      await expect(page.locator('#school [data-section="emt"]')).toContainText('Passing both earns the certificate.');
      await expect(page.locator('#school [data-section="adn"]')).toContainText('It admits after');
      await expect(page.locator('#school [data-section="bsn"]')).toHaveCount(0);
      await page.locator('#school [data-section="adn"]').scrollIntoViewIfNeeded();
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('shows the university’s chance as previewed, and applies by a tap (M4.2)', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto('./?seed=life-1');
      await expect(page.locator('#when')).toContainText('07:0');
      await schoolTab(page);
      const uni = page.locator('#school [data-section="university"]');
      const { chance } = await L<{ chance: number }>(page, 'peek', { effect: 'admit-odds' });
      await expect(uni).toContainText(`About ${chance} in 100 with your record are admitted`);
      await expectNothingOffscreen(page);
      expect(await smallTargets(page, '#panel')).toEqual([]);
      await uni.locator('button', { hasText: 'Apply' }).click();
      const admitted = await L<boolean>(page, 'fact', 'education.admitted');
      await expect(uni).toContainText(admitted ? 'credits for a bachelor’s' : 'You can apply again');
      await expectNothingOffscreen(page);
      expect(errors).toEqual([]);
    });
  });
}
