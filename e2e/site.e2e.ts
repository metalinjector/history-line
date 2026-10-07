import { expect, test } from './fixtures';

test('открывается с шапкой, шкалой и карточками', async ({ page, isMobile }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { name: 'Одна шкала — весь мир' })).toBeVisible();
  await expect(page.locator('.tcard').first()).toBeAttached();

  const nav = page.getByRole('navigation', { name: 'Разделы сайта' });
  if (isMobile) {
    // На телефоне разделы — в меню
    await expect(nav).toBeHidden();
    await page.getByRole('button', { name: 'Разделы сайта' }).click();
    await nav.getByRole('link', { name: 'Персоналии' }).click();
    await expect(nav).toBeHidden();
  } else {
    await nav.getByRole('link', { name: 'Персоналии' }).click();
  }
  await expect(page).toHaveURL(/#builder$/);
  await expect(page.getByRole('heading', { name: 'Добавьте своего деятеля на шкалу' })).toBeInViewport();
});

test('тема переключается и переживает перезагрузку', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Ночной атлас' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'atlas');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'atlas');
  await expect(page.getByRole('button', { name: 'Пергамент' })).toBeVisible();
});
