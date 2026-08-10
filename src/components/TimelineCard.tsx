import { memo } from 'react';
import type { TimelineItem, Track } from '../types';
import { formatItemDate } from '../lib/format';
import { Highlight } from './Highlight';

type Props = {
  item: TimelineItem;
  /** Дорожка, на которой стоит карточка: страна или слой. */
  track: Track;
  selected: boolean;
  query: string;
  /** Индекс страны внутри колонки и общее число стран в ней — задают положение узла на шкале. */
  railIndex: number;
  railCount: number;
  /** Колонку делят несколько стран, поэтому нужен бейдж страны. */
  shared: boolean;
  onSelect: (item: TimelineItem) => void;
  onOpen: (item: TimelineItem) => void;
};

/**
 * Карточка события или деятеля.
 *
 * Тип объекта показан не только цветом, но и подписью со значком и формой узла —
 * иначе интерфейс был бы недоступен при дальтонизме.
 * Значок в правом верхнем углу открывает полный текст в модальном окне.
 */
export const TimelineCard = memo(function TimelineCard({
  item,
  track,
  selected,
  query,
  railIndex,
  railCount,
  shared,
  onSelect,
  onOpen,
}: Props) {
  const isKey = (item.importance ?? 2) >= 3;

  return (
    <div
      className="tcard"
      data-kind={item.kind}
      data-key-event={isKey || undefined}
      data-selected={selected || undefined}
      data-custom={item.custom || undefined}
      data-layer={item.layerId || undefined}
      id={`item-${item.id}`}
      style={
        {
          '--rail-i': railIndex,
          '--rail-n': railCount,
          '--c': `hsl(${track.color})`,
          '--c-ink': `hsl(${track.colorInk})`,
        } as React.CSSProperties
      }
    >
      <span className="tcard__node" aria-hidden="true" />

      <button
        type="button"
        className="tcard__hit"
        aria-pressed={selected}
        aria-label={`${track.label}, ${formatItemDate(item)}. ${
          item.kind === 'event' ? 'Событие' : 'Деятель'
        }: ${item.title}. ${item.summary}`}
        onClick={() => onSelect(item)}
      >
        <span className="tcard__top">
          <span className="tcard__kind">
            <span className="tcard__glyph" aria-hidden="true">
              {item.kind === 'event' ? '◆' : '✦'}
            </span>
            {shared || track.kind === 'layer'
              ? track.short
              : item.kind === 'event'
                ? 'Событие'
                : 'Деятель'}
          </span>
          <span className="tcard__date">{formatItemDate(item)}</span>
        </span>

        <span className="tcard__title">
          <Highlight text={item.title} query={query} />
        </span>

        <span className="tcard__summary">
          <Highlight text={item.summary} query={query} />
        </span>

        {item.life ? <span className="tcard__life">{item.life}</span> : null}
      </button>

      <button
        type="button"
        className="tcard__open"
        onClick={() => onOpen(item)}
        title={`Открыть полный текст: ${item.title}`}
      >
        <span aria-hidden="true">¶</span>
        <span className="visually-hidden">Открыть полный текст: {item.title}</span>
      </button>

      {(item.viewpoints?.length ?? 0) > 1 ? (
        <span className="tcard__disputed" title="Трактовки расходятся — см. полный текст">
          <span aria-hidden="true">⚖</span>
          <span className="visually-hidden">Есть несколько устоявшихся трактовок</span>
        </span>
      ) : null}

      {isKey ? (
        <span className="tcard__seal" title="Опорная веха эпохи">
          <span aria-hidden="true">★</span>
          <span className="visually-hidden">Опорная веха эпохи</span>
        </span>
      ) : null}

      {item.custom ? <span className="tcard__badge">добавлено вами</span> : null}
    </div>
  );
});
