import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CountryId, CountrySet, KindFilter, Period, RelationDraftInput, ThemeName, TimelineItem } from '../types';
import { allCountryIds, countries, countryById, defaultCountryIds } from '../data/countries';
import {
  buildColumns,
  detachCountry as detachFromGroups,
  mergeCountries as mergeIntoGroups,
  MAX_COLUMNS,
  MAX_PER_COLUMN,
  type ColumnGroups,
} from '../data/columns';
import { eraForYear, eras } from '../data/eras';
import { intervalPeriods, periodContains, periodRange } from '../data/periods';
import { builtinCountrySets, MAX_USER_SETS, normalizeSet } from '../data/countrySets';
import { timelineItems } from '../data/timelineItems';
import { layerById, layers as allLayers, MAX_ACTIVE_LAYERS } from '../data/layers';
import { applyLayers, materializeLayerItems, type LayerPlacements } from './layers';
import { OWN_COLUMN, type LayerPlacement } from '../types';
import { relations as baseRelations } from '../data/relations';
import type { Relation } from '../types';
import {
  buildGroups,
  filterItems,
  findNearestItem,
  granularityForZoom,
  granularityLabel,
  summarize,
} from './timeline';
import { timeKey } from './format';
import { usePersistentState } from './usePersistentState';
import { clampZoom, visualZoom } from './zoom';
import { stories as storyRoutes } from '../data/stories';
import { findContemporaries } from './contemporaries';
import { buildTimelineUrl, parseTimelineUrl } from './urlState';

export type ScrollTarget = { id: string; nonce: number };

/**
 * Всё состояние приложения в одном месте.
 *
 * Хук сознательно отделён от компонентов: экраны получают готовые данные
 * и действия, а логика фильтрации, выбора и добавления персоналий живёт здесь.
 * Это позволит подменить источник данных (JSON, CMS, API) не трогая UI.
 */
export function useTimelineState() {
  const [initialUrlState] = useState(() =>
    typeof window === 'undefined' ? {} : parseTimelineUrl(window.location.search),
  );
  const [theme, setTheme] = usePersistentState<ThemeName>('theme', 'parchment');
  const [layer, setLayer] = useState<KindFilter>(initialUrlState.kind ?? 'all');
  const [query, setQuery] = useState(initialUrlState.query ?? '');
  const [keyOnly, setKeyOnly] = useState(initialUrlState.keyOnly ?? false);
  const [period, setPeriodRaw] = useState<Period | undefined>(initialUrlState.period);
  const [showBce, setShowBceRaw] = usePersistentState(
    'show-bce',
    true,
    initialUrlState.showBce,
  );
  const [tags, setTags] = useState<string[]>(initialUrlState.tags ?? []);
  const [zoom, setZoomRaw] = usePersistentState<number>('zoom', 1, initialUrlState.zoom);
  const [activeCountryIds, setActiveCountryIds] = usePersistentState<CountryId[]>(
    'countries',
    defaultCountryIds,
    initialUrlState.countries,
  );
  const [addedPeople, setAddedPeople] = usePersistentState<TimelineItem[]>('added-people', []);
  /** Объединения колонок задаёт пользователь; по умолчанию у каждой страны своя колонка. */
  const [columnGroups, setColumnGroups] = usePersistentState<ColumnGroups>(
    'column-groups',
    [],
    initialUrlState.columnGroups,
  );
  /** Связи, созданные пользователем вместе с добавленными объектами. */
  const [addedRelations, setAddedRelations] = usePersistentState<Relation[]>('added-relations', []);
  /** Свои наборы стран. Живут в браузере рядом с остальными настройками читателя. */
  const [userCountrySets, setUserCountrySets] = usePersistentState<CountrySet[]>('country-sets', []);
  /** Личные заметки читателя. Хранятся отдельно от базы фактов и не смешиваются с ней. */
  const [notes, setNotes] = usePersistentState<Record<string, string>>('notes', {});
  /** Включённые слои и их размещение — по умолчанию слоёв нет. */
  const [activeLayerIds, setActiveLayerIds] = usePersistentState<string[]>(
    'layers',
    [],
    initialUrlState.activeLayerIds,
  );
  const [layerPlacements, setLayerPlacements] = usePersistentState<LayerPlacements>(
    'layer-placements',
    {},
    initialUrlState.layerPlacements,
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialUrlState.selectedId ?? initialUrlState.openedId,
  );
  const [openedId, setOpenedId] = useState<string | undefined>(initialUrlState.openedId);
  const [openedDayKey, setOpenedDayKey] = useState<string | undefined>(initialUrlState.openedDayKey);
  const [openedRelationId, setOpenedRelationId] = useState<string | undefined>(initialUrlState.openedRelationId);
  /** Год, из окна которого открыли статью, — для кнопки возврата. */
  const [returnDayKey, setReturnDayKey] = useState<string | undefined>(undefined);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [showRelations, setShowRelations] = usePersistentState(
    'show-relations',
    true,
    initialUrlState.showRelations,
  );
  const [activeStoryId, setActiveStoryId] = useState<string | undefined>(initialUrlState.storyId);
  const [storyStep, setStoryStep] = useState(initialUrlState.storyStep ?? 0);

  /** Скрыв даты до н. э., нельзя остаться в отрезке, который целиком до н. э. */
  const setShowBce = useCallback((value: boolean) => {
    setShowBceRaw(value);
    if (!value) {
      setPeriodRaw((current) => (current && periodRange(current).to < 0 ? undefined : current));
    }
  }, [setShowBceRaw]);

  /** Переход к целиком дореформенному отрезку сам раскрывает часть шкалы до н. э. */
  const setPeriod = useCallback((value?: Period) => {
    if (value && periodRange(value).to < 0) setShowBceRaw(true);
    setPeriodRaw(value);
  }, [setShowBceRaw]);

  const setZoom = useCallback(
    (value: number) => setZoomRaw(clampZoom(value)),
    [setZoomRaw],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Геометрия растёт только до визуального предела; остальное уходит в детализацию.
  useEffect(() => {
    document.documentElement.style.setProperty('--zoom', String(visualZoom(zoom)));
  }, [zoom]);

  /** Текущий уровень дробления шкалы: годы, месяцы или дни. */
  const granularity = useMemo(() => granularityForZoom(zoom), [zoom]);

  /** Страны в исходном порядке — чтобы колонки не прыгали при включении. */
  const visibleCountries = useMemo(
    () => countries.filter((country) => activeCountryIds.includes(country.id)),
    [activeCountryIds],
  );

  /** Колонки стран с учётом заданных пользователем объединений — см. data/columns.ts. */
  const countryColumns = useMemo(
    () => buildColumns(activeCountryIds, columnGroups),
    [activeCountryIds, columnGroups],
  );

  /** Колонки стран плюс дорожки включённых слоёв. */
  const { columns, layerState } = useMemo(() => {
    const applied = applyLayers(countryColumns, activeLayerIds, layerPlacements);
    return { columns: applied.columns, layerState: applied.state };
  }, [countryColumns, activeLayerIds, layerPlacements]);

  /** Колонки, которые сейчас делят несколько линий. */
  const sharedColumns = useMemo(() => columns.filter((column) => column.shared), [columns]);

  /** Объекты включённых слоёв, приведённые к обычному виду. */
  const layerItems = useMemo(
    () => materializeLayerItems(layerState.placed.map((item) => item.id), layerPlacements, activeCountryIds[0] ?? defaultCountryIds[0]),
    [activeCountryIds, layerPlacements, layerState.placed],
  );

  const allItems = useMemo(
    () => [...timelineItems, ...addedPeople, ...layerItems],
    [addedPeople, layerItems],
  );

  const allRelations = useMemo(
    () => [...baseRelations, ...addedRelations],
    [addedRelations],
  );

  const filter = useMemo(
    () => ({ layer, countries: activeCountryIds, query, tags, keyOnly, period, showBce }),
    [layer, activeCountryIds, query, tags, keyOnly, period, showBce],
  );

  const filteredItems = useMemo(() => filterItems(allItems, filter), [allItems, filter]);

  const groups = useMemo(
    () => buildGroups(filteredItems, columns, granularity),
    [filteredItems, columns, granularity],
  );

  /** Сколько строк реально раздробилось — показываем это в подсказке масштаба. */
  const splitRows = useMemo(
    () => groups.filter((group) => group.month !== undefined).length,
    [groups],
  );

  const stats = useMemo(() => summarize(filteredItems), [filteredItems]);

  /** Сколько объектов дала бы каждая страна при текущих остальных фильтрах. */
  const countryCounts = useMemo(() => {
    const matching = filterItems(allItems, { ...filter, countries: allCountryIds });
    const counts: Record<string, number> = {};
    for (const id of allCountryIds) counts[id] = 0;
    for (const item of matching) counts[item.country] += 1;
    return counts;
  }, [allItems, filter]);

  /** Последний год базы: по нему строится сетка интервалов в фильтре периода. */
  const maxYear = useMemo(
    () => allItems.reduce((max, item) => Math.max(max, item.endYear ?? item.year), 1),
    [allItems],
  );

  /**
   * Сколько объектов дал бы каждый отрезок времени при остальных фильтрах.
   * Считается один раз на все эпохи и интервалы: список периодов короткий,
   * а читателю важно видеть, что в раннем Средневековье пусто, ещё до выбора.
   */
  const periodCounts = useMemo(() => {
    const matching = filterItems(allItems, { ...filter, period: undefined });
    const counts = {
      eras: Object.fromEntries(eras.map((era) => [era.id, 0])) as Record<string, number>,
      intervals: Object.fromEntries(intervalPeriods(maxYear).map((interval) => [interval.from, 0])) as Record<
        number,
        number
      >,
    };

    for (const item of matching) {
      for (const era of eras) {
        if (periodContains({ type: 'era', id: era.id }, item.year, item.endYear)) counts.eras[era.id] += 1;
      }
      for (const interval of intervalPeriods(maxYear)) {
        if (periodContains({ type: 'interval', ...interval }, item.year, item.endYear)) {
          counts.intervals[interval.from] += 1;
        }
      }
    }

    return counts;
  }, [allItems, filter, maxYear]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId),
    [filteredItems, selectedId],
  );

  const itemsById = useMemo(() => {
    const index: Record<string, TimelineItem> = {};
    for (const item of allItems) index[item.id] = item;
    return index;
  }, [allItems]);

  const resolveItem = useCallback((id: string) => itemsById[id], [itemsById]);

  /** Объект, открытый в модальном окне с полным текстом. */
  const openedItem = openedId ? itemsById[openedId] : undefined;

  /** Группа-год, открытая в окне «одна дата, несколько стран». */
  const openedDay = useMemo(
    () => (openedDayKey ? groups.find((group) => group.key === openedDayKey) : undefined),
    [groups, openedDayKey],
  );

  const openedRelation = useMemo(
    () => allRelations.find((relation) => relation.id === openedRelationId),
    [allRelations, openedRelationId],
  );

  const openedRelationEnds = useMemo(() => {
    if (!openedRelation) return undefined;
    const from = itemsById[openedRelation.from];
    const to = itemsById[openedRelation.to];
    return from && to ? { from, to } : undefined;
  }, [itemsById, openedRelation]);

  const openedItemRelations = useMemo(
    () =>
      openedItem
        ? allRelations.filter(
            (relation) => relation.from === openedItem.id || relation.to === openedItem.id,
          )
        : [],
    [allRelations, openedItem],
  );

  const openedContemporaries = useMemo(
    () => (openedItem ? findContemporaries(openedItem, allItems) : []),
    [allItems, openedItem],
  );

  const activeStory = useMemo(
    () => storyRoutes.find((story) => story.id === activeStoryId),
    [activeStoryId],
  );

  const backToDay = useMemo(() => {
    if (!returnDayKey) return undefined;
    const group = groups.find((item) => item.key === returnDayKey);
    return group ? { key: group.key, label: group.label } : undefined;
  }, [groups, returnDayKey]);

  /**
   * Связи, которые сейчас можно нарисовать: обе стороны прошли фильтры
   * и находятся в видимых колонках.
   */
  const visibleRelations = useMemo(() => {
    if (!showRelations) return [];
    const visible = new Set(filteredItems.map((item) => item.id));
    return allRelations.filter(
      (relation) => visible.has(relation.from) && visible.has(relation.to),
    );
  }, [allRelations, filteredItems, showRelations]);

  // Запоминаем последний удачно выбранный объект, чтобы искать по нему замену.
  const lastSelectedRef = useRef<TimelineItem | undefined>(undefined);
  useEffect(() => {
    if (selectedItem) lastSelectedRef.current = selectedItem;
  }, [selectedItem]);

  // Если объект исчез из-за фильтра или скрытия страны — выбираем ближайший.
  useEffect(() => {
    if (!selectedId || selectedItem) return;
    const nearest = findNearestItem(filteredItems, lastSelectedRef.current);
    setSelectedId(nearest?.id);
  }, [filteredItems, selectedId, selectedItem]);

  /**
   * Соседи открытого объекта внутри его собственной линии — для перехода
   * «раньше / позже» прямо из модального окна. Считаем по всей базе, а не по
   * отфильтрованной выборке: читатель статьи не должен упираться в фильтр.
   */
  const neighbours = useMemo(() => {
    if (!openedItem) return {};
    const line = allItems
      .filter((item) => item.country === openedItem.country)
      .sort((a, b) => timeKey(a) - timeKey(b));
    const index = line.findIndex((item) => item.id === openedItem.id);
    return { previous: line[index - 1], next: line[index + 1] };
  }, [allItems, openedItem]);

  const selectItem = useCallback((item: TimelineItem, options?: { scroll?: boolean }) => {
    setSelectedId(item.id);
    if (options?.scroll) setScrollTarget({ id: item.id, nonce: Date.now() });
  }, []);

  const clearSelection = useCallback(() => setSelectedId(undefined), []);

  /** Открыть полный текст. Объект заодно становится выбранным, чтобы подсветился год. */
  const openItem = useCallback(
    (item: TimelineItem, options?: { fromDay?: string; scroll?: boolean }) => {
      setSelectedId(item.id);
      setOpenedId(item.id);
      setOpenedDayKey(undefined);
      setOpenedRelationId(undefined);
      // Возврат к списку года запоминается только при переходе именно оттуда.
      if (options?.fromDay !== undefined) setReturnDayKey(options.fromDay);
      if (options?.scroll) setScrollTarget({ id: item.id, nonce: Date.now() });
    },
    [],
  );

  /** Открыть окно со всеми событиями одного года. */
  const openDay = useCallback((key: string) => {
    setOpenedDayKey(key);
    setOpenedId(undefined);
    setOpenedRelationId(undefined);
    setReturnDayKey(undefined);
  }, []);

  /** Открыть объяснение связи между двумя объектами. */
  const openRelation = useCallback((relation: { id: string }) => {
    setOpenedRelationId(relation.id);
    setOpenedId(undefined);
    setOpenedDayKey(undefined);
  }, []);

  const closeModals = useCallback(() => {
    setOpenedId(undefined);
    setOpenedDayKey(undefined);
    setOpenedRelationId(undefined);
    setReturnDayKey(undefined);
  }, []);

  const toggleCountry = useCallback(
    (id: CountryId) => {
      setActiveCountryIds((current) => {
        if (current.includes(id)) {
          // Последнюю страну скрыть нельзя.
          if (current.length === 1) return current;
          return current.filter((value) => value !== id);
        }
        return allCountryIds.filter((value) => value === id || current.includes(value));
      });
    },
    [setActiveCountryIds],
  );

  /**
   * Применить набор стран.
   *
   * Набор заменяет выбор целиком, а не добавляется к нему: смысл набора в том,
   * чтобы одним нажатием получить предсказуемую раскладку. Объединения колонок
   * при этом сбрасываются — они были сделаны для прежнего состава.
   */
  const applyCountrySet = useCallback(
    (ids: CountryId[]) => {
      const next = normalizeSet(ids);
      if (next.length === 0) return;
      setActiveCountryIds(next);
      setColumnGroups([]);
    },
    [setActiveCountryIds, setColumnGroups],
  );

  /** Сохранить текущий выбор как свой набор. */
  const saveCountrySet = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      setUserCountrySets((current) => [
        ...current.filter((set) => set.label !== trimmed),
        { id: `user-${Date.now()}`, label: trimmed, countries: activeCountryIds },
      ].slice(-MAX_USER_SETS));
    },
    [activeCountryIds, setUserCountrySets],
  );

  const removeCountrySet = useCallback(
    (id: string) => setUserCountrySets((current) => current.filter((set) => set.id !== id)),
    [setUserCountrySets],
  );

  /** Встроенные и свои наборы в одном списке — UI их не различает. */
  const countrySets = useMemo(
    () => [
      ...builtinCountrySets.map((set) => ({ ...set, builtin: true })),
      ...userCountrySets,
    ],
    [userCountrySets],
  );

  /** Добавить страну в колонку другой страны. */
  const mergeCountry = useCallback(
    (target: CountryId, source: CountryId) =>
      setColumnGroups((current) => mergeIntoGroups(current, target, source)),
    [setColumnGroups],
  );

  /** Вернуть страну в собственную колонку. */
  const detachCountry = useCallback(
    (id: CountryId) => setColumnGroups((current) => detachFromGroups(current, id)),
    [setColumnGroups],
  );

  const resetColumns = useCallback(() => setColumnGroups([]), [setColumnGroups]);

  const setNote = useCallback(
    (itemId: string, note: string) => {
      setNotes((current) => {
        const next = { ...current };
        if (note.trim()) next[itemId] = note;
        else delete next[itemId];
        return next;
      });
    },
    [setNotes],
  );

  const resetFilters = useCallback(() => {
    setLayer('all');
    setQuery('');
    setKeyOnly(false);
    setPeriod(undefined);
    setShowBce(true);
    setTags([]);
  }, [setPeriod, setShowBce]);

  const ensureCountryVisible = useCallback(
    (id: CountryId) => {
      setActiveCountryIds((current) =>
        current.includes(id) ? current : allCountryIds.filter((value) => value === id || current.includes(value)),
      );
    },
    [setActiveCountryIds],
  );

  /** Фокусирует шаг маршрута и гарантирует, что его карточка не скрыта фильтрами. */
  const goToStoryStep = useCallback(
    (storyId: string, requestedStep: number, options?: { open?: boolean }) => {
      const story = storyRoutes.find((candidate) => candidate.id === storyId);
      if (!story) return;
      const nextStep = Math.max(0, Math.min(story.steps.length - 1, requestedStep));
      const item = itemsById[story.steps[nextStep].itemId];
      if (!item) return;

      setActiveStoryId(story.id);
      setStoryStep(nextStep);
      ensureCountryVisible(item.country);
      setLayer('all');
      setQuery('');
      setKeyOnly(false);
      setPeriod(undefined);
      if (item.year < 0) setShowBce(true);
      setTags([]);
      setSelectedId(item.id);
      setScrollTarget({ id: item.id, nonce: Date.now() });
      if (options?.open) openItem(item, { scroll: true });
    },
    [ensureCountryVisible, itemsById, openItem, setPeriod, setShowBce],
  );

  const stopStory = useCallback(() => {
    setActiveStoryId(undefined);
    setStoryStep(0);
  }, []);

  // Состояние исследования канонически отражается в URL. replaceState не засоряет
  // историю браузера при каждом символе поиска, но ссылка всегда готова к копированию.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = buildTimelineUrl(
      {
        countries: activeCountryIds,
        kind: layer,
        query,
        keyOnly,
        period,
        showBce,
        tags,
        zoom,
        activeLayerIds,
        layerPlacements,
        columnGroups,
        selectedId,
        openedId,
        openedDayKey,
        openedRelationId,
        showRelations,
        storyId: activeStory?.id,
        storyStep,
      },
      window.location.href,
    );
    window.history.replaceState(window.history.state, '', url);
  }, [
    activeCountryIds,
    activeLayerIds,
    activeStory?.id,
    columnGroups,
    keyOnly,
    layer,
    layerPlacements,
    openedId,
    openedDayKey,
    openedRelationId,
    period,
    query,
    selectedId,
    showBce,
    showRelations,
    storyStep,
    tags,
    zoom,
  ]);

  /**
   * Включает слой. Предел одновременных слоёв — визуальный, а не архитектурный:
   * раскладка обрабатывает любое их число, ограничение задаётся одной константой.
   */
  const addLayer = useCallback(
    (layerId: string) => {
      setActiveLayerIds((current) =>
        current.includes(layerId) || current.length >= MAX_ACTIVE_LAYERS
          ? current
          : [...current, layerId],
      );
    },
    [setActiveLayerIds],
  );

  const removeLayer = useCallback(
    (layerId: string) => setActiveLayerIds((current) => current.filter((id) => id !== layerId)),
    [setActiveLayerIds],
  );

  const toggleLayer = useCallback(
    (layerId: string) => {
      setActiveLayerIds((current) => {
        if (current.includes(layerId)) return current.filter((id) => id !== layerId);
        return current.length >= MAX_ACTIVE_LAYERS ? current : [...current, layerId];
      });
    },
    [setActiveLayerIds],
  );

  /** Переносит слой на другую страну или в собственную колонку. */
  const placeLayer = useCallback(
    (layerId: string, placement: LayerPlacement) => {
      setLayerPlacements((current) => ({ ...current, [layerId]: placement }));
      if (placement !== OWN_COLUMN) ensureCountryVisible(placement);
    },
    [ensureCountryVisible, setLayerPlacements],
  );

  const placementOf = useCallback(
    (layerId: string): LayerPlacement =>
      layerPlacements[layerId] ?? layerById[layerId]?.defaultPlacement ?? OWN_COLUMN,
    [layerPlacements],
  );

  const onlyCountry = useCallback((id: CountryId) => setActiveCountryIds([id]), [setActiveCountryIds]);


  /**
   * Добавление деятеля из конструктора.
   * Страна автоматически становится видимой, слой сбрасывается, если персоналии скрыты,
   * а сам объект выделяется и подтягивает к себе прокрутку.
   */
  const addPerson = useCallback(
    (draft: Omit<TimelineItem, 'id' | 'custom'>, links: RelationDraftInput[] = []) => {
      const id = `custom-${draft.country}-${draft.year}-${Math.random().toString(36).slice(2, 8)}`;
      const item: TimelineItem = { ...draft, id, custom: true };

      setAddedPeople((current) => [...current, item]);
      if (links.length > 0) {
        setAddedRelations((current) => [
          ...current,
          ...links.map((link, index) => ({
            id: `${id}-rel-${index}`,
            from: id,
            ...link,
            verification: 'verified' as const,
          })),
        ]);
      }
      ensureCountryVisible(item.country);
      setKeyOnly(false);
      setPeriod(undefined);
      if (item.year < 0) setShowBce(true);
      setTags([]);
      setQuery('');
      if (layer === 'events' && item.kind === 'person') setLayer('all');
      if (layer === 'people' && item.kind === 'event') setLayer('all');
      setSelectedId(id);
      setScrollTarget({ id, nonce: Date.now() });
      return item;
    },
    [ensureCountryVisible, layer, setAddedPeople, setAddedRelations, setPeriod, setShowBce],
  );

  const removePerson = useCallback(
    (id: string) => {
      setAddedPeople((current) => current.filter((item) => item.id !== id));
      setAddedRelations((current) =>
        current.filter((relation) => relation.from !== id && relation.to !== id),
      );
      setSelectedId((current) => (current === id ? undefined : current));
    },
    [setAddedPeople, setAddedRelations],
  );

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'parchment' ? 'atlas' : 'parchment')),
    [setTheme],
  );

  const toggleTag = useCallback((tag: string) => {
    setTags((current) => (current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]));
  }, []);

  const totalStats = useMemo(() => summarize(allItems), [allItems]);

  return {
    // данные
    countries,
    visibleCountries,
    columns,
    sharedColumns,
    columnGroups,
    maxColumns: MAX_COLUMNS,
    maxPerColumn: MAX_PER_COLUMN,
    groups,
    filteredItems,
    allItems,
    stats,
    totalStats,
    countryCounts,
    periodCounts,
    maxYear,
    selectedItem,
    openedItem,
    openedCountry: openedItem ? countryById[openedItem.country] : undefined,
    openedEra: openedItem ? eraForYear(openedItem.year) : undefined,
    openedDay,
    openedRelation,
    openedRelationEnds,
    openedItemRelations,
    openedContemporaries,
    backToDay,
    visibleRelations,
    resolveItem,
    neighbours,
    addedPeople,
    addedRelations,
    notes,
    layers: allLayers,
    activeLayerIds,
    layerState,
    layerItems,
    maxLayers: MAX_ACTIVE_LAYERS,
    placementOf,
    allRelations,
    scrollTarget,
    stories: storyRoutes,
    activeStory,
    storyStep,
    activeStoryItem: activeStory ? itemsById[activeStory.steps[storyStep]?.itemId] : undefined,

    // состояние
    theme,
    layer,
    query,
    keyOnly,
    period,
    showBce,
    tags,
    zoom,
    granularity,
    granularityLabel: granularityLabel(granularity),
    splitRows,
    activeCountryIds,
    expanded,

    // действия
    setLayer,
    setQuery,
    setKeyOnly,
    setPeriod,
    setShowBce,
    setTags,
    toggleTag,
    setZoom,
    setExpanded,
    selectItem,
    clearSelection,
    openItem,
    openDay,
    openRelation,
    closeModals,
    showRelations,
    setShowRelations,
    toggleCountry,
    countrySets,
    applyCountrySet,
    saveCountrySet,
    removeCountrySet,
    onlyCountry,
    mergeCountry,
    detachCountry,
    resetColumns,
    setNote,
    addLayer,
    removeLayer,
    toggleLayer,
    placeLayer,
    goToStoryStep,
    stopStory,
    resetFilters,
    addPerson,
    removePerson,
    toggleTheme,
  };
}

export type TimelineState = ReturnType<typeof useTimelineState>;
