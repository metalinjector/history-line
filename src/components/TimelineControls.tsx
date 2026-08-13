import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { KindFilter, Period } from '../types';
import { eras } from '../data/eras';
import { encodePeriod, decodePeriod, intervalPeriods, INTERVAL_SPAN } from '../data/periods';
import { allTags } from '../data/timelineItems';
import { plural } from '../lib/format';
import './TimelineControls.css';

type Props = {
  layer: KindFilter;
  query: string;
  keyOnly: boolean;
  period?: Period;
  /** Показывать ли на общей шкале даты до нашей эры. */
  showBce: boolean;
  /** Сколько объектов до н. э. дали бы выбранные линии. Ноль — переключатель бессилен. */
  bceCount: number;
  tags: string[];
  zoom: number;
  /** Верхняя граница шкалы — по ней строится сетка интервалов. */
  maxYear: number;
  /** Сколько объектов дал бы каждый отрезок при остальных фильтрах. */
  periodCounts: { eras: Record<string, number>; intervals: Record<number, number> };
  total: number;
  events: number;
  people: number;
  expanded: boolean;
  onLayerChange: (layer: KindFilter) => void;
  onQueryChange: (query: string) => void;
  onKeyOnlyChange: (value: boolean) => void;
  onPeriodChange: (period?: Period) => void;
  onShowBceChange: (value: boolean) => void;
  /** Добавить к выбору линии, на которых держится древность. */
  onAddAncientLines: () => void;
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
  /** Разделы, которые живут в своих компонентах: страны и слои. */
  children?: React.ReactNode;
};

const kinds: { id: KindFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'Всё', hint: 'События и деятели вместе' },
  { id: 'events', label: 'События', hint: 'Только то, что произошло' },
  { id: 'people', label: 'Деятели', hint: 'Только персоналии' },
];

const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.9;

/**
 * Управление хронологией.
 *
 * На виду остаётся только то, без чего шкалу не прочитать: тип объектов,
 * поиск и отрезок времени. Всё остальное — масштаб, вехи, связи, темы,
 * страны и слои — убрано в «Настройки»: это вещи, которые настраивают один раз,
 * а не трогают при каждом взгляде на шкалу.
 */
export function TimelineControls(props: Props) {
  const {
    layer,
    query,
    keyOnly,
    period,
    showBce,
    bceCount,
    tags,
    zoom,
    maxYear,
    periodCounts,
    total,
    events,
    people,
    expanded,
    onLayerChange,
    onQueryChange,
    onKeyOnlyChange,
    onPeriodChange,
    onShowBceChange,
    onAddAncientLines,
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
    children,
  } = props;

  /**
   * Пустые интервалы внутри шкалы показываем — читателю полезно видеть,
   * что в 301–600 годах у нас всего девять объектов. А вот хвост из пустых
   * интервалов за последней записью — просто мусор, его отрезаем.
   */
  const visibleIntervals = useMemo(() => {
    const all = intervalPeriods(maxYear);
    const lastFilled = all.reduce(
      (last, interval, index) => ((periodCounts.intervals[interval.from] ?? 0) > 0 ? index : last),
      -1,
    );
    return all.slice(0, lastFilled + 1);
  }, [maxYear, periodCounts]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const zoomId = useId();
  const searchId = useId();
  const periodId = useId();

  const isFiltered =
    layer !== 'all' || query !== '' || keyOnly || !showBce || period !== undefined || tags.length > 0;
  /** Сколько настроек отличается от значений по умолчанию — цифра на кнопке. */
  const changedSettings =
    (keyOnly ? 1 : 0) +
    (showBce ? 0 : 1) +
    (showRelations ? 0 : 1) +
    (tags.length > 0 ? 1 : 0) +
    (Math.abs(zoom - 1) > 0.01 ? 1 : 0);

  return (
    <div className="controls" data-no-pan>
      <div className="controls__bar">
        <div className="segmented" role="radiogroup" aria-label="Тип объектов">
          {kinds.map((option) => (
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

        {/*
          Один список на два способа выбрать время: содержательные эпохи
          с неровными границами и механические интервалы по 300 лет.
          Число рядом — сколько объектов дал бы отрезок при остальных фильтрах.
        */}
        <label className="controls__select" htmlFor={periodId}>
          <span className="controls__select-label">Период</span>
          <select
            id={periodId}
            value={period ? encodePeriod(period) : ''}
            onChange={(event) => onPeriodChange(decodePeriod(event.target.value, maxYear))}
          >
            <option value="">вся шкала</option>
            <optgroup label="Эпохи">
              {eras.map((option) => (
                <option key={option.id} value={`era:${option.id}`}>
                  {option.label} · {periodCounts.eras[option.id] ?? 0}
                </option>
              ))}
            </optgroup>
            {/*
              Интервалы нарезаны только по нашей эре: шкала уходит на миллионы лет
              назад, и равные отрезки там дали бы тысячи пунктов. Всё, что до н. э.,
              делится эпохами — они для того и существуют.
            */}
            <optgroup label={`Интервалы по ${INTERVAL_SPAN} лет, наша эра`}>
              {visibleIntervals.map((interval) => (
                <option key={interval.from} value={`int:${interval.from}`}>
                  {interval.from}–{interval.to} · {periodCounts.intervals[interval.from] ?? 0}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <button
          type="button"
          className="btn btn--sm controls__settings"
          onClick={() => setSettingsOpen((value) => !value)}
          aria-expanded={settingsOpen}
          title="Масштаб, вехи, связи, темы, страны и слои"
        >
          <span aria-hidden="true">⚙</span>
          Настройки
          {changedSettings > 0 ? <span className="controls__badge">{changedSettings}</span> : null}
          <span className="controls__chevron" aria-hidden="true" data-open={settingsOpen || undefined}>
            ⌄
          </span>
        </button>

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

      <div className="controls__meta">
        <p className="controls__stats">
          <b>{total}</b> {plural(total, ['объект', 'объекта', 'объектов'])} на шкале ·{' '}
          <span className="controls__stat-dot" data-kind="event" aria-hidden="true" /> {events}{' '}
          {plural(events, ['событие', 'события', 'событий'])} ·{' '}
          <span className="controls__stat-dot" data-kind="person" aria-hidden="true" /> {people}{' '}
          {plural(people, ['деятель', 'деятеля', 'деятелей'])}
        </p>

        {isFiltered ? (
          <button type="button" className="controls__reset" onClick={onReset}>
            Сбросить фильтры
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {settingsOpen ? (
          <motion.div
            className="controls__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="controls__panel-inner">
              <section className="settings-group">
                <h4 className="settings-group__title">Вид шкалы</h4>

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

                <div className="settings-group__row">
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
                    {bceCount > 0 ? <span className="toggle__count">{bceCount}</span> : null}
                  </button>

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
                </div>

                {/*
                  Молчаливый переключатель — худший вид неработающей кнопки.
                  Если в выбранных линиях нет ни одной даты до нашей эры,
                  честнее сказать об этом и предложить починку одним нажатием.
                */}
                {bceCount === 0 ? (
                  <p className="settings-group__note">
                    В выбранных линиях нет дат до нашей эры, поэтому переключатель ничего не меняет.
                    Древность в этой базе живёт отдельными линиями: Древний Рим — не Италия,
                    Древняя Греция — не современная Греция.
                    <button type="button" className="settings-group__fix" onClick={onAddAncientLines}>
                      Добавить античные линии
                    </button>
                  </p>
                ) : null}
              </section>

              <section className="settings-group settings-group--wide">
                <h4 className="settings-group__title">
                  Темы
                  {tags.length > 0 ? (
                    <button type="button" className="settings-group__clear" onClick={() => onTagsChange([])}>
                      снять {tags.length}
                    </button>
                  ) : null}
                </h4>
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
              </section>

              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
