import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CountryId, EraId, KindFilter, RelationDraftInput, ThemeName, TimelineItem } from '../types';
import { allCountryIds, countries, countryById } from '../data/countries';
import {
  buildColumns,
  detachCountry as detachFromGroups,
  mergeCountries as mergeIntoGroups,
  MAX_COLUMNS,
  MAX_PER_COLUMN,
  type ColumnGroups,
} from '../data/columns';
import { eraForYear } from '../data/eras';
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

export type ScrollTarget = { id: string; nonce: number };

/**
 * Всё состояние приложения в одном месте.
 *
 * Хук сознательно отделён от компонентов: экраны получают готовые данные
 * и действия, а логика фильтрации, выбора и добавления персоналий живёт здесь.
 * Это позволит подменить источник данных (JSON, CMS, API) не трогая UI.
 */
export function useTimelineState() {
  const [theme, setTheme] = usePersistentState<ThemeName>('theme', 'parchment');
  const [layer, setLayer] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [keyOnly, setKeyOnly] = useState(false);
  const [era, setEra] = useState<EraId | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [zoom, setZoomRaw] = usePersistentState<number>('zoom', 1);
  const [activeCountryIds, setActiveCountryIds] = usePersistentState<CountryId[]>(
    'countries',
    allCountryIds,
  );
  const [addedPeople, setAddedPeople] = usePersistentState<TimelineItem[]>('added-people', []);
  /** Объединения колонок задаёт пользователь; по умолчанию у каждой страны своя колонка. */
  const [columnGroups, setColumnGroups] = usePersistentState<ColumnGroups>('column-groups', []);
  /** Связи, созданные пользователем вместе с добавленными объектами. */
  const [addedRelations, setAddedRelations] = usePersistentState<Relation[]>('added-relations', []);
  /** Личные заметки читателя. Хранятся отдельно от базы фактов и не смешиваются с ней. */
  const [notes, setNotes] = usePersistentState<Record<string, string>>('notes', {});
  /** Включённые слои и их размещение — по умолчанию слоёв нет. */
  const [activeLayerIds, setActiveLayerIds] = usePersistentState<string[]>('layers', []);
  const [layerPlacements, setLayerPlacements] = usePersistentState<LayerPlacements>(
    'layer-placements',
    {},
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [openedId, setOpenedId] = useState<string | undefined>(undefined);
  const [openedDayKey, setOpenedDayKey] = useState<string | undefined>(undefined);
  const [openedRelationId, setOpenedRelationId] = useState<string | undefined>(undefined);
  /** Год, из окна которого открыли статью, — для кнопки возврата. */
  const [returnDayKey, setReturnDayKey] = useState<string | undefined>(undefined);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [showRelations, setShowRelations] = usePersistentState('show-relations', true);

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
    () => materializeLayerItems(layerState.placed.map((item) => item.id), layerPlacements, activeCountryIds[0] ?? 'germany'),
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
    () => ({ layer, countries: activeCountryIds, query, tags, keyOnly, era }),
    [layer, activeCountryIds, query, tags, keyOnly, era],
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

  const showAllCountries = useCallback(() => setActiveCountryIds(allCountryIds), [setActiveCountryIds]);

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
    setEra(undefined);
    setTags([]);
  }, []);

  const ensureCountryVisible = useCallback(
    (id: CountryId) => {
      setActiveCountryIds((current) =>
        current.includes(id) ? current : allCountryIds.filter((value) => value === id || current.includes(value)),
      );
    },
    [setActiveCountryIds],
  );

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
      setEra(undefined);
      setTags([]);
      setQuery('');
      if (layer === 'events' && item.kind === 'person') setLayer('all');
      if (layer === 'people' && item.kind === 'event') setLayer('all');
      setSelectedId(id);
      setScrollTarget({ id, nonce: Date.now() });
      return item;
    },
    [ensureCountryVisible, layer, setAddedPeople, setAddedRelations],
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
    selectedItem,
    openedItem,
    openedCountry: openedItem ? countryById[openedItem.country] : undefined,
    openedEra: openedItem ? eraForYear(openedItem.year) : undefined,
    openedDay,
    openedRelation,
    openedRelationEnds,
    openedItemRelations,
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

    // состояние
    theme,
    layer,
    query,
    keyOnly,
    era,
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
    setEra,
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
    showAllCountries,
    onlyCountry,
    mergeCountry,
    detachCountry,
    resetColumns,
    setNote,
    addLayer,
    removeLayer,
    toggleLayer,
    placeLayer,
    resetFilters,
    addPerson,
    removePerson,
    toggleTheme,
  };
}

export type TimelineState = ReturnType<typeof useTimelineState>;
