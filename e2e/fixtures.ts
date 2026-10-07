import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * Общие приёмы для смоук-тестов. Любая ошибка в консоли или необработанное
 * исключение валят тест: сайт статический, и шуметь ему не из-за чего.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use(errors);
      expect(errors, 'ошибки в консоли').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Поле хронологии. */
export const viewport = (page: Page) => page.locator('.timeline__viewport');

/** Выбранная карточка видна в поле целиком или хотя бы своим заголовком. */
export async function expectInViewport(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  await expect
    .poll(async () => {
      const [box, frame] = await Promise.all([target.boundingBox(), viewport(page).boundingBox()]);
      if (!box || !frame) return false;
      const top = Math.max(box.y, frame.y);
      const bottom = Math.min(box.y + box.height, frame.y + frame.height);
      const left = Math.max(box.x, frame.x);
      const right = Math.min(box.x + box.width, frame.x + frame.width);
      return bottom - top > 40 && right - left > 40;
    })
    .toBe(true);
}

/** Прокручивает страницу к шкале, чтобы поле было на экране. */
export async function scrollToTimeline(page: Page) {
  await page.locator('.timeline__stage').evaluate((stage) =>
    window.scrollTo({ top: stage.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' }),
  );
}
