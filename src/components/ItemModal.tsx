import { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Country, Era, TimelineItem } from '../types';
import { formatItemDate } from '../lib/format';
import { itemToMarkdown } from '../lib/markdown';
import './ItemModal.css';

type Props = {
  item: TimelineItem;
  country: Country;
  era?: Era;
  previous?: TimelineItem;
  next?: TimelineItem;
  onNavigate: (item: TimelineItem) => void;
  onClose: () => void;
  onTagClick: (tag: string) => void;
};

/**
 * Полный текст объекта в модальном окне.
 *
 * Используется нативный <dialog>: он сам забирает фокус, запирает его внутри,
 * закрывается по Esc и рисует затемнение через ::backdrop — это и надёжнее,
 * и доступнее самодельной реализации.
 */
export default function ItemModal({
  item,
  country,
  era,
  previous,
  next,
  onNavigate,
  onClose,
  onTagClick,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const markdown = useMemo(() => itemToMarkdown(item, country, era), [item, country, era]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // При переходе к соседнему объекту читатель должен оказаться в начале текста.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [item.id]);

  return (
    <dialog
      className="modal"
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // Клик по подложке: цель — сам dialog, а не его содержимое.
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      style={
        {
          '--c': `hsl(${country.color})`,
          '--c-ink': `hsl(${country.colorInk})`,
        } as React.CSSProperties
      }
      aria-labelledby="modal-title"
    >
      <div className="modal__panel">
        <span className="modal__bar" aria-hidden="true" />

        <header className="modal__head">
          <div className="modal__meta">
            <span className="modal__country">
              <span className="modal__dot" aria-hidden="true" />
              {country.label}
            </span>
            <span className="modal__kind">{item.kind === 'event' ? '◆ Событие' : '✦ Деятель'}</span>
            {(item.importance ?? 2) >= 3 ? <span className="modal__seal">★ веха</span> : null}
            {item.custom ? <span className="modal__kind">добавлено вами</span> : null}
          </div>

          <button
            type="button"
            className="modal__close"
            onClick={() => dialogRef.current?.close()}
            title="Закрыть (Esc)"
          >
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Закрыть</span>
          </button>
        </header>

        <div className="modal__title-block">
          <p className="modal__date">
            {formatItemDate(item)}
            {item.life ? <span className="modal__life">Годы жизни: {item.life}</span> : null}
          </p>
          <h2 className="modal__title" id="modal-title">
            {item.title}
          </h2>
        </div>

        <div className="modal__body md" ref={bodyRef}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>

        <footer className="modal__foot">
          {item.tags.length > 0 ? (
            <div className="modal__tags">
              {item.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="tag tag--button"
                  onClick={() => {
                    onTagClick(tag);
                    dialogRef.current?.close();
                  }}
                  title={`Показать всё по теме «${tag}»`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          <nav className="modal__nav" aria-label={`Соседние объекты линии «${country.label}»`}>
            <button
              type="button"
              className="modal__nav-btn"
              disabled={!previous}
              onClick={() => previous && onNavigate(previous)}
            >
              <span aria-hidden="true">↑</span>
              <span className="modal__nav-text">
                {previous ? `${previous.year} · ${previous.title}` : 'Раньше ничего нет'}
              </span>
            </button>
            <button
              type="button"
              className="modal__nav-btn"
              disabled={!next}
              onClick={() => next && onNavigate(next)}
            >
              <span aria-hidden="true">↓</span>
              <span className="modal__nav-text">
                {next ? `${next.year} · ${next.title}` : 'Позже ничего нет'}
              </span>
            </button>
          </nav>
        </footer>
      </div>
    </dialog>
  );
}
