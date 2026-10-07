import { load } from 'js-yaml';
import type { Plugin } from 'vite';

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
 */
export function markdownContent(): Plugin {
  return {
    name: 'history-line:markdown-content',
    enforce: 'pre',

    transform(code, id) {
      const [file] = id.split('?');
      if (!file.endsWith('.md')) return null;

      const { meta, body } = parseMarkdownModule(code);

      return {
        code: [`export const meta = ${JSON.stringify(meta)};`, `export const body = ${JSON.stringify(body)};`].join(
          '\n',
        ),
        map: null,
      };
    },
  };
}
