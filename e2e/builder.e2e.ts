import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test('свой объект: добавить с периодом, поправить, экспортировать и вернуть импортом', async ({ page }) => {
  await page.goto('#builder');
  await page.getByRole('button', { name: 'Свой объект' }).click();

  const form = page.locator('form.builder__form');
  await form.getByLabel('Заголовок').fill('Греко-персидские войны');
  await form.getByLabel('Страна').selectOption('ancient-greece');
  await form.getByLabel('Тип').selectOption('event');
  await form.getByLabel('Год действия').fill('-499');
  await form.getByLabel('Год окончания').fill('-449');
  await form.getByLabel('Кратко — одно предложение').fill('Полисы Греции отражают натиск державы Ахеменидов.');
  await form.getByLabel(/Опорная веха/).check();
  await form.getByRole('button', { name: 'Добавить в хронологию' }).click();

  // Объект на шкале: выбран, со звездой вехи и полосой периода
  const card = page.locator('.tcard[data-custom]');
  await expect(card).toHaveAttribute('data-selected', 'true');
  await expect(card.locator('.tcard__title')).toHaveText('Греко-персидские войны');
  await expect(card.locator('.tcard__seal')).toBeVisible();
  await expect(page.locator('.tperiod[title^="Греко-персидские войны"]').first()).toBeAttached();

  // Правка
  const added = page.locator('.builder__added-list li');
  await added.getByRole('button', { name: /Изменить/ }).click();
  await expect(form.getByLabel('Год окончания')).toHaveValue('-449');
  await form.getByLabel('Заголовок').fill('Греко-персидские войны (V в. до н. э.)');
  await form.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(added).toHaveCount(1);
  await expect(added).toContainText('Греко-персидские войны (V в. до н. э.)');

  // Экспорт → удаление → импорт
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Экспорт' }).click(),
  ]);
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.schema).toBe('history-line/custom-objects@1');
  expect(exported.items).toHaveLength(1);

  await added.getByRole('button', { name: /Убрать/ }).click();
  await expect(added).toHaveCount(0);

  const input = page.locator('.builder__toolbar input[type=file]');
  const file = { name: 'objects.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) };
  await input.setInputFiles(file);
  await expect(page.locator('.builder__report')).toContainText('Добавлено: 1 объект');
  await expect(added).toHaveCount(1);

  await input.setInputFiles(file);
  await expect(page.locator('.builder__report')).toContainText('Уже были на шкале: 1');
  await expect(added).toHaveCount(1);
});
