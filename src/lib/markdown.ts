import type { Country, Era, TimelineItem } from '../types';
import { formatItemDate } from './format';

/** Протокол внутренних ссылок: превращается в переход к другому объекту шкалы. */
export const ITEM_LINK_PROTOCOL = 'item:';

const WIKI_LINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/**
 * Превращает ссылки в стиле Obsidian в обычные Markdown-ссылки.
 *
 *     [[de-luther-1517]]                  → [Мартин Лютер и 95 тезисов](item:de-luther-1517)
 *     [[de-luther-1517|его тезисы]]       → [его тезисы](item:de-luther-1517)
 *
 * Если объекта с таким идентификатором нет, ссылка остаётся видимым текстом
 * и помечается как битая — так ошибка в базе сразу заметна, а статья не ломается.
 */
export function resolveWikiLinks(
  markdown: string,
  resolve: (id: string) => TimelineItem | undefined,
): string {
  return markdown.replace(WIKI_LINK, (_match, rawId: string, label?: string) => {
    const id = rawId.trim();
    const item = resolve(id);
    if (!item) return `\`[[${id}]]\``;
    const text = (label ?? item.title).trim();
    return `[${text}](${ITEM_LINK_PROTOCOL}${id})`;
  });
}

/** Все объекты, на которые ссылается текст статьи. */
export function collectWikiLinks(markdown: string): string[] {
  return Array.from(markdown.matchAll(WIKI_LINK), (match) => match[1].trim());
}

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

const sourceKindLabels: Record<string, string> = {
  encyclopedia: 'энциклопедия',
  academic: 'научная публикация',
  archive: 'архив или документ',
  institution: 'профильное учреждение',
};

export function sourceKindLabel(kind?: string): string {
  return kind ? (sourceKindLabels[kind] ?? kind) : 'источник';
}

function weightLabel(importance?: number): string {
  if ((importance ?? 2) >= 3) return 'опорная веха эпохи';
  if ((importance ?? 2) === 1) return 'контекст';
  return 'заметное событие';
}
