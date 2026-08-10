import { useEffect, useMemo, useRef } from 'react';
import type { Country, Era, Relation, TimelineItem } from '../../types';
import { countryById } from '../../data/countries';
import { formatItemDate } from '../../lib/format';
import { itemToMarkdown, resolveWikiLinks } from '../../lib/markdown';
import { Modal, ModalClose } from './Modal';
import { MarkdownView } from './MarkdownView';
import { Viewpoints } from './Viewpoints';
import { NoteEditor } from './NoteEditor';
import { hasVerifiedSources, isRelationVerified } from '../../lib/provenance';
import type { Contemporary } from '../../lib/contemporaries';

type Props = {
  item: TimelineItem;
  country: Country;
  era?: Era;
  previous?: TimelineItem;
  next?: TimelineItem;
  /** Связи этого объекта с другими — показываются списком под статьёй. */
  relations: Relation[];
  /** Автоматически найденные события других стран рядом по времени. */
  contemporaries: Contemporary[];
  /** Разрешение идентификатора в объект — нужно, чтобы подписать вторую сторону связи. */
  resolveItem: (id: string) => TimelineItem | undefined;
  /** Год, из окна которого сюда пришли, — для кнопки возврата. */
  backToDay?: { key: string; label: string };
  onNavigate: (item: TimelineItem) => void;
  /** Переход по внутренней ссылке из текста статьи. */
  onOpenLink: (id: string) => void;
  /** Личная заметка читателя к этому объекту. */
  note: string;
  onNoteChange: (itemId: string, note: string) => void;
  onOpenRelation: (relation: Relation) => void;
  onBackToDay: (key: string) => void;
  onClose: () => void;
  onTagClick: (tag: string) => void;
};

export function ItemModal({
  item,
  country,
  era,
  previous,
  next,
  relations,
  contemporaries,
  resolveItem,
  backToDay,
  onNavigate,
  onOpenLink,
  note,
  onNoteChange,
  onOpenRelation,
  onBackToDay,
  onClose,
  onTagClick,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  // Ссылки [[id]] превращаются в переходы к другим объектам шкалы.
  const markdown = useMemo(
    () => resolveWikiLinks(itemToMarkdown(item, country, era), resolveItem),
    [item, country, era, resolveItem],
  );

  // При переходе к соседнему объекту читатель должен оказаться в начале текста.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [item.id]);

  return (
    <Modal
      accent={`hsl(${country.color})`}
      accentInk={`hsl(${country.colorInk})`}
      labelledBy="modal-title"
      onClose={onClose}
    >
      <header className="modal__head">
        <div className="modal__meta">
          {backToDay ? (
            <button
              type="button"
              className="modal__back"
              onClick={() => onBackToDay(backToDay.key)}
              title={`Вернуться к списку событий ${backToDay.label} года`}
            >
              <span aria-hidden="true">←</span> {backToDay.label}
            </button>
          ) : null}
          <span className="modal__country">
            <span className="modal__dot" aria-hidden="true" />
            {country.label}
          </span>
          <span className="modal__kind">{item.kind === 'event' ? '◆ Событие' : '✦ Деятель'}</span>
          {(item.importance ?? 2) >= 3 ? <span className="modal__seal">★ веха</span> : null}
          {item.viewpoints && item.viewpoints.length > 1 ? (
            <span className="modal__disputed" title="У факта есть несколько устоявшихся трактовок">
              ⚖ трактовки расходятся
            </span>
          ) : null}
          {item.custom ? <span className="modal__kind">добавлено вами</span> : null}
          <span
            className="modal__provenance"
            data-verified={hasVerifiedSources(item.sources) || undefined}
            title={
              hasVerifiedSources(item.sources)
                ? 'Не менее двух источников, включая неэнциклопедический'
                : 'Для этой записи ещё не опубликован полный комплект источников'
            }
          >
            {hasVerifiedSources(item.sources) ? '✓ источники проверены' : '△ источники не опубликованы'}
          </span>
        </div>
        <ModalClose />
      </header>

      <div className="modal__title-block">
        <p className="modal__date">
          {formatItemDate(item)}
          {item.endYear && item.endYear !== item.year ? (
            <span className="modal__life">период до {item.endYear}</span>
          ) : null}
          {item.life ? <span className="modal__life">Годы жизни: {item.life}</span> : null}
        </p>
        <h2 className="modal__title" id="modal-title">
          {item.title}
        </h2>
      </div>

      <div className="modal__body md" ref={bodyRef}>
        <MarkdownView onOpenItem={onOpenLink}>{markdown}</MarkdownView>

        <Viewpoints
          viewpoints={item.viewpoints}
          sources={item.sources}
          onOpenItem={onOpenLink}
        />

        {contemporaries.length > 0 ? (
          <section className="contemporaries">
            <div className="contemporaries__head">
              <h3>В это же время</h3>
              <span>автоматический контекст по другим странам</span>
            </div>
            <ul>
              {contemporaries.map(({ item: contemporary, exactYear, distanceYears }) => {
                const otherCountry = countryById[contemporary.country];
                const later = contemporary.year > item.year;
                return (
                  <li key={contemporary.id}>
                    <button type="button" onClick={() => onNavigate(contemporary)}>
                      <span
                        className="contemporaries__dot"
                        style={{ '--c': `hsl(${otherCountry.color})` } as React.CSSProperties}
                        aria-hidden="true"
                      />
                      <span className="contemporaries__text">
                        <b>{contemporary.title}</b>
                        <small>{otherCountry.label} · {contemporary.year}</small>
                      </span>
                      <span className="contemporaries__distance">
                        {exactYear ? 'тот же год' : `${distanceYears} г. ${later ? 'позже' : 'раньше'}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <NoteEditor
          itemId={item.id}
          value={note}
          onChange={onNoteChange}
          resolveItem={resolveItem}
          onOpenItem={onOpenLink}
        />

        {relations.length > 0 ? (
          <section className="modal__relations">
            <h3>Связи с другими линиями</h3>
            <ul>
              {relations.map((relation) => {
                const isSource = relation.from === item.id;
                const other = resolveItem(isSource ? relation.to : relation.from);
                const otherCountry = other ? countryById[other.country] : undefined;

                return (
                  <li key={relation.id}>
                    <button
                      type="button"
                      className="modal__relation"
                      data-kind={relation.kind}
                      data-verification={isRelationVerified(relation) ? 'verified' : 'draft'}
                      onClick={() => onOpenRelation(relation)}
                    >
                      <span className="modal__relation-arrow" aria-hidden="true">
                        {isSource ? '→' : '←'}
                      </span>
                      <span>
                        <b>{relation.label}</b>
                        <span className="modal__relation-hint">
                          {isSource ? 'это событие повлияло на' : 'повлияло на это событие'}
                          {other ? ` · ${other.title}` : ''}
                          {otherCountry ? ` (${otherCountry.label})` : ''}
                          {!isRelationVerified(relation) ? ' · черновая связь' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="modal__foot">
        {item.tags.length > 0 ? (
          <div className="modal__tags">
            {item.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag tag--button"
                onClick={(event) => {
                  onTagClick(tag);
                  event.currentTarget.closest('dialog')?.close();
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
    </Modal>
  );
}
