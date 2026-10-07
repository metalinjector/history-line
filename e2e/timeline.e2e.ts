import { expect, expectInViewport, scrollToTimeline, test } from './fixtures';

for (const [axis, query] of [
  ['вертикальной', ''],
  ['горизонтальной', '&o=h'],
] as const) {
  test(`ссылка на карточку открывает ${axis} шкалу на ней`, async ({ page }) => {
    await page.goto(`?focus=fr-revolution-1789${query}`);
    await scrollToTimeline(page);
    await expectInViewport(page, page.locator('#item-fr-revolution-1789'));
  });
}

test('поворот шкалы оставляет выбранную карточку на экране', async ({ page }) => {
  await page.goto('?focus=ru-1917');
  await scrollToTimeline(page);
  const card = page.locator('#item-ru-1917');
  await expectInViewport(page, card);

  await page.getByRole('radio', { name: /Горизонтально/ }).click();
  await expect(page.locator('.timeline__stage')).toHaveAttribute('data-orientation', 'horizontal');
  await expectInViewport(page, card);

  await page.getByRole('radio', { name: /Вертикально/ }).click();
  await expect(page.locator('.timeline__stage')).toHaveAttribute('data-orientation', 'vertical');
  await expectInViewport(page, card);
});

test('поле «к году» ведёт к году и к первой отметке века', async ({ page }) => {
  await page.goto('');
  const field = page.getByRole('textbox', { name: 'К году' });
  await field.scrollIntoViewIfNeeded();

  await field.fill('1812');
  await field.press('Enter');
  await expectInViewport(page, page.locator('#row-1812'));

  // Подсветка 1812 года ещё может гаснуть — ищем подсвеченную строку XVII века.
  await field.fill('XVII век');
  await field.press('Enter');
  const flashedInCentury = async () => {
    const years = await page
      .locator('.trow[data-flash]')
      .evaluateAll((rows) => rows.map((row) => Number(row.id.replace('row-', ''))));
    return years.find((year) => year >= 1601 && year <= 1700);
  };
  await expect.poll(flashedInCentury).toBeDefined();
  await expectInViewport(page, page.locator(`#row-${await flashedInCentury()}`));

  await field.fill('чепуха');
  await field.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Не понял год' })).toBeVisible();
});

test('мини-карта прокручивает шкалу', async ({ page }) => {
  await page.goto('');
  const map = page.getByRole('slider', { name: /Мини-карта шкалы/ });
  await map.scrollIntoViewIfNeeded();
  const max = Number(await map.getAttribute('aria-valuemax'));
  expect(Number(await map.getAttribute('aria-valuenow'))).toBeLessThan(max * 0.1);

  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height - 4);
  await expect.poll(async () => Number(await map.getAttribute('aria-valuenow'))).toBeGreaterThan(max * 0.6);

  await map.press('Home');
  await expect.poll(async () => Number(await map.getAttribute('aria-valuenow'))).toBe(0);
});

test('окно статьи грузит источники и трактовки и закрывается по Escape', async ({ page }) => {
  await page.goto('?item=es-1492');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /1492 год/ })).toBeVisible();
  await expect(dialog.getByText('✓ источники указаны')).toBeVisible();
  await expect(dialog.locator('.view')).toHaveCount(3);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/item=/);
});
