import type { TimelineItem } from '../types';
import { articles, sourcesByItem, viewpointsByItem } from './content';
import { germany } from './items/germany';
import { england } from './items/england';
import { france } from './items/france';
import { russia } from './items/russia';
import { belarus } from './items/belarus';
import { spain } from './items/spain';
import { china } from './items/china';
import { japan } from './items/japan';
import { referenceItems } from './items/reference';

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
  ...referenceItems,
].map((item) => ({
  // Статьи, источники и трактовки хранятся отдельно и подмешиваются
  // по идентификатору, чтобы файлы стран оставались компактными списками карточек.
  ...item,
  ...(articles[item.id] ? { body: articles[item.id] } : {}),
  ...(sourcesByItem[item.id] ? { sources: sourcesByItem[item.id] } : {}),
  ...(viewpointsByItem[item.id] ? { viewpoints: viewpointsByItem[item.id] } : {}),
}));

/** Все теги, встречающиеся в базе, по частоте использования. */
export const allTags = Array.from(
  timelineItems
    .flatMap((item) => item.tags)
    .reduce((map, tag) => map.set(tag, (map.get(tag) ?? 0) + 1), new Map<string, number>()),
)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
  .map(([tag, count]) => ({ tag, count }));
