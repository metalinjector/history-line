import type { ContentSummary } from '../types';

/**
 * ⚠ КАРКАС — docs/CORE.md, раздел 3. Новое поле для шкалы добавляется
 * в сводку (plugins/markdownContent.ts), а не через импорт data/content.ts.
 *
 * Сводка редакционной базы: есть ли у объекта статья, проверен ли он
 * и сколько у него трактовок.
 *
 * Сами статьи, источники и трактовки (data/content.ts) весят в разы больше
 * и нужны только в модальном окне и при экспорте, поэтому грузятся отдельным
 * чанком. Шкале, сводке по странам и проверкам хватает этих флагов — их
 * собирает плагин сборки по тем же Markdown-файлам (запрос `?summary`),
 * поэтому сводка не может разойтись с полными данными.
 */
const modules = import.meta.glob<ContentSummary & { id: string }>('../../content/*/*/*.md', {
  eager: true,
  query: '?summary',
  import: 'summary',
});

export const contentSummaryById: Record<string, ContentSummary> = Object.fromEntries(
  Object.values(modules).map(({ id, ...summary }) => [id, summary]),
);

/** Сводка файлов связей (content/relations/<id>.md): проверены ли источники. */
const relationModules = import.meta.glob<ContentSummary & { id: string }>('../../content/relations/*.md', {
  eager: true,
  query: '?summary',
  import: 'summary',
});

export const relationSummaryById: Record<string, ContentSummary> = Object.fromEntries(
  Object.values(relationModules).map(({ id, ...summary }) => [id, summary]),
);
