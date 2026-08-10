import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { TimelineItem } from '../types';
import type { TimelineState } from '../lib/useTimelineState';
import { eras } from '../data/eras';
import { timeKey } from '../lib/format';
import { usePanning } from '../lib/usePanning';
import { TimelineControls } from './TimelineControls';
import { CountryTogglePanel } from './CountryTogglePanel';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';
import './TimelineSection.css';

// Модалка тянет за собой разбор Markdown, поэтому грузится только при первом открытии.
const ItemModal = lazy(() => import('./ItemModal'));

type Props = {
  state: TimelineState;
  sectionRef: React.RefObject<HTMLElement | null>;
};

export function TimelineSection({ state, sectionRef }: Props) {
  const {
    columns,
    sharedColumns,
    maxColumns,
    maxPerColumn,
    visibleCountries,
    groups,
    filteredItems,
    stats,
    countryCounts,
    selectedItem,
    openedItem,
    openedCountry,
    openedEra,
    neighbours,
    scrollTarget,
    countries,
    activeCountryIds,
    layer,
    query,
    keyOnly,
    era,
    tags,
    zoom,
    expanded,
    setLayer,
    setQuery,
    setKeyOnly,
    setEra,
    setTags,
    toggleTag,
    setZoom,
    setExpanded,
    selectItem,
    clearSelection,
    openItem,
    closeItem,
    toggleCountry,
    showAllCountries,
    onlyCountry,
    mergeCountry,
    detachCountry,
    resetColumns,
    resetFilters,
  } = state;

  const { ref: viewportRef, isPanning, onPointerDown, didPan } = usePanning<HTMLDivElement>();

  /** Плоский список в порядке шкалы — для навигации стрелками. */
  const ordered = useMemo(
    () => [...filteredItems].sort((a, b) => timeKey(a) - timeKey(b) || a.country.localeCompare(b.country)),
    [filteredItems],
  );

  const scrollItemIntoView = useCallback(
    (id: string, behavior: ScrollBehavior = 'smooth') => {
      const viewport = viewportRef.current;
      const element = document.getElementById(`item-${id}`);
      if (!viewport || !element) return;

      const viewportRect = viewport.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const top =
        viewport.scrollTop + (elementRect.top - viewportRect.top) - viewportRect.height / 2 + elementRect.height / 2;
      const left =
        viewport.scrollLeft + (elementRect.left - viewportRect.left) - viewportRect.width / 2 + elementRect.width / 2;

      viewport.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior });
    },
    [viewportRef],
  );

  // Внешний запрос на прокрутку (например, после добавления деятеля).
  useEffect(() => {
    if (!scrollTarget) return;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = window.setTimeout(() => scrollItemIntoView(scrollTarget.id), 420);
    return () => window.clearTimeout(timer);
  }, [scrollTarget, scrollItemIntoView, sectionRef]);

  const handleSelect = useCallback(
    (item: TimelineItem) => {
      // Клик после реального перетаскивания игнорируем.
      if (didPan()) return;
      selectItem(item);
    },
    [didPan, selectItem],
  );

  const handleOpen = useCallback(
    (item: TimelineItem) => {
      if (didPan()) return;
      openItem(item);
    },
    [didPan, openItem],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (!target.closest('.tcard')) return;

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }

      if (!selectedItem) return;
      event.preventDefault();

      let nextItem: TimelineItem | undefined;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const index = ordered.findIndex((item) => item.id === selectedItem.id);
        nextItem = ordered[index + (event.key === 'ArrowDown' ? 1 : -1)];
      } else {
        // Влево-вправо: соседняя страна в том же году.
        const sameYear = ordered.filter((item) => item.year === selectedItem.year);
        const order = visibleCountries.map((country) => country.id);
        sameYear.sort((a, b) => order.indexOf(a.country) - order.indexOf(b.country));
        const index = sameYear.findIndex((item) => item.id === selectedItem.id);
        nextItem = sameYear[index + (event.key === 'ArrowRight' ? 1 : -1)];
      }

      if (!nextItem) return;
      selectItem(nextItem);
      scrollItemIntoView(nextItem.id);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`#item-${nextItem.id} .tcard__hit`)?.focus({ preventScroll: true });
      });
    },
    [clearSelection, ordered, scrollItemIntoView, selectItem, selectedItem, visibleCountries],
  );

  /**
   * Измеряет базовую ширину таблицы через скрытый зонд.
   *
   * Зонд нужен потому, что getComputedStyle вернул бы для --col-width
   * незавершённый calc(), а живые ячейки в режиме растягивания шире базовых —
   * измерение по ним зациклило бы пересчёт.
   */
  const measureBaseWidth = useCallback(() => {
    const viewport = viewportRef.current;
    const probeColumn = viewport?.querySelector<HTMLElement>('[data-probe="column"]');
    const probeDate = viewport?.querySelector<HTMLElement>('[data-probe="date"]');
    if (!viewport || !probeColumn || !probeDate) return undefined;

    const width = probeDate.offsetWidth + probeColumn.offsetWidth * columns.length;
    return width > 0 ? { width, available: viewport.clientWidth } : undefined;
  }, [columns.length, viewportRef]);

  /** Если колонки уже, чем поле, они растягиваются и заполняют его целиком. */
  const [stretchColumns, setStretchColumns] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const measured = measureBaseWidth();
      if (measured) setStretchColumns(measured.width <= measured.available);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measureBaseWidth, viewportRef, zoom]);

  /** Подбирает масштаб так, чтобы видимые колонки уместились по ширине поля. */
  const fitToWidth = useCallback(() => {
    const measured = measureBaseWidth();
    if (!measured || !zoom) return;
    setZoom(((measured.available - 4) / measured.width) * zoom);
  }, [measureBaseWidth, setZoom, zoom]);

  /** Эпохи, реально присутствующие в текущей выборке, — для быстрых переходов. */
  const availableEras = useMemo(() => {
    const firstRowByEra = new Map<string, string>();
    for (const group of groups) {
      if (!firstRowByEra.has(group.era.id)) firstRowByEra.set(group.era.id, group.key);
    }
    return eras
      .filter((item) => firstRowByEra.has(item.id))
      .map((item) => ({ ...item, rowKey: firstRowByEra.get(item.id)! }));
  }, [groups]);

  const jumpToRow = useCallback(
    (rowKey: string) => {
      const viewport = viewportRef.current;
      const row = document.getElementById(`row-${rowKey}`);
      if (!viewport || !row) return;
      const viewportRect = viewport.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      viewport.scrollTo({
        top: Math.max(0, viewport.scrollTop + (rowRect.top - viewportRect.top) - 72),
        behavior: 'smooth',
      });
    },
    [viewportRef],
  );

  const gridStyle = {
    '--cols': stretchColumns
      ? `repeat(${columns.length}, minmax(var(--col-width), 1fr))`
      : `repeat(${columns.length}, var(--col-width))`,
  } as React.CSSProperties;

  return (
    <section className="timeline" id="timeline" ref={sectionRef}>
      <header className="timeline__head shell">
        <div>
          <p className="eyebrow">Основная хронология</p>
          <h2 className="timeline__title">Одно время — восемь линий</h2>
        </div>
        <p className="timeline__hint lede">
          Тащите поле мышью, приближайте ползунком, отключайте лишние страны. Нажмите на карточку — слева
          подсветится год, а значок <span className="timeline__hint-glyph">¶</span> откроет полный текст.
        </p>
      </header>

      <div className="timeline__body shell">
        <TimelineControls
          layer={layer}
          query={query}
          keyOnly={keyOnly}
          era={era}
          tags={tags}
          zoom={zoom}
          total={stats.total}
          events={stats.events}
          people={stats.people}
          expanded={expanded}
          onLayerChange={setLayer}
          onQueryChange={setQuery}
          onKeyOnlyChange={setKeyOnly}
          onEraChange={setEra}
          onTagsChange={setTags}
          onZoomChange={setZoom}
          onFitToWidth={fitToWidth}
          onToggleExpanded={() => setExpanded(!expanded)}
          onReset={resetFilters}
        />

        <CountryTogglePanel
          countries={countries}
          activeIds={activeCountryIds}
          counts={countryCounts}
          sharedColumns={sharedColumns}
          columnCount={columns.length}
          maxColumns={maxColumns}
          maxPerColumn={maxPerColumn}
          onToggle={toggleCountry}
          onShowAll={showAllCountries}
          onOnly={onlyCountry}
          onMerge={mergeCountry}
          onDetach={detachCountry}
          onResetColumns={resetColumns}
        />

        {availableEras.length > 1 ? (
          <nav className="era-rail" aria-label="Быстрый переход по эпохам" data-no-pan>
            {availableEras.map((item) => (
              <button
                key={item.id}
                type="button"
                className="era-rail__item"
                onClick={() => jumpToRow(item.rowKey)}
                title={item.note}
              >
                <span className="era-rail__years">
                  {item.from}–{item.to > 2100 ? '…' : item.to}
                </span>
                <span className="era-rail__label">{item.label}</span>
              </button>
            ))}
          </nav>
        ) : null}

        <div className="timeline__stage" data-expanded={expanded || undefined}>
          <div
            className="timeline__viewport"
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onKeyDown={handleKeyDown}
            data-panning={isPanning || undefined}
            role="grid"
            aria-label="Хронология событий по странам"
            aria-rowcount={groups.length + 1}
            aria-colcount={columns.length + 1}
          >
            {/* Скрытый зонд: даёт базовые ширины колонок для расчёта масштаба */}
            <span className="timeline__probe" aria-hidden="true">
              <i data-probe="column" />
              <i data-probe="date" />
            </span>

            <div className="timeline__grid" style={gridStyle} data-stretch={stretchColumns || undefined}>
              <TimelineHeader
                columns={columns}
                selectedCountry={selectedItem?.country}
                onHide={toggleCountry}
                canHide={visibleCountries.length > 1}
              />

              {groups.length === 0 ? (
                <div className="timeline__empty">
                  <p className="timeline__empty-title">Ничего не найдено</p>
                  <p className="timeline__empty-text">
                    Попробуйте изменить запрос, вернуть слой «Всё» или показать больше стран.
                  </p>
                  <button type="button" className="btn btn--sm" onClick={resetFilters}>
                    Сбросить фильтры
                  </button>
                </div>
              ) : (
                <>
                  <div className="timeline__origin" role="row">
                    <div className="timeline__origin-inner">
                      <span className="timeline__origin-year">1</span>
                      <span className="timeline__origin-text">
                        Начало шкалы — первый год нашей эры. Отсюда время идёт сверху вниз: чем ниже строка,
                        тем ближе к сегодняшнему дню. Расстояние между строками не пропорционально годам —
                        показаны только те даты, где что-то отмечено.
                      </span>
                    </div>
                  </div>

                  {groups.map((group) => (
                    <div className="timeline__group" key={group.key}>
                      {group.startsEra ? (
                        <div className="era-band" role="row">
                          <div className="era-band__inner">
                            <span className="era-band__label">{group.era.label}</span>
                            <span className="era-band__years">
                              {group.era.from}–{group.era.to > 2100 ? 'наши дни' : group.era.to}
                            </span>
                            <span className="era-band__note">{group.era.note}</span>
                          </div>
                        </div>
                      ) : null}

                      <TimelineRow
                        group={group}
                        columns={columns}
                        selectedId={selectedItem?.id}
                        selectedCountry={selectedItem?.country}
                        query={query}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                      />
                    </div>
                  ))}

                  <div className="timeline__tail" role="row">
                    <span>Конец текущей выборки · {stats.maxYear} год</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {openedItem && openedCountry ? (
        <Suspense fallback={null}>
          <ItemModal
            key={openedItem.id}
            item={openedItem}
            country={openedCountry}
            era={openedEra}
            previous={neighbours.previous}
            next={neighbours.next}
            onNavigate={openItem}
            onClose={closeItem}
            onTagClick={toggleTag}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
