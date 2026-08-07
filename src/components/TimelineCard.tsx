import { memo } from 'react';
import type { Country, TimelineItem } from '../types';
import { formatItemDate } from '../lib/format';
import { Highlight } from './Highlight';

type Props = {
  item: TimelineItem;
  country: Country;
  selected: boolean;
  query: string;
  onSelect: (item: TimelineItem) => void;
};

/**
 * Карточка события или деятеля.
 *
 * Тип объекта показан не только цветом, но и подписью со значком —
 * иначе интерфейс был бы недоступен при дальтонизме.
 */
export const TimelineCard = memo(function TimelineCard({
  item,
  country,
  selected,
  query,
  onSelect,
}: Props) {
  const isKey = (item.importance ?? 2) >= 3;

  return (
    <button
      type="button"
      className="tcard"
      data-kind={item.kind}
      data-key-event={isKey || undefined}
      data-selected={selected || undefined}
      data-custom={item.custom || undefined}
      id={`item-${item.id}`}
      aria-pressed={selected}
      aria-label={`${country.label}, ${formatItemDate(item)}. ${
        item.kind === 'event' ? 'Событие' : 'Деятель'
      }: ${item.title}`}
      onClick={() => onSelect(item)}
    >
      <span className="tcard__node" aria-hidden="true" />

      <span className="tcard__top">
        <span className="tcard__kind">
          <span className="tcard__glyph" aria-hidden="true">
            {item.kind === 'event' ? '◆' : '✦'}
          </span>
          {item.kind === 'event' ? 'Событие' : 'Деятель'}
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

      {isKey ? (
        <span className="tcard__seal" title="Опорная веха эпохи">
          <span aria-hidden="true">★</span>
          <span className="visually-hidden">Опорная веха эпохи</span>
        </span>
      ) : null}

      {item.custom ? <span className="tcard__badge">добавлено вами</span> : null}
    </button>
  );
});
