import { useEffect, useRef, useState } from 'react';
import type { TimelineItem } from '../../types';
import { resolveWikiLinks } from '../../lib/markdown';
import { MarkdownView } from './MarkdownView';

type Props = {
  itemId: string;
  value: string;
  onChange: (itemId: string, note: string) => void;
  /** Нужен, чтобы ссылки [[id]] работали и в заметке, как в статье. */
  resolveItem: (id: string) => TimelineItem | undefined;
  onOpenItem?: (id: string) => void;
};

type Tool = {
  label: string;
  title: string;
  /** Что вставить вокруг выделения или на месте курсора. */
  apply: (selection: string) => { text: string; caret: number };
};

/**
 * Инструменты работы с Markdown прямо в окне.
 *
 * Набор намеренно небольшой и описан данными: добавить кнопку — значит
 * добавить запись в этот массив. Ничего специфичного для заметок здесь нет,
 * поэтому тот же редактор подойдёт и для правки статьи объекта,
 * когда появится режим редактирования базы.
 */
const tools: Tool[] = [
  { label: 'Ж', title: 'Полужирный', apply: (s) => ({ text: `**${s || 'текст'}**`, caret: 2 }) },
  { label: 'К', title: 'Курсив', apply: (s) => ({ text: `*${s || 'текст'}*`, caret: 1 }) },
  { label: 'H', title: 'Заголовок', apply: (s) => ({ text: `## ${s || 'Заголовок'}`, caret: 3 }) },
  { label: '•', title: 'Список', apply: (s) => ({ text: `- ${s || 'пункт'}`, caret: 2 }) },
  { label: '”', title: 'Цитата', apply: (s) => ({ text: `> ${s || 'цитата'}`, caret: 2 }) },
  {
    label: '[[ ]]',
    title: 'Ссылка на другой объект шкалы',
    apply: (s) => ({ text: `[[${s || 'id-объекта'}]]`, caret: 2 }),
  },
  {
    label: '$',
    title: 'Формула',
    apply: (s) => ({ text: `$${s || 'E = mc^2'}$`, caret: 1 }),
  },
];

/**
 * Личная заметка к объекту хронологии.
 *
 * Заметки хранятся отдельно от базы фактов и никогда с ней не смешиваются:
 * это пометки читателя, а не проверенные сведения. Поддерживается тот же
 * Markdown, что и в статьях, включая ссылки [[id]] и формулы.
 */
export function NoteEditor({ itemId, value, onChange, resolveItem, onOpenItem }: Props) {
  const [draft, setDraft] = useState(value);
  const [mode, setMode] = useState<'edit' | 'preview'>(value ? 'preview' : 'edit');
  const [open, setOpen] = useState(Boolean(value));
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Переключение на другой объект — подтягиваем его заметку.
  useEffect(() => {
    setDraft(value);
    setMode(value ? 'preview' : 'edit');
    setOpen(Boolean(value));
  }, [itemId, value]);

  const commit = (next: string) => {
    setDraft(next);
    onChange(itemId, next);
  };

  const applyTool = (tool: Tool) => {
    const area = areaRef.current;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selection = draft.slice(start, end);
    const { text, caret } = tool.apply(selection);
    const next = draft.slice(0, start) + text + draft.slice(end);

    commit(next);
    // Возвращаем курсор внутрь вставленной конструкции.
    requestAnimationFrame(() => {
      area.focus();
      const position = selection ? start + text.length : start + caret;
      area.setSelectionRange(position, selection ? position : position + (selection ? 0 : 0));
    });
  };

  if (!open) {
    return (
      <section className="note note--collapsed">
        <button type="button" className="note__add" onClick={() => setOpen(true)}>
          <span aria-hidden="true">✎</span>
          Добавить свою заметку
        </button>
      </section>
    );
  }

  return (
    <section className="note">
      <header className="note__head">
        <h3 className="note__title">
          Моя заметка
          <span className="note__hint">хранится только в этом браузере, в базу не попадает</span>
        </h3>

        <div className="note__modes">
          <button
            type="button"
            className="note__mode"
            data-active={mode === 'edit' || undefined}
            onClick={() => setMode('edit')}
          >
            Правка
          </button>
          <button
            type="button"
            className="note__mode"
            data-active={mode === 'preview' || undefined}
            onClick={() => setMode('preview')}
            disabled={!draft.trim()}
          >
            Просмотр
          </button>
        </div>
      </header>

      {mode === 'edit' ? (
        <>
          <div className="note__toolbar" role="toolbar" aria-label="Инструменты Markdown">
            {tools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                className="note__tool"
                title={tool.title}
                onClick={() => applyTool(tool)}
              >
                {tool.label}
              </button>
            ))}
          </div>

          <textarea
            ref={areaRef}
            className="note__area"
            value={draft}
            rows={5}
            placeholder="Что вы хотите запомнить об этом событии? Поддерживается Markdown: **жирный**, списки, цитаты, [[ссылки]] на другие объекты, формулы."
            onChange={(event) => commit(event.target.value)}
          />
        </>
      ) : (
        <div className="note__preview md">
          <MarkdownView onOpenItem={onOpenItem}>
            {resolveWikiLinks(draft, resolveItem)}
          </MarkdownView>
        </div>
      )}

      {draft.trim() ? (
        <footer className="note__foot">
          <button
            type="button"
            className="note__clear"
            onClick={() => {
              commit('');
              setMode('edit');
              setOpen(false);
            }}
          >
            Удалить заметку
          </button>
        </footer>
      ) : null}
    </section>
  );
}
