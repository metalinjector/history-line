import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CountryId, EraId, Layer, ThemeName, TimelineItem } from '../types';
import { allCountryIds, countries, countryById } from '../data/countries';
import { buildColumns, MAX_COLUMNS } from '../data/columns';
import { eraForYear } from '../data/eras';
import { timelineItems } from '../data/timelineItems';
import { buildGroups, filterItems, findNearestItem, summarize } from './timeline';
import { timeKey } from './format';
import { usePersistentState } from './usePersistentState';

const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.2;

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
  const [layer, setLayer] = useState<Layer>('all');
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
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [openedId, setOpenedId] = useState<string | undefined>(undefined);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);

  const setZoom = useCallback(
    (value: number) => setZoomRaw(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))),
    [setZoomRaw],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--zoom', String(zoom));
  }, [zoom]);

  /** Страны в исходном порядке — чтобы колонки не прыгали при включении. */
  const visibleCountries = useMemo(
    () => countries.filter((country) => activeCountryIds.includes(country.id)),
    [activeCountryIds],
  );

  /**
   * Колонки таблицы. Когда включённых стран больше, чем помещается колонок,
   * близкие линии объединяются в общие дорожки — см. data/columns.ts.
   */
  const columns = useMemo(() => buildColumns(activeCountryIds), [activeCountryIds]);

  /** Пары, которые сейчас делят колонку, — о них нужно сказать пользователю. */
  const sharedColumns = useMemo(() => columns.filter((column) => column.shared), [columns]);

  const allItems = useMemo(() => [...timelineItems, ...addedPeople], [addedPeople]);

  const filter = useMemo(
    () => ({ layer, countries: activeCountryIds, query, tags, keyOnly, era }),
    [layer, activeCountryIds, query, tags, keyOnly, era],
  );

  const filteredItems = useMemo(() => filterItems(allItems, filter), [allItems, filter]);

  const groups = useMemo(() => buildGroups(filteredItems, columns), [filteredItems, columns]);

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

  /** Объект, открытый в модальном окне с полным текстом. */
  const openedItem = useMemo(
    () => allItems.find((item) => item.id === openedId),
    [allItems, openedId],
  );

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
  const openItem = useCallback((item: TimelineItem) => {
    setSelectedId(item.id);
    setOpenedId(item.id);
  }, []);

  const closeItem = useCallback(() => setOpenedId(undefined), []);

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

  const onlyCountry = useCallback((id: CountryId) => setActiveCountryIds([id]), [setActiveCountryIds]);

  const ensureCountryVisible = useCallback(
    (id: CountryId) => {
      setActiveCountryIds((current) =>
        current.includes(id) ? current : allCountryIds.filter((value) => value === id || current.includes(value)),
      );
    },
    [setActiveCountryIds],
  );

  const resetFilters = useCallback(() => {
    setLayer('all');
    setQuery('');
    setKeyOnly(false);
    setEra(undefined);
    setTags([]);
  }, []);

  /**
   * Добавление деятеля из конструктора.
   * Страна автоматически становится видимой, слой сбрасывается, если персоналии скрыты,
   * а сам объект выделяется и подтягивает к себе прокрутку.
   */
  const addPerson = useCallback(
    (draft: Omit<TimelineItem, 'id' | 'custom'>) => {
      const id = `custom-${draft.country}-${draft.year}-${Math.random().toString(36).slice(2, 8)}`;
      const item: TimelineItem = { ...draft, id, custom: true };

      setAddedPeople((current) => [...current, item]);
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
    [ensureCountryVisible, layer, setAddedPeople],
  );

  const removePerson = useCallback(
    (id: string) => {
      setAddedPeople((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => (current === id ? undefined : current));
    },
    [setAddedPeople],
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
    maxColumns: MAX_COLUMNS,
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
    neighbours,
    addedPeople,
    scrollTarget,

    // состояние
    theme,
    layer,
    query,
    keyOnly,
    era,
    tags,
    zoom,
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
    closeItem,
    toggleCountry,
    showAllCountries,
    onlyCountry,
    resetFilters,
    addPerson,
    removePerson,
    toggleTheme,
  };
}

export type TimelineState = ReturnType<typeof useTimelineState>;
