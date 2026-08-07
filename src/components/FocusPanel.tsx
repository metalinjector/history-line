import { AnimatePresence, motion } from 'framer-motion';
import type { Country, Era, TimelineItem } from '../types';
import { formatItemDate } from '../lib/format';
import './FocusPanel.css';

type Props = {
  item?: TimelineItem;
  country?: Country;
  era?: Era;
  /** Соседи по этой же стране — для быстрого перехода по её линии. */
  previous?: TimelineItem;
  next?: TimelineItem;
  onNavigate: (item: TimelineItem) => void;
  onClose: () => void;
  onTagClick: (tag: string) => void;
};

export function FocusPanel({
  item,
  country,
  era,
  previous,
  next,
  onNavigate,
  onClose,
  onTagClick,
}: Props) {
  return (
    <aside className="focus" aria-live="polite" data-no-pan>
      <AnimatePresence mode="wait">
        {item && country ? (
          <motion.article
            key={item.id}
            className="focus__card panel"
            style={
              {
                '--c': `hsl(${country.color})`,
                '--c-ink': `hsl(${country.colorInk})`,
              } as React.CSSProperties
            }
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="focus__bar" aria-hidden="true" />

            <header className="focus__head">
              <div className="focus__meta">
                <span className="focus__country">
                  <span className="focus__dot" aria-hidden="true" />
                  {country.label}
                </span>
                <span className="focus__kind" data-kind={item.kind}>
                  {item.kind === 'event' ? '◆ Событие' : '✦ Деятель'}
                </span>
              </div>
              <button type="button" className="focus__close" onClick={onClose} title="Закрыть панель">
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Закрыть панель фокуса</span>
              </button>
            </header>

            <p className="focus__date">
              <span className="focus__year">{formatItemDate(item)}</span>
              {item.endYear && item.endYear !== item.year ? (
                <span className="focus__range">до {item.endYear}</span>
              ) : null}
              {(item.importance ?? 2) >= 3 ? <span className="focus__seal">★ веха</span> : null}
            </p>

            <h3 className="focus__title">{item.title}</h3>

            {item.life ? <p className="focus__life">Годы жизни: {item.life}</p> : null}

            <p className="focus__detail">{item.detail}</p>

            {item.parallel ? (
              <p className="focus__parallel">
                <span className="focus__parallel-label">В это же время</span>
                {item.parallel}
              </p>
            ) : null}

            {era ? (
              <p className="focus__era">
                <b>{era.label}</b>
                <span>{era.note}</span>
              </p>
            ) : null}

            {item.tags.length > 0 ? (
              <div className="focus__tags">
                {item.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag tag--button"
                    onClick={() => onTagClick(tag)}
                    title={`Показать всё по теме «${tag}»`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}

            <nav className="focus__nav" aria-label={`Соседние объекты линии «${country.label}»`}>
              <button
                type="button"
                className="focus__nav-btn"
                disabled={!previous}
                onClick={() => previous && onNavigate(previous)}
              >
                <span aria-hidden="true">↑</span>
                <span className="focus__nav-text">
                  {previous ? `${previous.year} · ${previous.title}` : 'Раньше ничего нет'}
                </span>
              </button>
              <button
                type="button"
                className="focus__nav-btn"
                disabled={!next}
                onClick={() => next && onNavigate(next)}
              >
                <span aria-hidden="true">↓</span>
                <span className="focus__nav-text">
                  {next ? `${next.year} · ${next.title}` : 'Позже ничего нет'}
                </span>
              </button>
            </nav>
          </motion.article>
        ) : (
          <motion.div
            key="empty"
            className="focus__empty panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="eyebrow">Панель фокуса</p>
            <p className="focus__empty-text">
              Выберите карточку на шкале — здесь появится подробное объяснение: что произошло, почему это
              важно и как связано с историей соседних стран.
            </p>
            <p className="focus__hint">
              Поле можно тащить мышью, менять масштаб ползунком и скрывать лишние страны.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
