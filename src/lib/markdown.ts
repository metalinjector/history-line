import type { Country, Era, TimelineItem } from '../types';
import { formatItemDate } from './format';

/**
 * Готовит Markdown-документ для модального окна.
 *
 * Если у объекта есть авторский текст в поле body, используется он.
 * Иначе документ собирается из остальных полей — получается связная статья
 * со всеми теми же ответами: что произошло, почему важно, что рядом во времени.
 * Благодаря этому база может расти постепенно: подробный текст дописывается
 * там, где он нужен, а карточка без него всё равно открывается осмысленно.
 */
export function itemToMarkdown(item: TimelineItem, country: Country, era?: Era): string {
  if (item.body) return item.body.trim();

  const lines: string[] = [];

  lines.push(`> ${item.summary}`);
  lines.push('');
  lines.push('## Что произошло');
  lines.push('');
  lines.push(item.detail);

  if (item.parallel) {
    lines.push('');
    lines.push('## В это же время');
    lines.push('');
    lines.push(`> ${item.parallel}`);
  }

  if (era) {
    lines.push('');
    lines.push('## Эпоха');
    lines.push('');
    lines.push(`**${era.label}** (${era.from}–${era.to > 2100 ? 'наши дни' : era.to}). ${era.note}`);
  }

  lines.push('');
  lines.push('## Карточка объекта');
  lines.push('');
  lines.push('| Поле | Значение |');
  lines.push('| --- | --- |');
  lines.push(`| Линия | ${country.label} |`);
  lines.push(`| Дата | ${formatItemDate(item)} |`);
  lines.push(`| Тип | ${item.kind === 'event' ? 'событие' : 'деятель'} |`);
  if (item.life) lines.push(`| Годы жизни | ${item.life} |`);
  if (item.endYear && item.endYear !== item.year) lines.push(`| Длительность | до ${item.endYear} |`);
  lines.push(`| Вес | ${weightLabel(item.importance)} |`);

  if (item.tags.length > 0) {
    lines.push('');
    lines.push(`**Темы:** ${item.tags.map((tag) => `\`${tag}\``).join(' · ')}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*${country.note}*`);

  return lines.join('\n');
}

function weightLabel(importance?: number): string {
  if ((importance ?? 2) >= 3) return 'опорная веха эпохи';
  if ((importance ?? 2) === 1) return 'контекст';
  return 'заметное событие';
}
