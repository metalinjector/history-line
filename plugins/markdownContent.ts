import matter from 'gray-matter';
import type { Plugin } from 'vite';

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

      const { data, content } = matter(code);

      return {
        code: [
          `export const meta = ${JSON.stringify(data)};`,
          `export const body = ${JSON.stringify(content.trim())};`,
        ].join('\n'),
        map: null,
      };
    },
  };
}
