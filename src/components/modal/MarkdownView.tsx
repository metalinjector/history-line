import type { ComponentProps } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidBlock } from './MermaidBlock';

import 'katex/dist/katex.min.css';

type Props = {
  children: string;
  /** Переход по внутренней ссылке вида [[id]] на другой объект шкалы. */
  onOpenItem?: (id: string) => void;
};

const ITEM_LINK_PROTOCOL = 'item:';

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: false }]] as never;

/**
 * Единая отрисовка Markdown для всех модальных окон.
 *
 * Поддерживаются:
 * — базовый Markdown и расширения GFM: таблицы, зачёркивание, списки задач;
 * — формулы TeX через KaTeX: $...$ внутри строки и $$...$$ отдельным блоком;
 * — диаграммы Mermaid в блоках ```mermaid — библиотека грузится по требованию.
 */
export function MarkdownView({ children, onOpenItem }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      // react-markdown вырезает ссылки с неизвестной схемой, поэтому
      // внутренний протокол item: нужно пропустить явно.
      urlTransform={(url) =>
        url.startsWith(ITEM_LINK_PROTOCOL) ? url : defaultUrlTransform(url)
      }
      components={{
        code(props: ComponentProps<'code'> & { node?: unknown }) {
          const { className, children: code, ...rest } = props;
          const language = /language-(\w+)/.exec(className ?? '')?.[1];

          if (language === 'mermaid') {
            return <MermaidBlock code={String(code)} />;
          }

          return (
            <code className={className} {...rest}>
              {code}
            </code>
          );
        },
        a(props: ComponentProps<'a'>) {
          const href = props.href ?? '';

          // Внутренняя ссылка на другой объект шкалы — открывает его статью.
          if (href.startsWith(ITEM_LINK_PROTOCOL)) {
            const id = href.slice(ITEM_LINK_PROTOCOL.length);
            return (
              <button
                type="button"
                className="md-link"
                onClick={() => onOpenItem?.(id)}
                title="Открыть связанный объект хронологии"
              >
                <span className="md-link__icon" aria-hidden="true">
                  ↗
                </span>
                {props.children}
              </button>
            );
          }

          // Внешние ссылки открываются в новой вкладке и не передают реферер.
          return href.startsWith('http') ? (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ) : (
            <a {...props} />
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
