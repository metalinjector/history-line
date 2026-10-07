import { load } from 'js-yaml';
import type { Plugin } from 'vite';
import { hasVerifiedSources } from '../src/lib/sourceRule.ts';
import type { ContentSummary, SourceLink, Viewpoint } from '../src/types.ts';

/**
 * Шапка файла: `---`, YAML, `---` — с самой первой строки. Пустая шапка
 * (`---` сразу за `---`) тоже допустима.
 */
const FRONT_MATTER = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export type MarkdownModule = {
  meta: Record<string, unknown>;
  body: string;
};

/** Делит Markdown-файл на YAML-шапку и статью. */
export function parseMarkdownModule(source: string): MarkdownModule {
  const match = FRONT_MATTER.exec(source);
  if (!match) return { meta: {}, body: source.trim() };

  const parsed = match[1] ? load(match[1]) : undefined;
  return {
    meta: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {},
    body: source.slice(match[0].length).trim(),
  };
}

/**
 * Что из файла нужно шкале, сводке и фильтрам — без самих текстов.
 * Пустые поля опускаются: сводок столько же, сколько объектов в базе.
 */
export function summarizeMarkdownModule({ meta, body }: MarkdownModule): ContentSummary {
  const viewpoints = Array.isArray(meta.viewpoints) ? (meta.viewpoints as Viewpoint[]).length : 0;
  return {
    ...(body ? { article: true } : {}),
    ...(hasVerifiedSources(meta.sources as SourceLink[] | undefined) ? { verified: true } : {}),
    ...(viewpoints ? { viewpoints } : {}),
  };
}

/**
 * ⚠ КАРКАС — docs/CORE.md, разделы 3 и 5. Этот файл загружает конфиг Vite:
 * из src/ импортируются только модули без собственных импортов, с `.ts`.
 *
 * Превращает `content/**\/*.md` в обычный ES-модуль.
 *
 * Front-matter разбирается здесь, на этапе сборки, поэтому YAML-парсер
 * остаётся devDependency и не попадает в бандл. Модуль отдаёт ровно ту форму,
 * которую ждёт `src/data/content.ts`:
 *
 * ```ts
 * export const meta = { id, sources, viewpoints };
 * export const body = 'markdown…';
 * ```
 *
 * С запросом `?summary` тот же файл превращается в короткую сводку
 * для `src/data/contentSummary.ts` — она нужна сразу, а полные тексты
 * грузятся вместе с модальным окном:
 *
 * ```ts
 * export const summary = { id, article, verified, viewpoints };
 * ```
 */
export function markdownContent(): Plugin {
  return {
    name: 'history-line:markdown-content',
    enforce: 'pre',

    transform(code, id) {
      const [file, query] = id.split('?');
      if (!file.endsWith('.md')) return null;

      const parsed = parseMarkdownModule(code);

      if (query === 'summary') {
        const filenameId = file.split('/').pop()!.replace(/\.md$/, '');
        const summary = { id: parsed.meta.id ?? filenameId, ...summarizeMarkdownModule(parsed) };
        return { code: `export const summary = ${JSON.stringify(summary)};`, map: null };
      }

      return {
        code: [
          `export const meta = ${JSON.stringify(parsed.meta)};`,
          `export const body = ${JSON.stringify(parsed.body)};`,
        ].join('\n'),
        map: null,
      };
    },
  };
}
