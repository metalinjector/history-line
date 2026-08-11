import type { SourceLink, Viewpoint } from '../types';

/**
 * Редакционное наполнение базы: статьи, источники и трактовки.
 *
 * Всё это лежит не в коде, а в обычных Markdown-файлах — по одному на объект:
 * `content/items/<страна>/<id>.md` для основной базы и
 * `content/layers/<слой>/<id>.md` для объектов слоёв. В шапке файла
 * (front-matter) записаны источники и, если нужно, расхождения в трактовках;
 * ниже — статья для модального окна. Статья необязательна: файл только
 * с источниками совершенно нормален.
 *
 * Такой формат выбран ради тех, кто наполняет базу: добавить факт — значит
 * создать один текстовый файл, а не править TypeScript. Правила наполнения —
 * в docs/AI-CONTRIBUTING.md.
 */
type ContentModule = {
  meta: { id?: string; sources?: SourceLink[]; viewpoints?: Viewpoint[] };
  body: string;
};

// Front-matter разбирает плагин сборки (plugins/markdownContent.ts),
// поэтому в бандл попадают уже готовые объекты, а не YAML-парсер.
// Один шаблон покрывает и content/items/<страна>/, и content/layers/<слой>/:
// идентификаторы объектов уникальны на весь проект, поэтому справочники общие.
const modules = import.meta.glob<ContentModule>('../../content/*/*/*.md', { eager: true });

const collected = Object.entries(modules).map(([path, module]) => {
  const id = module.meta.id ?? path.split('/').pop()!.replace(/\.md$/, '');
  return { id, ...module };
});

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
