import type { TimelineItem } from '../types';
import { articles } from './articles';
import { germany } from './items/germany';
import { england } from './items/england';
import { france } from './items/france';
import { russia } from './items/russia';
import { belarus } from './items/belarus';
import { spain } from './items/spain';
import { china } from './items/china';
import { japan } from './items/japan';

/**
 * Единый массив объектов хронологии.
 *
 * Данные разложены по файлам стран, чтобы база могла расти без конфликтов:
 * добавить новую страну — значит добавить один файл и одну строку здесь,
 * а также запись в data/countries.ts.
 */
export const timelineItems: TimelineItem[] = [
  ...germany,
  ...england,
  ...france,
  ...russia,
  ...belarus,
  ...spain,
  ...china,
  ...japan,
].map((item) =>
  // Развёрнутые статьи хранятся отдельно и подмешиваются по идентификатору,
  // чтобы файлы стран оставались компактными списками карточек.
  articles[item.id] ? { ...item, body: articles[item.id] } : item,
);

/** Все теги, встречающиеся в базе, по частоте использования. */
export const allTags = Array.from(
  timelineItems
    .flatMap((item) => item.tags)
    .reduce((map, tag) => map.set(tag, (map.get(tag) ?? 0) + 1), new Map<string, number>()),
)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
  .map(([tag, count]) => ({ tag, count }));
