import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import type { TimelineItem } from '../types';
import type { TimelineState } from '../lib/useTimelineState';
import { eras } from '../data/eras';
import { timeKey } from '../lib/format';
import { groupKeyOf } from '../lib/timeline';
import { usePanning } from '../lib/usePanning';
import { TimelineControls } from './TimelineControls';
import { CountryTogglePanel } from './CountryTogglePanel';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';
import { TimelineOverlay } from './TimelineOverlay';
import { LayerMenu } from './LayerMenu';
import { fitZoomToWidth } from '../lib/zoom';
import { StoryPanel } from './StoryPanel';
import { EditorialDashboard } from './EditorialDashboard';
import { ResearchTools } from './ResearchTools';
import './TimelineSection.css';

// Окна тянут за собой разбор Markdown, KaTeX и загрузчик Mermaid,
// поэтому грузятся одним чанком при первом открытии.
const ModalHost = lazy(() => import('./modal/ModalHost'));

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
    visibleRelations,
    showRelations,
    setShowRelations,
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
    granularity,
    setLayer,
    setQuery,
    setKeyOnly,
    setEra,
    setTags,
    setZoom,
    setExpanded,
    selectItem,
    clearSelection,
    openItem,
    openDay,
    openRelation,
    toggleCountry,
    showAllCountries,
    onlyCountry,
    mergeCountry,
    detachCountry,
    resetColumns,
    resetFilters,
  } = state;

  const { ref: viewportRef, isPanning, onPointerDown, didPan } = usePanning<HTMLDivElement>();
  const gridRef = useRef<HTMLDivElement>(null);
  /** Контейнер виртуализированных строк — нужен, чтобы измерить отступ от
   *  верха поля прокрутки до начала списка групп (над ним стоят шапка и
   *  стартовая строка «1 год»). Без этого scrollMargin виртуализатор
   *  считал бы видимый диапазон от нуля и прорисовывал бы лишние строки. */
  const rowsRef = useRef<HTMLDivElement>(null);
  /** Слой, который сейчас тащат мышью: колонки становятся зонами приёма. */
  const [draggingLayerId, setDraggingLayerId] = useState<string | undefined>();

  /** Плоский список в порядке шкалы — для навигации стрелками. */
  const ordered = useMemo(
    () => [...filteredItems].sort((a, b) => timeKey(a) - timeKey(b) || a.country.localeCompare(b.country)),
    [filteredItems],
  );

  /** Отступ от верха поля прокрутки до начала списка групп.
   *  Шапка стран и стартовая строка «1 год» стоят над группами в одном
   *  scroll-контейнере, поэтому виртуализатору нужно знать, что видимый
   *  диапазон строк начинается не от нуля, а ниже этих элементов. */
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const rows = rowsRef.current;
    if (!viewport || !rows) return;
    const measure = () => {
      const next = rows.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
      setScrollMargin((prev) => (next >= 0 && next !== prev ? next : prev));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(rows);
    return () => observer.disconnect();
  }, [viewportRef]);

  /** Карта ключ группы → индекс в массиве groups — для быстрого поиска при
   *  навигации (стрелки, эпохи, прокрутка к объекту после добавления). */
  const groupIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < groups.length; i++) map.set(groups[i].key, i);
    return map;
  }, [groups]);

  /**
   * Нити измеряют координаты реальных DOM-узлов. Поэтому строки с концами
   * видимых связей должны оставаться смонтированными даже за пределами
   * обычного окна виртуализации. Таких строк немного: не более двух на связь.
   */
  const relationRowIndexes = useMemo(() => {
    const itemRow = new Map<string, number>();
    groups.forEach((group, index) => group.items.forEach((item) => itemRow.set(item.id, index)));

    const indexes = new Set<number>();
    for (const relation of visibleRelations) {
      const from = itemRow.get(relation.from);
      const to = itemRow.get(relation.to);
      if (from !== undefined) indexes.add(from);
      if (to !== undefined) indexes.add(to);
    }
    return Array.from(indexes);
  }, [groups, visibleRelations]);

  const relationAwareRange = useCallback(
    (range: Parameters<typeof defaultRangeExtractor>[0]) =>
      Array.from(new Set([...defaultRangeExtractor(range), ...relationRowIndexes])).sort((a, b) => a - b),
    [relationRowIndexes],
  );

  const rowVirtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 64,
    overscan: 8,
    getItemKey: (index) => groups[index]?.key ?? index,
    rangeExtractor: relationAwareRange,
    scrollMargin,
  });

  const scrollItemIntoView = useCallback(
    (id: string, behavior: ScrollBehavior = 'smooth') => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const scrollToElement = () => {
        const element = document.getElementById(`item-${id}`);
        if (!element) return;
        const viewportRect = viewport.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const top =
          viewport.scrollTop + (elementRect.top - viewportRect.top) - viewportRect.height / 2 + elementRect.height / 2;
        const left =
          viewport.scrollLeft + (elementRect.left - viewportRect.left) - viewportRect.width / 2 + elementRect.width / 2;
        viewport.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior });
      };

      // Если объект принадлежит группе, которая сейчас не отрендерена
      // (виртуализация), сначала подвозим её в видимую область, а саму
      // прокрутку до карточки делаем в следующем кадре — когда строка
      // уже стоит в DOM и её можно измерить.
      const groupIndex = ordered.findIndex((item) => item.id === id);
      if (groupIndex >= 0) {
        const item = ordered[groupIndex];
        const groupKey = groupKeyOf(item, granularity);
        const rowIndex = groupIndexByKey.get(groupKey);
        if (rowIndex !== undefined) {
          rowVirtualizer.scrollToIndex(rowIndex, { align: 'center', behavior });
          window.requestAnimationFrame(scrollToElement);
          return;
        }
      }
      scrollToElement();
    },
    [granularity, groupIndexByKey, ordered, rowVirtualizer, viewportRef],
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
    setZoom(fitZoomToWidth(measured.width, measured.available - 4, zoom));
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
      if (!viewport) return;
      const rowIndex = groupIndexByKey.get(rowKey);
      if (rowIndex === undefined) return;
      // Сначала подвозим строку в видимую область через виртуализатор,
      // затем доводим прокрутку так, чтобы строка встала под шапкой с отступом.
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'start' });
      window.requestAnimationFrame(() => {
        const row = document.getElementById(`row-${rowKey}`);
        if (!row) return;
        const viewportRect = viewport.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        viewport.scrollTo({
          top: Math.max(0, viewport.scrollTop + (rowRect.top - viewportRect.top) - 72),
          behavior: 'smooth',
        });
      });
    },
    [groupIndexByKey, rowVirtualizer, viewportRef],
  );

  const gridStyle = {
    '--cols': stretchColumns
      ? `repeat(${columns.length}, minmax(var(--col-width), 1fr))`
      : `repeat(${columns.length}, var(--col-width))`,
  } as React.CSSProperties;

  const virtualItems = rowVirtualizer.getVirtualItems();
  const virtualRangeKey = virtualItems.map((item) => item.index).join(',');

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
        <StoryPanel
          stories={state.stories}
          activeStory={state.activeStory}
          step={state.storyStep}
          activeItem={state.activeStoryItem}
          onStep={state.goToStoryStep}
          onStop={state.stopStory}
        />

        <ResearchTools state={state} />

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
          showRelations={showRelations}
          relationCount={visibleRelations.length}
          onToggleRelations={() => setShowRelations(!showRelations)}
          granularityLabel={state.granularityLabel}
          splitRows={state.splitRows}
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

        <LayerMenu
          activeLayerIds={state.activeLayerIds}
          layerState={state.layerState}
          maxLayers={state.maxLayers}
          countries={countries}
          activeCountryIds={activeCountryIds}
          placementOf={state.placementOf}
          onToggleLayer={state.toggleLayer}
          onRemoveLayer={state.removeLayer}
          onPlaceLayer={state.placeLayer}
          onDragLayer={setDraggingLayerId}
        />

        <EditorialDashboard
          items={state.allItems}
          countries={countries}
          onSelect={(countryId, eraId) => {
            state.stopStory();
            onlyCountry(countryId);
            setLayer('all');
            setQuery('');
            setKeyOnly(false);
            setTags([]);
            setEra(eraId);
          }}
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

            <div
              className="timeline__grid"
              ref={gridRef}
              style={gridStyle}
              data-stretch={stretchColumns || undefined}
            >
              <TimelineOverlay
                gridRef={gridRef}
                groups={groups}
                selectedItem={selectedItem}
                relations={visibleRelations}
                layoutKey={`${zoom}|${columns.length}|${stretchColumns}|${groups.length}|${selectedItem?.id ?? ''}|${visibleRelations.length}|${virtualRangeKey}|${scrollMargin}`}
                onRelationClick={openRelation}
              />

              <TimelineHeader
                columns={columns}
                selectedCountry={selectedItem?.country}
                draggingLayerId={draggingLayerId}
                onHide={toggleCountry}
                canHide={visibleCountries.length > 1}
                onDropLayer={(layerId, column) => {
                  const target = column.tracks.find((track) => track.countryId);
                  if (target?.countryId) state.placeLayer(layerId, target.countryId);
                  setDraggingLayerId(undefined);
                }}
                onRemoveLayer={state.removeLayer}
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

                  {/*
                    Виртуализация строк: рендерятся только видимые группы плюс
                    оверскан, остальное место зарезервировано высотой контейнера.
                    Каждая группа измеряется после появления в DOM (measureElement),
                    поэтому строки переменной высоты (с карточками и без) стоят
                    корректно. Липкая шапка, липкая колонка дат, горизонтальная
                    прокрутка, перетаскивание и нити связей сохранены — структура
                    DOM групп не изменилась, только способ их вывода.
                  */}
                  <div
                    className="timeline__rows"
                    ref={rowsRef}
                    style={{ height: rowVirtualizer.getTotalSize() }}
                  >
                    {virtualItems.map((virtualRow) => {
                      const group = groups[virtualRow.index];
                      if (!group) return null;
                      return (
                        <div
                          className="timeline__group"
                          key={virtualRow.key}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                          }}
                        >
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
                            onOpenDay={openDay}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="timeline__tail" role="row">
                    <span>Конец текущей выборки · {stats.maxYear} год</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {state.openedItem || state.openedDay || state.openedRelation ? (
        <Suspense fallback={null}>
          <ModalHost state={state} />
        </Suspense>
      ) : null}
    </section>
  );
}
