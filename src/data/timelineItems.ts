import type { TimelineItem } from '../types';
import { contentSummaryById } from './contentSummary';
import { germany } from './items/germany';
import { england } from './items/england';
import { france } from './items/france';
import { russia } from './items/russia';
import { belarus } from './items/belarus';
import { spain } from './items/spain';
import { china } from './items/china';
import { japan } from './items/japan';
import { italy } from './items/italy';
import { poland } from './items/poland';
import { usa } from './items/usa';
import { world } from './items/world';
import { ancientRome } from './items/ancient-rome';
import { byzantium } from './items/byzantium';
import { kievanRus } from './items/kievan-rus';
import { referenceItems } from './items/reference';
import { referenceMerges } from './referenceMerges';

/**
 * Единый массив объектов хронологии.
 *
 * Данные разложены по файлам стран, чтобы база могла расти без конфликтов:
 * добавить новую страну — значит добавить один файл и одну строку здесь,
 * а также запись в data/countries.ts.
 */
const authoredItems: TimelineItem[] = [
  ...germany,
  ...england,
  ...france,
  ...russia,
  ...belarus,
  ...spain,
  ...china,
  ...japan,
  ...italy,
  ...poland,
  ...usa,
  ...world,
  ...ancientRome,
  ...byzantium,
  ...kievanRus,
];

/**
 * Справочник — запасной слой. Запись из него, которую редакция выверила
 * и переписала, переезжает в файл своей линии под тем же id: id уже живут
 * в ссылках и заметках читателей. Авторская карточка заменяет запись
 * справочника, а reference.json остаётся таким, каким его сгенерировал импорт.
 * Запись, которая повторяет готовую карточку, сливается с ней — см. referenceMerges.ts.
 */
const authoredIds = new Set(authoredItems.map((item) => item.id));

/** Справочник без записей, переписанных редакцией или слитых с её карточками. */
const isFallbackReference = (item: TimelineItem) => !authoredIds.has(item.id) && !(item.id in referenceMerges);

export const timelineItems: TimelineItem[] = [
  ...authoredItems,
  ...referenceItems.filter(isFallbackReference),
].map((item) => ({
  // Статьи, источники и трактовки хранятся отдельно (content/) и грузятся
  // вместе с модальным окном. Здесь подмешивается только их сводка.
  ...item,
  ...(contentSummaryById[item.id] ? { content: contentSummaryById[item.id] } : {}),
}));

/** Все теги, встречающиеся в базе, по частоте использования. */
export const allTags = Array.from(
  timelineItems
    .flatMap((item) => item.tags)
    .reduce((map, tag) => map.set(tag, (map.get(tag) ?? 0) + 1), new Map<string, number>()),
)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
  .map(([tag, count]) => ({ tag, count }));
