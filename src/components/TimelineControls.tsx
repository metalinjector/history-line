import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { EraId, KindFilter } from '../types';
import { eras } from '../data/eras';
import { allTags } from '../data/timelineItems';
import { plural } from '../lib/format';
import './TimelineControls.css';

export type ControlsState = {
  layer: KindFilter;
  query: string;
  keyOnly: boolean;
  showBce: boolean;
  era?: EraId;
  tags: string[];
  zoom: number;
};

type Props = ControlsState & {
  total: number;
  events: number;
  people: number;
  expanded: boolean;
  onLayerChange: (layer: KindFilter) => void;
  onQueryChange: (query: string) => void;
  onKeyOnlyChange: (value: boolean) => void;
  onShowBceChange: (value: boolean) => void;
  onEraChange: (era?: EraId) => void;
  onTagsChange: (tags: string[]) => void;
  onZoomChange: (zoom: number) => void;
  onFitToWidth: () => void;
  onToggleExpanded: () => void;
  onReset: () => void;
  showRelations: boolean;
  relationCount: number;
  onToggleRelations: () => void;
  /** Текущее дробление шкалы: годы, месяцы, дни. */
  granularityLabel: string;
  /** Сколько строк раздробилось на месяцы или дни. */
  splitRows: number;
};

const layers: { id: KindFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'Всё', hint: 'События и деятели вместе' },
  { id: 'events', label: 'События', hint: 'Только то, что произошло' },
  { id: 'people', label: 'Деятели', hint: 'Только персоналии' },
];

const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.9;

export function TimelineControls(props: Props) {
  const {
    layer,
    query,
    keyOnly,
    showBce,
    era,
    tags,
    zoom,
    total,
    events,
    people,
    expanded,
    onLayerChange,
    onQueryChange,
    onKeyOnlyChange,
    onShowBceChange,
    onEraChange,
    onTagsChange,
    onZoomChange,
    onFitToWidth,
    onToggleExpanded,
    onReset,
    showRelations,
    relationCount,
    onToggleRelations,
    granularityLabel,
    splitRows,
  } = props;

  const [tagsOpen, setTagsOpen] = useState(false);
  const zoomId = useId();
  const searchId = useId();

  const isFiltered = layer !== 'all' || query !== '' || keyOnly || !showBce || era !== undefined || tags.length > 0;

  return (
    <div className="controls" data-no-pan>
      <div className="controls__row">
        {/* Слои */}
        <div className="segmented" role="radiogroup" aria-label="Слой хронологии">
          {layers.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={layer === option.id}
              className="segmented__option"
              data-active={layer === option.id || undefined}
              title={option.hint}
              onClick={() => onLayerChange(option.id)}
            >
              {layer === option.id ? (
                <motion.span className="segmented__pill" layoutId="segmented-pill" transition={{ duration: 0.25 }} />
              ) : null}
              <span className="segmented__text">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Поиск */}
        <div className="controls__search">
          <label className="visually-hidden" htmlFor={searchId}>
            Поиск по хронологии
          </label>
          <span className="controls__search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            id={searchId}
            type="search"
            className="controls__input"
            placeholder="Найти: реформация, космос, 1945…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="controls__clear"
              onClick={() => onQueryChange('')}
              title="Очистить поиск"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* Эпоха */}
        <label className="controls__select">
          <span className="controls__select-label">Эпоха</span>
          <select
            value={era ?? ''}
            onChange={(event) => onEraChange((event.target.value || undefined) as EraId | undefined)}
          >
            <option value="">все эпохи</option>
            {eras.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Даты до нашей эры */}
        <button
          type="button"
          className="toggle"
          data-active={showBce || undefined}
          aria-pressed={showBce}
          onClick={() => onShowBceChange(!showBce)}
          title="Показывать или скрывать на общей шкале все даты до нашей эры"
        >
          <span className="toggle__track" aria-hidden="true">
            <span className="toggle__thumb" />
          </span>
          До н. э.
        </button>

        {/* Только вехи */}
        <button
          type="button"
          className="toggle"
          data-active={keyOnly || undefined}
          aria-pressed={keyOnly}
          onClick={() => onKeyOnlyChange(!keyOnly)}
          title="Оставить только опорные вехи эпох"
        >
          <span className="toggle__track" aria-hidden="true">
            <span className="toggle__thumb" />
          </span>
          Только вехи
        </button>

        {/* Нити связей */}
        <button
          type="button"
          className="toggle"
          data-active={showRelations || undefined}
          aria-pressed={showRelations}
          onClick={onToggleRelations}
          title="Показать нити между связанными событиями разных стран"
        >
          <span className="toggle__track" aria-hidden="true">
            <span className="toggle__thumb" />
          </span>
          Связи
          {showRelations && relationCount > 0 ? (
            <span className="toggle__count">{relationCount}</span>
          ) : null}
        </button>

        {/* Масштаб */}
        <div className="controls__zoom" data-detail={granularityLabel !== 'годы' || undefined}>
          <label htmlFor={zoomId} className="controls__zoom-label">
            Масштаб
          </label>
          <input
            id={zoomId}
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            title="После 120% приближение дробит шкалу на месяцы, затем на дни"
          />
          <output className="controls__zoom-value">
            {Math.round(zoom * 100)}%
            <span className="controls__grain">
              {granularityLabel}
              {splitRows > 0 ? <b>+{splitRows}</b> : null}
            </span>
          </output>
          <button
            type="button"
            className="controls__fit"
            onClick={onFitToWidth}
            title="Подобрать масштаб так, чтобы видимые страны поместились по ширине"
          >
            уместить
          </button>
        </div>

        <button
          type="button"
          className="btn btn--sm controls__expand"
          onClick={onToggleExpanded}
          aria-pressed={expanded}
          title={expanded ? 'Обычная высота поля' : 'Развернуть поле на весь экран'}
        >
          <span aria-hidden="true">{expanded ? '⤡' : '⤢'}</span>
          {expanded ? 'Свернуть' : 'Развернуть'}
        </button>
      </div>

      <div className="controls__row controls__row--meta">
        <p className="controls__stats">
          <b>{total}</b> {plural(total, ['объект', 'объекта', 'объектов'])} на шкале ·{' '}
          <span className="controls__stat-dot" data-kind="event" aria-hidden="true" /> {events}{' '}
          {plural(events, ['событие', 'события', 'событий'])} ·{' '}
          <span className="controls__stat-dot" data-kind="person" aria-hidden="true" /> {people}{' '}
          {plural(people, ['деятель', 'деятеля', 'деятелей'])}
        </p>

        <button
          type="button"
          className="controls__tags-toggle"
          onClick={() => setTagsOpen((value) => !value)}
          aria-expanded={tagsOpen}
        >
          Темы {tags.length > 0 ? <b>· {tags.length}</b> : null}
          <span aria-hidden="true" data-open={tagsOpen || undefined}>
            ⌄
          </span>
        </button>

        {isFiltered ? (
          <button type="button" className="controls__reset" onClick={onReset}>
            Сбросить фильтры
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {tagsOpen ? (
          <motion.div
            className="controls__tags"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="controls__tags-inner">
              {allTags.map(({ tag, count }) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className="tag tag--button"
                    data-active={active || undefined}
                    aria-pressed={active}
                    onClick={() =>
                      onTagsChange(active ? tags.filter((value) => value !== tag) : [...tags, tag])
                    }
                  >
                    {tag}
                    <span className="tag__count">{count}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
