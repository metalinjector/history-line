import { test as base } from '@playwright/test';
import { expect, scrollToTimeline, test } from './fixtures';

/**
 * Сайт не должен превращаться в пустую страницу из-за того, что вне его
 * власти: оборвалась сеть, в браузере лежит сохранённое не той формы.
 * И привычные действия должны работать привычно: «Назад» закрывает окно.
 */

// Здесь ошибка в консоли ожидаема (чанк не загрузился), поэтому тест идёт
// без общей проверки «в консоли тихо» из fixtures.
base('сбой загрузки текстов не роняет сайт, обновление страницы открывает окно', async ({ page }) => {
  let blocked = 0;
  let failing = true;
  await page.route(/\/assets\/content-[^/]+\.js$/, (route) => {
    if (!failing) return route.continue();
    blocked++;
    return route.abort();
  });

  await page.goto('?focus=es-1492');
  await scrollToTimeline(page);
  await page.locator('#item-es-1492 .tcard__open').click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Не удалось открыть текст');
  expect(blocked).toBeGreaterThan(0);
  // Шкала на месте: приложение не размонтировалось
  await expect(page.getByRole('heading', { name: 'Одна шкала — весь мир' })).toBeVisible();
  await expect(page.locator('#item-es-1492')).toBeVisible();

  // Адрес помнит открытую статью: после обновления страницы она открывается
  failing = false;
  await alert.getByRole('button', { name: 'Обновить страницу' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /1492 год/ })).toBeVisible();
  await expect(alert).toBeHidden();
});

base('окно, которое не открылось, можно закрыть', async ({ page }) => {
  await page.route(/\/assets\/content-[^/]+\.js$/, (route) => route.abort());
  await page.goto('?item=es-1492');

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Не удалось открыть текст');
  await alert.getByRole('button', { name: 'Закрыть' }).click();
  await expect(alert).toBeHidden();
  await expect(page).not.toHaveURL(/item=/);
});

test('пока тексты грузятся, читатель видит, что окно открывается', async ({ page }) => {
  await page.route(/\/assets\/content-[^/]+\.js$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('?item=es-1492');
  await expect(page.getByRole('status').filter({ hasText: 'Открываем текст' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /1492 год/ })).toBeVisible();
  await expect(page.getByText('Открываем текст')).toBeHidden();
});

test('сохранённое не той формы не роняет сайт', async ({ page }) => {
  await page.addInitScript(() => {
    const junk: Record<string, string> = {
      countries: '"france"',
      zoom: '"abc"',
      'added-people': '[{"id":"x"},{"id":"custom-1","title":"T","summary":"s","year":1900,"kind":"person","country":"atlantis","tags":[]}]',
      'added-relations': '{"a":1}',
      notes: 'null',
      layers: '{}',
      'layer-placements': '"x"',
      'column-groups': '"x"',
      'country-sets': '[{"id":"u","label":"L"}]',
      theme: '"neon"',
      orientation: '42',
      'show-bce': '"no"',
      'show-relations': '[]',
    };
    for (const [key, value] of Object.entries(junk)) localStorage.setItem(`history-line:${key}`, value);
  });

  await page.goto('');
  await expect(page.getByRole('heading', { name: 'Одна шкала — весь мир' })).toBeVisible();
  await expect(page.locator('.tcard').first()).toBeAttached();
  // Настройки открываются: панели стран и слоёв читают то же сохранённое
  await page.getByRole('button', { name: /Настройки/ }).click();
  await expect(page.getByRole('heading', { name: /Страны и линии/ })).toBeVisible();
});

test('«Назад» закрывает окно статьи и оставляет читателя на сайте', async ({ page }) => {
  await page.goto('?focus=es-1492');
  await scrollToTimeline(page);
  await page.locator('#item-es-1492 .tcard__open').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /1492 год/ })).toBeVisible();
  await expect(page).toHaveURL(/item=es-1492/);

  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/item=/);
  await expect(page).toHaveURL(/focus=es-1492/);
  await expect(page.locator('#item-es-1492')).toBeVisible();

  // Закрытие через Esc снимает запись окна из истории: «Назад» после него
  // не открывает и не закрывает ничего лишнего.
  await page.locator('#item-es-1492 .tcard__open').click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/item=/);
  await expect
    .poll(() => page.evaluate(() => Boolean((history.state as Record<string, unknown> | null)?.['history-line:modal'])))
    .toBe(false);
});

test('«Развернуть» подводит поле к верху окна', async ({ page, isMobile }) => {
  test.skip(isMobile, 'на телефоне кнопки «Развернуть» нет');
  await page.goto('');
  await page.getByRole('button', { name: 'Развернуть' }).click();
  await expect
    .poll(async () => (await page.locator('.timeline__stage').boundingBox())?.y ?? -1)
    .toBeLessThan(120);
  await expect.poll(async () => (await page.locator('.timeline__stage').boundingBox())?.y ?? -1).toBeGreaterThan(40);
});

test.describe('тёмная система', () => {
  test.use({ colorScheme: 'dark' });

  test('первый визит открывает «Ночной атлас», выбор читателя важнее системы', async ({ page }) => {
    await page.goto('');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'atlas');
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#0d1017');

    await page.getByRole('button', { name: 'Пергамент' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'parchment');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'parchment');
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#f0e5d1');
  });
});
