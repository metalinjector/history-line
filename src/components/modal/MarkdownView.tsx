import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidBlock } from './MermaidBlock';

import 'katex/dist/katex.min.css';

type Props = {
  children: string;
};

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
export function MarkdownView({ children }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
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
        // Внешние ссылки открываются в новой вкладке и не передают реферер.
        a(props: ComponentProps<'a'>) {
          const external = props.href?.startsWith('http');
          return external ? (
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
