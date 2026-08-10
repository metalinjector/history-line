import type { TimelineGroup, TimelineItem } from '../../types';
import { countryById } from '../../data/countries';
import { formatItemDate, plural } from '../../lib/format';
import { Modal, ModalClose } from './Modal';

type Props = {
  group: TimelineGroup;
  onOpenItem: (item: TimelineItem) => void;
  onClose: () => void;
};

/**
 * Окно одной даты: показывает все события этого года сразу,
 * сгруппированные по странам. Открывается из кружка в колонке дат,
 * когда в одном году сошлись линии нескольких стран.
 */
export function DayModal({ group, onOpenItem, onClose }: Props) {
  const countries = Array.from(new Set(group.items.map((item) => item.country)));

  return (
    <Modal labelledBy="day-modal-title" onClose={onClose}>
      <header className="modal__head">
        <div className="modal__meta">
          <span className="modal__kind">Одна дата · несколько стран</span>
          <span className="modal__kind">
            {countries.length} {plural(countries.length, ['страна', 'страны', 'стран'])}
          </span>
        </div>
        <ModalClose />
      </header>

      <div className="modal__title-block">
        <p className="modal__date">{group.era.label}</p>
        <h2 className="modal__title" id="day-modal-title">
          {group.label}
          <span className="day__count">
            {group.items.length} {plural(group.items.length, ['событие', 'события', 'событий'])}
          </span>
        </h2>
      </div>

      <div className="modal__body">
        <p className="day__lede">
          В этот год линии нескольких стран сошлись в одной строке. Нажмите на любую карточку,
          чтобы открыть полный текст.
        </p>

        <ul className="day__list">
          {group.items.map((item) => {
            const country = countryById[item.country];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="day__item"
                  style={
                    {
                      '--c': `hsl(${country.color})`,
                      '--c-ink': `hsl(${country.colorInk})`,
                    } as React.CSSProperties
                  }
                  onClick={() => onOpenItem(item)}
                >
                  <span className="day__item-top">
                    <span className="day__item-country">
                      <span className="day__item-dot" aria-hidden="true" />
                      {country.label}
                    </span>
                    <span className="day__item-date">{formatItemDate(item)}</span>
                  </span>
                  <span className="day__item-title">
                    {item.kind === 'event' ? '◆' : '✦'} {item.title}
                  </span>
                  <span className="day__item-summary">{item.summary}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
