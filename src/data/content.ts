import type { Relation, SourceLink, TimelineItem, Viewpoint } from '../types';

/**
 * ⚠ КАРКАС — docs/CORE.md, раздел 3. Статически этот модуль импортирует
 * только components/modal/ModalHost.tsx, остальные — через import().
 * Лишний статический импорт вернёт сотни килобайт в первый экран;
 * src/contracts.test.ts это ловит.
 *
 * Полные тексты базы: развёрнутые описания и параллели, статьи, источники,
 * трактовки и объяснения связей. На шкале — витрина: заголовок, дата, одна
 * фраза (src/data/items/). Всё, что читают, «провалившись» в объект, — здесь.
 *
 * Всё это лежит не в коде, а в обычных Markdown-файлах — по одному на объект:
 * `content/items/<страна>/<id>.md` для основной базы и
 * `content/layers/<слой>/<id>.md` для объектов слоёв. В шапке файла
 * (front-matter) записаны развёрнутое описание (`detail`), параллель
 * (`parallel`), источники и, если нужно, расхождения в трактовках; ниже —
 * статья для модального окна. Статья необязательна. Связи лежат так же:
 * `content/relations/<id>.md` — источники в шапке, объяснение ниже.
 *
 * Такой формат выбран ради тех, кто наполняет базу: добавить факт — значит
 * создать один текстовый файл, а не править TypeScript. Правила наполнения —
 * в docs/AI-CONTRIBUTING.md.
 *
 * Модуль тяжёлый и в основной бандл не входит: его подгружают модальное окно
 * и экспорт (динамическим import). Шкале хватает сводки — data/contentSummary.ts.
 */
type ContentModule = {
  meta: { id?: string; detail?: string; parallel?: string; sources?: SourceLink[]; viewpoints?: Viewpoint[] };
  body: string;
};

// Front-matter разбирает плагин сборки (plugins/markdownContent.ts),
// поэтому в бандл попадают уже готовые объекты, а не YAML-парсер.
// Один шаблон покрывает и content/items/<страна>/, и content/layers/<слой>/:
// идентификаторы объектов уникальны на весь проект, поэтому справочники общие.
const modules = import.meta.glob<ContentModule>('../../content/*/*/*.md', { eager: true });

const collected = Object.entries(modules).map(([path, module]) => {
  const filenameId = path.split('/').pop()!.replace(/\.md$/, '');
  const declaredId = module.meta.id;
  const id = declaredId ?? filenameId;
  return { path, filenameId, declaredId, id, ...module };
});

/** Метаданные всех Markdown-файлов для тестов целостности редакционной базы. */
export const contentManifest = collected.map(({ path, filenameId, declaredId, id }) => ({
  path,
  filenameId,
  declaredId,
  id,
}));

const textField = (field: 'detail' | 'parallel') =>
  Object.fromEntries(
    collected.filter((entry) => entry.meta[field]?.trim()).map((entry) => [entry.id, entry.meta[field]!.trim()]),
  ) as Record<string, string>;

/** Развёрнутые описания — 2–4 предложения, которые раньше жили в карточке. */
export const detailByItem = textField('detail');

/** Параллели: что в это же время происходило в других странах. */
export const parallelByItem = textField('parallel');

/**
 * Полный текст для поиска по шкале: описание и параллель. Поиск подгружает
 * его по первому запросу, до тех пор ищет по витрине — заголовку и фразе.
 */
export const searchTextById: Record<string, string> = Object.fromEntries(
  collected
    .filter((entry) => entry.meta.detail || entry.meta.parallel)
    .map((entry) => [entry.id, [entry.meta.detail ?? '', entry.meta.parallel ?? ''].join(' ')]),
);

/** Развёрнутые статьи в Markdown. Ключ — идентификатор объекта хронологии. */
export const articles: Record<string, string> = Object.fromEntries(
  collected.filter((entry) => entry.body).map((entry) => [entry.id, entry.body]),
);

/**
 * Источники по объектам. Правило базы — минимум два независимых источника,
 * из которых хотя бы один не энциклопедия.
 */
export const sourcesByItem: Record<string, SourceLink[]> = Object.fromEntries(
  collected.filter((entry) => entry.meta.sources?.length).map((entry) => [entry.id, entry.meta.sources!]),
);

/**
 * Расхождения в трактовках.
 *
 * Правило: сюда попадает только то, где расходятся **оценки** устоявшихся
 * историографических традиций, а сам факт не оспаривается. Каждая трактовка
 * обязательно подписана: чья это позиция. Мы не выбираем «правильную».
 *
 * Если расходятся сами факты (дата, число, авторство), это не трактовка —
 * такой объект вообще не добавляется в базу до выяснения. См. docs/AI-CONTRIBUTING.md.
 */
export const viewpointsByItem: Record<string, Viewpoint[]> = Object.fromEntries(
  collected
    .filter((entry) => entry.meta.viewpoints?.length)
    .map((entry) => [entry.id, entry.meta.viewpoints!]),
);

/**
 * Объект вместе со статьёй, источниками и трактовками из редакционной базы.
 * Объекты пользователя и всё, чего нет в базе, возвращаются как есть.
 */
export function withContent(item: TimelineItem): TimelineItem {
  const detail = detailByItem[item.id];
  const parallel = parallelByItem[item.id];
  const body = articles[item.id];
  const sources = sourcesByItem[item.id];
  const viewpoints = viewpointsByItem[item.id];
  if (!detail && !parallel && !body && !sources && !viewpoints) return item;
  return {
    ...item,
    ...(detail ? { detail } : {}),
    ...(parallel ? { parallel } : {}),
    ...(body ? { body } : {}),
    ...(sources ? { sources } : {}),
    ...(viewpoints ? { viewpoints } : {}),
  };
}

// Связи: content/relations/<id>.md — своя папка без подпапок, поэтому шаблон
// объектов выше (content/*/*/*.md) их не захватывает.
const relationModules = import.meta.glob<ContentModule>('../../content/relations/*.md', { eager: true });

const relationEntries = Object.entries(relationModules).map(([path, module]) => {
  const filenameId = path.split('/').pop()!.replace(/\.md$/, '');
  return { path, filenameId, declaredId: module.meta.id, id: module.meta.id ?? filenameId, ...module };
});

/** Метаданные файлов связей для тестов целостности. */
export const relationContentManifest = relationEntries.map(({ path, filenameId, declaredId, id }) => ({
  path,
  filenameId,
  declaredId,
  id,
}));

const relationContentById = new Map(relationEntries.map((entry) => [entry.id, entry]));

/**
 * Связь вместе с объяснением и источниками из её файла. Связи читателя
 * хранят всё в себе и возвращаются как есть.
 */
export function withRelationContent(relation: Relation): Relation {
  const entry = relationContentById.get(relation.id);
  if (!entry || relation.detail !== undefined) return relation;
  return {
    ...relation,
    detail: entry.body,
    ...(entry.meta.sources?.length ? { sources: entry.meta.sources } : {}),
  };
}
