import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual';
import type { Orientation, TimelineItem } from '../types';
import type { TimelineState } from '../lib/useTimelineState';
import { eras } from '../data/eras';
import { columnOfItem } from '../data/columns';
import { formatEraRange, formatYearLabel, timeKey } from '../lib/format';
import { groupKeyOf } from '../lib/timeline';
import { trackOfItem } from '../lib/layers';
import { navigationStep, revealScroll } from '../lib/orientation';
import { usePanning } from '../lib/usePanning';
import { useWheelAlongTime } from '../lib/useWheelAlongTime';
import { TimelineControls } from './TimelineControls';
import { CountryTogglePanel } from './CountryTogglePanel';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';
import { TimelineOverlay } from './TimelineOverlay';
import { LayerMenu } from './LayerMenu';
import { fitZoom } from '../lib/zoom';
import { StoryChooser, StoryPlayer } from './StoryPanel';
import { EditorialDashboard } from './EditorialDashboard';
import { ResearchTools } from './ResearchTools';
import './TimelineSection.css';
import './TimelineHorizontal.css';

// Окна тянут за собой разбор Markdown, KaTeX, загрузчик Mermaid и редакционную
// базу (статьи и источники), поэтому живут в отдельном чанке. Первый экран
// его не ждёт: чанк начинает грузиться, когда браузер освободится, — к первому
// клику окно обычно уже готово. Ошибку фоновой загрузки можно не замечать:
// lazy повторит запрос, когда окно понадобится.
const loadModalHost = () => import('./modal/ModalHost');
const ModalHost = lazy(loadModalHost);
const prefetchModalHost = () => void loadModalHost().catch(() => undefined);

type Props = {
  state: TimelineState;
  sectionRef: React.RefObject<HTMLElement | null>;
};

/** Что запомнить перед поворотом шкалы, чтобы после него открыть то же место. */
type OrientationAnchor = { selectedId?: string; groupIndex: number };

/*
  Прокрутка к карточке. Поперёк времени всё делается без анимации: вдоль
  времени плавно едет виртуализатор, и новая плавная прокрутка того же поля
  оборвала бы его на полпути.
*/

/** Ставит дорожку (по её подписи в шапке) на долю share поля поперёк времени. */
function scrollAcross(viewport: HTMLElement, cell: HTMLElement, horizontal: boolean, share: number) {
  const frame = viewport.getBoundingClientRect();
  const rect = cell.getBoundingClientRect();
  if (horizontal) {
    const top = viewport.scrollTop + rect.top - frame.top - (frame.height - rect.height) * share;
    viewport.scrollTo({ top: Math.max(0, top) });
  } else {
    const left = viewport.scrollLeft + rect.left - frame.left - (frame.width - rect.width) * share;
    viewport.scrollTo({ left: Math.max(0, left) });
  }
}

/**
 * Досдвигает поле поперёк времени, если карточка видна не целиком: раскрытая
 * карточка нижней полосы выступает за полосу, и место под неё появляется
 * только после отрисовки. Узел на линии над карточкой тоже должен быть виден.
 */
function revealAcross(viewport: HTMLElement, card: HTMLElement, horizontal: boolean) {
  const frame = viewport.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  const corner = viewport.querySelector<HTMLElement>('.thead__date');
  if (horizontal) {
    const nodeTop = card.querySelector('.tcard__node')?.getBoundingClientRect().top ?? rect.top;
    const offset = viewport.scrollTop - frame.top - viewport.clientTop;
    const start = Math.min(rect.top, nodeTop) + offset;
    const size = rect.bottom + offset - start;
    const next = revealScroll(start, size, viewport.scrollTop, viewport.clientHeight, corner?.offsetHeight ?? 0);
    if (next !== undefined) viewport.scrollTo({ top: Math.max(0, next) });
  } else {
    const start = rect.left + viewport.scrollLeft - frame.left - viewport.clientLeft;
    const next = revealScroll(start, rect.width, viewport.scrollLeft, viewport.clientWidth, corner?.offsetWidth ?? 0);
    if (next !== undefined) viewport.scrollTo({ left: Math.max(0, next) });
  }
}

/** Ставит карточку в середину поля вдоль времени. */
function scrollAlong(viewport: HTMLElement, card: HTMLElement, horizontal: boolean, behavior: ScrollBehavior) {
  const frame = viewport.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  if (horizontal) {
    const left = viewport.scrollLeft + rect.left - frame.left + (rect.width - frame.width) / 2;
    viewport.scrollTo({ left: Math.max(0, left), behavior });
  } else {
    const top = viewport.scrollTop + rect.top - frame.top + (rect.height - frame.height) / 2;
    viewport.scrollTo({ top: Math.max(0, top), behavior });
  }
}

/**
 * Вызывает done, когда read() три кадра подряд возвращает одно и то же
 * значение, но не позже чем через три секунды. Виртуализатор после дальнего
 * прыжка ещё несколько сотен миллисекунд доизмеряет группы и поправляет
 * прокрутку — доводка раньше этого была бы им же и отменена.
 */
function whenAtRest(read: () => number | undefined, done: () => void) {
  let last: number | undefined;
  let stableFrames = 0;
  let frames = 0;
  const tick = () => {
    const value = read();
    stableFrames = value !== undefined && last !== undefined && Math.abs(value - last) < 1 ? stableFrames + 1 : 0;
    last = value;
    if (stableFrames >= 3 || ++frames > 180) done();
    else window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

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
    period,
    showBce,
    tags,
    zoom,
    orientation,
    expanded,
    granularity,
    setLayer,
    setQuery,
    setKeyOnly,
    setPeriod,
    setShowBce,
    setTags,
    setZoom,
    setOrientation,
    setExpanded,
    selectItem,
    clearSelection,
    openItem,
    openDay,
    openRelation,
    toggleCountry,
    onlyCountry,
    mergeCountry,
    detachCountry,
    resetColumns,
    resetFilters,
  } = state;

  /**
   * Ось времени. Вертикальная шкала — строки лет под шапкой стран,
   * горизонтальная — столбцы лет справа от подписей полос. Разметка групп
   * одна и та же, поэтому здесь различается только то, вдоль какой оси
   * идёт виртуализация, прокрутка и навигация; раскладку меняет CSS.
   */
  const horizontal = orientation === 'horizontal';

  useEffect(() => {
    // requestIdleCallback нет в Safari — там хватает обычной задержки.
    if (typeof window.requestIdleCallback !== 'function') {
      const timer = window.setTimeout(prefetchModalHost, 2000);
      return () => window.clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(prefetchModalHost, { timeout: 5000 });
    return () => window.cancelIdleCallback(handle);
  }, []);

  const { ref: viewportRef, isPanning, onPointerDown, didPan } = usePanning<HTMLDivElement>();
  useWheelAlongTime(viewportRef, horizontal);
  const gridRef = useRef<HTMLDivElement>(null);
  /** Контейнер виртуализированных групп — нужен, чтобы измерить отступ от
   *  начала поля прокрутки до начала списка групп (перед ним стоят шапка и
   *  стартовая группа «начало выборки»). Без этого scrollMargin виртуализатор
   *  считал бы видимый диапазон от нуля и прорисовывал бы лишние группы. */
  const rowsRef = useRef<HTMLDivElement>(null);
  /** Слой, который сейчас тащат мышью: колонки становятся зонами приёма. */
  const [draggingLayerId, setDraggingLayerId] = useState<string | undefined>();

  /** Плоский список в порядке шкалы — для навигации стрелками. */
  const ordered = useMemo(
    () => [...filteredItems].sort((a, b) => timeKey(a) - timeKey(b) || a.country.localeCompare(b.country)),
    [filteredItems],
  );

  /** Отступ от начала поля прокрутки до начала списка групп вдоль оси времени.
   *  Шапка и стартовая группа стоят перед группами в одном scroll-контейнере,
   *  поэтому виртуализатору нужно знать, что видимый диапазон начинается
   *  не от нуля, а после этих элементов. */
  const [scrollMargin, setScrollMargin] = useState(0);
  /** Толщина липкой шапки вдоль оси времени: группа, к которой прокручивают,
   *  должна вставать сразу за ней, а не прятаться под ней. */
  const [stickyHead, setStickyHead] = useState(0);
  const hasGroups = groups.length > 0;

  // Измеряем до отрисовки кадра: после поворота шкалы виртуализатор новой оси
  // должен сразу получить верный отступ, иначе прокрутка к якорю промахнётся.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const rows = rowsRef.current;
    const head = viewport?.querySelector<HTMLElement>('.thead');
    if (!viewport) return;
    const measure = () => {
      if (head) {
        const size = horizontal ? head.offsetWidth : head.offsetHeight;
        setStickyHead((prev) => (size !== prev ? size : prev));
      }
      if (!rows) return;
      const rowsRect = rows.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const next = horizontal
        ? rowsRect.left - viewportRect.left - viewport.clientLeft + viewport.scrollLeft
        : rowsRect.top - viewportRect.top - viewport.clientTop + viewport.scrollTop;
      setScrollMargin((prev) => (next >= 0 && next !== prev ? next : prev));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    if (rows) observer.observe(rows);
    if (head) observer.observe(head);
    return () => observer.disconnect();
  }, [hasGroups, horizontal, viewportRef]);

  /** Карта ключ группы → индекс в массиве groups — для быстрого поиска при
   *  навигации (стрелки, эпохи, прокрутка к объекту после добавления). */
  const groupIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < groups.length; i++) map.set(groups[i].key, i);
    return map;
  }, [groups]);

  /**
   * Линии, у которых в текущей выборке нет ни одного объекта. В горизонтальной
   * шкале такая полоса ужимается до тонкой линии с подписью: после поиска
   * или выбора эпохи экран не должен заполняться пустыми полосами.
   */
  const emptyColumnIds = useMemo(() => {
    const filled = new Set<string>();
    for (const group of groups) {
      for (const [columnId, items] of Object.entries(group.byColumn)) {
        if (items.length > 0) filled.add(columnId);
      }
    }
    return new Set(columns.filter((column) => !filled.has(column.id)).map((column) => column.id));
  }, [columns, groups]);

  /**
   * Нити измеряют координаты реальных DOM-узлов. Поэтому группы с концами
   * видимых связей должны оставаться смонтированными даже за пределами
   * обычного окна виртуализации. Таких групп немного: не более двух на связь.
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

  /**
   * По виртуализатору на каждую ось: размеры, измеренные по одной оси,
   * бессмысленны для другой (высота строки ≠ ширина столбца). Работает только
   * виртуализатор текущей ориентации; второй отключён, но помнит свои размеры,
   * и обратный поворот не начинается с оценок.
   */
  const sharedVirtualizerOptions = {
    count: groups.length,
    getScrollElement: () => viewportRef.current,
    getItemKey: (index: number) => groups[index]?.key ?? index,
    rangeExtractor: relationAwareRange,
    scrollMargin,
    scrollPaddingStart: stickyHead + 8,
  };
  const verticalVirtualizer = useVirtualizer({
    ...sharedVirtualizerOptions,
    enabled: !horizontal,
    estimateSize: () => 64,
    overscan: 8,
  });
  const horizontalVirtualizer = useVirtualizer({
    ...sharedVirtualizerOptions,
    enabled: horizontal,
    horizontal: true,
    // Столбец горизонтальной шкалы — шириной в карточку.
    estimateSize: () => 270,
    overscan: 5,
  });
  const rowVirtualizer = horizontal ? horizontalVirtualizer : verticalVirtualizer;

  /**
   * Измерение группы откладывается на микрозадачу после фиксации DOM.
   * Виртуализатор, поправив прокрутку после измерения, перерисовывается
   * синхронно (flushSync) — а из колбэка ref, то есть посреди фиксации,
   * React 19 этого не позволяет и сыплет предупреждениями. Микрозадача
   * выполняется сразу после фиксации и до отрисовки кадра, так что
   * точность прокрутки к группе не страдает.
   */
  const measureGroup = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        rowVirtualizer.measureElement(null);
        return;
      }
      queueMicrotask(() => {
        if (node.isConnected) rowVirtualizer.measureElement(node);
      });
    },
    [rowVirtualizer],
  );

  const scrollItemIntoView = useCallback(
    (id: string, behavior: ScrollBehavior = 'smooth') => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const item = ordered.find((candidate) => candidate.id === id);
      const card = () => document.getElementById(`item-${id}`);

      // Поперёк времени место дорожки известно сразу — по её подписи в шапке,
      // которая не виртуализируется. Полоса горизонтальной шкалы встаёт
      // в верхнюю треть поля, чтобы под ней хватило места раскрытой карточке.
      const column = item ? columnOfItem(item, columns) : undefined;
      const cell = column
        ? viewport.querySelectorAll<HTMLElement>('.thead__cell')[columns.indexOf(column)]
        : undefined;
      if (cell) scrollAcross(viewport, cell, horizontal, horizontal ? 1 / 3 : 1 / 2);

      const settle = () => {
        const element = card();
        if (!element) return;
        revealAcross(viewport, element, horizontal);
        scrollAlong(viewport, element, horizontal, behavior);
      };

      // Если объект принадлежит группе, которая сейчас не отрендерена
      // (виртуализация), сначала её подвозит виртуализатор — он ставит
      // по центру всю группу. Доводку до самой карточки делаем, только когда
      // он закончил и карточка перестала сдвигаться: раньше он вернул бы
      // прокрутку к своей цели, а в высокой строке 1917 года карточка
      // уезжала бы под шапку.
      const rowIndex = item ? groupIndexByKey.get(groupKeyOf(item, granularity)) : undefined;
      if (rowIndex === undefined) {
        settle();
        return;
      }
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'center', behavior });
      whenAtRest(() => {
        const rect = card()?.getBoundingClientRect();
        return rect && (horizontal ? rect.left : rect.top);
      }, settle);
    },
    [columns, granularity, groupIndexByKey, horizontal, ordered, rowVirtualizer, viewportRef],
  );

  // Ссылка с выбранной карточкой открывает шкалу на ней, а не в начале.
  // Прокручивается только поле хронологии — страница остаётся на месте.
  const initialFocusId = useRef(selectedItem?.id);
  useEffect(() => {
    const id = initialFocusId.current;
    initialFocusId.current = undefined;
    if (id) window.requestAnimationFrame(() => scrollItemIntoView(id, 'auto'));
  }, [scrollItemIntoView]);

  // Внешний запрос на прокрутку (например, после добавления деятеля).
  useEffect(() => {
    if (!scrollTarget) return;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const timer = window.setTimeout(() => scrollItemIntoView(scrollTarget.id), 420);
    return () => window.clearTimeout(timer);
  }, [scrollTarget, scrollItemIntoView, sectionRef]);

  /**
   * Поворот шкалы не должен отбрасывать читателя в её начало. Перед поворотом
   * запоминаем, что он видел: выбранную карточку, если она на экране,
   * иначе первую видимую группу, — и после поворота открываем то же место.
   */
  const orientationAnchor = useRef<OrientationAnchor | undefined>(undefined);

  const changeOrientation = useCallback(
    (next: Orientation) => {
      if (next === orientation) return;
      const viewport = viewportRef.current;
      if (viewport) {
        // Первая группа, видимая за липкой шапкой больше чем наполовину.
        const offset = (horizontal ? viewport.scrollLeft : viewport.scrollTop) + stickyHead;
        const item = rowVirtualizer.getVirtualItemForOffset(offset);
        const groupIndex = item
          ? Math.min(groups.length - 1, item.end - offset < item.size / 2 ? item.index + 1 : item.index)
          : 0;

        let selectedId: string | undefined;
        const card = selectedItem ? document.getElementById(`item-${selectedItem.id}`) : null;
        if (selectedItem && card) {
          const rect = card.getBoundingClientRect();
          const frame = viewport.getBoundingClientRect();
          const onScreen =
            rect.bottom > frame.top && rect.top < frame.bottom && rect.right > frame.left && rect.left < frame.right;
          if (onScreen) selectedId = selectedItem.id;
        }
        orientationAnchor.current = { selectedId, groupIndex };
        // Сбрасываем прокрутку до поворота: виртуализатор новой оси при включении
        // прочитает смещение поля, и старое смещение по другой оси он принял бы
        // за своё.
        viewport.scrollTo({ top: 0, left: 0 });
      }
      setOrientation(next);
    },
    [groups.length, horizontal, orientation, rowVirtualizer, selectedItem, setOrientation, stickyHead, viewportRef],
  );

  const renderedOrientation = useRef(orientation);

  useLayoutEffect(() => {
    if (renderedOrientation.current === orientation) return;
    renderedOrientation.current = orientation;

    const anchor = orientationAnchor.current;
    orientationAnchor.current = undefined;
    if (!anchor) return;

    // Отступ списка и толщина шапки пересчитываются после отрисовки —
    // прокручиваем в следующем кадре, а виртуализатор сам доведёт позицию,
    // когда группы будут измерены.
    window.requestAnimationFrame(() => {
      if (!viewportRef.current) return;
      if (anchor.selectedId) scrollItemIntoView(anchor.selectedId, 'auto');
      else rowVirtualizer.scrollToIndex(anchor.groupIndex, { align: 'start' });
    });
  }, [orientation, rowVirtualizer, scrollItemIntoView, viewportRef]);

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
      const step = navigationStep(orientation, event.key);
      if (!step && event.key !== 'Escape') return;
      const target = event.target as HTMLElement;
      if (!target.closest('.tcard')) return;

      if (!step) {
        clearSelection();
        return;
      }

      if (!selectedItem) return;
      event.preventDefault();

      let nextItem: TimelineItem | undefined;

      if (step.axis === 'time') {
        const index = ordered.findIndex((item) => item.id === selectedItem.id);
        nextItem = ordered[index + step.delta];
      } else {
        // Поперёк времени: соседняя линия в той же группе шкалы — в том порядке,
        // в каком колонки (полосы) и дорожки внутри них стоят на экране.
        // Так в обход не попадают ни унаследованные линии, ни слои.
        const group = groups[groupIndexByKey.get(groupKeyOf(selectedItem, granularity)) ?? -1];
        if (!group) return;
        const lanePosition = (item: TimelineItem): [number, number] => {
          const column = columnOfItem(item, columns);
          return column ? [columns.indexOf(column), trackOfItem(item, column)] : [columns.length, 0];
        };
        const lane = [...group.items].sort((a, b) => {
          const [columnA, trackA] = lanePosition(a);
          const [columnB, trackB] = lanePosition(b);
          return columnA - columnB || trackA - trackB;
        });
        const index = lane.findIndex((item) => item.id === selectedItem.id);
        nextItem = lane[index + step.delta];
      }

      if (!nextItem) return;
      selectItem(nextItem);
      scrollItemIntoView(nextItem.id);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`#item-${nextItem.id} .tcard__hit`)?.focus({ preventScroll: true });
      });
    },
    [
      clearSelection,
      columns,
      granularity,
      groupIndexByKey,
      groups,
      ordered,
      orientation,
      scrollItemIntoView,
      selectItem,
      selectedItem,
    ],
  );

  /**
   * Измеряет базовый размер раскладки поперёк времени через скрытый зонд:
   * в вертикальной шкале — ширину колонки дат и колонок стран,
   * в горизонтальной — высоту линейки лет и полос.
   *
   * Зонд нужен потому, что getComputedStyle вернул бы для --col-width
   * незавершённый calc(), а живые ячейки в режиме растягивания шире базовых —
   * измерение по ним зациклило бы пересчёт.
   */
  const measureCrossSize = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const probe = (name: string) => viewport.querySelector<HTMLElement>(`[data-probe="${name}"]`);

    if (horizontal) {
      const ruler = probe('ruler');
      const rulerFixed = probe('ruler-fixed');
      const lane = probe('lane');
      const laneFixed = probe('lane-fixed');
      const laneEmpty = probe('lane-empty');
      const frame = probe('frame');
      if (!ruler || !rulerFixed || !lane || !laneFixed || !laneEmpty || !frame) return undefined;
      const empty = emptyColumnIds.size;
      const filled = columns.length - empty;
      const size = ruler.offsetHeight + lane.offsetHeight * filled + laneEmpty.offsetHeight * empty;
      return size > 0
        ? {
            size,
            // Линии дорожек, рамки карточек и ужатые пустые полосы от масштаба не зависят.
            fixed: rulerFixed.offsetHeight + laneFixed.offsetHeight * filled + laneEmpty.offsetHeight * empty,
            // Поле горизонтальной шкалы подстраивается под высоту полос, поэтому
            // доступное место — не текущая высота поля, а её предел без рамки
            // и горизонтальной полосы прокрутки.
            available: frame.offsetHeight - (viewport.offsetHeight - viewport.clientHeight),
          }
        : undefined;
    }

    const column = probe('column');
    const date = probe('date');
    if (!column || !date) return undefined;
    const size = date.offsetWidth + column.offsetWidth * columns.length;
    return size > 0 ? { size, fixed: 0, available: viewport.clientWidth } : undefined;
  }, [columns.length, emptyColumnIds, horizontal, viewportRef]);

  /** Если колонки уже, чем поле, они растягиваются и заполняют его целиком.
   *  Полосы горизонтальной шкалы не растягиваются: поле само ужимается до них. */
  const [stretchColumns, setStretchColumns] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (horizontal) {
      setStretchColumns(false);
      return;
    }

    const update = () => {
      const measured = measureCrossSize();
      if (measured) setStretchColumns(measured.size <= measured.available);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [horizontal, measureCrossSize, viewportRef, zoom]);

  /** Подбирает масштаб так, чтобы видимые линии уместились поперёк времени:
   *  колонки — по ширине поля, полосы — по его высоте. */
  const fitToSpace = useCallback(() => {
    const measured = measureCrossSize();
    if (!measured || !zoom) return;
    setZoom(fitZoom(measured.size, measured.available - 4, zoom, measured.fixed));
  }, [measureCrossSize, setZoom, zoom]);

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
      const rowIndex = groupIndexByKey.get(rowKey);
      if (rowIndex === undefined) return;
      // Группа встаёт сразу за липкой шапкой (scrollPaddingStart), поэтому
      // лента эпохи перед первой строкой не прячется под подписями стран.
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'start' });
    },
    [groupIndexByKey, rowVirtualizer],
  );

  const gridStyle = horizontal
    ? ({
        '--lanes': columns
          .map((column) => (emptyColumnIds.has(column.id) ? 'var(--lane-height-empty)' : 'var(--lane-height)'))
          .join(' '),
      } as React.CSSProperties)
    : ({
        '--cols': stretchColumns
          ? `repeat(${columns.length}, minmax(var(--col-width), 1fr))`
          : `repeat(${columns.length}, var(--col-width))`,
      } as React.CSSProperties);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const virtualRangeKey = virtualItems.map((item) => item.index).join(',');
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <section className="timeline" id="timeline" ref={sectionRef}>
      <header className="timeline__head shell">
        <div>
          <p className="eyebrow">Основная хронология</p>
          <h2 className="timeline__title">Одна шкала — весь мир</h2>
        </div>
        {horizontal ? (
          <p className="timeline__hint lede">
            Колесо мыши листает время, Shift + колесо — линии, поле можно и тащить. Читайте столбец сверху
            вниз — это одно и то же время в разных странах. Нажмите на карточку: сверху подсветится год,
            раскроется описание, а значок <span className="timeline__hint-glyph">¶</span> откроет полный текст.
          </p>
        ) : (
          <p className="timeline__hint lede">
            Тащите поле мышью, читайте строку поперёк — это одно и то же время в разных странах. Нажмите
            на карточку: слева подсветится год, а значок <span className="timeline__hint-glyph">¶</span> откроет
            полный текст. Страны, масштаб и слои — в «Настройках».
          </p>
        )}
      </header>

      <div className="timeline__body shell">
        <StoryPlayer
          activeStory={state.activeStory}
          step={state.storyStep}
          activeItem={state.activeStoryItem}
          onStep={state.goToStoryStep}
          onStop={state.stopStory}
        />

        <TimelineControls
          layer={layer}
          query={query}
          keyOnly={keyOnly}
          period={period}
          showBce={showBce}
          bceCount={state.bceCount}
          tags={tags}
          zoom={zoom}
          orientation={orientation}
          maxYear={state.maxYear}
          periodCounts={state.periodCounts}
          total={stats.total}
          events={stats.events}
          people={stats.people}
          expanded={expanded}
          onLayerChange={setLayer}
          onQueryChange={setQuery}
          onKeyOnlyChange={setKeyOnly}
          onPeriodChange={setPeriod}
          onShowBceChange={setShowBce}
          onAddAncientLines={state.addAncientLines}
          onTagsChange={setTags}
          onZoomChange={setZoom}
          onOrientationChange={changeOrientation}
          onFitToSpace={fitToSpace}
          onToggleExpanded={() => setExpanded(!expanded)}
          onReset={resetFilters}
          showRelations={showRelations}
          relationCount={visibleRelations.length}
          onToggleRelations={() => setShowRelations(!showRelations)}
          granularityLabel={state.granularityLabel}
          splitRows={state.splitRows}
        >
          <CountryTogglePanel
            countries={countries}
            activeIds={activeCountryIds}
            counts={countryCounts}
            sharedColumns={sharedColumns}
            columnCount={columns.length}
            maxColumns={maxColumns}
            maxPerColumn={maxPerColumn}
            orientation={orientation}
            onToggle={toggleCountry}
            onOnly={onlyCountry}
            countrySets={state.countrySets}
            onApplySet={state.applyCountrySet}
            onSaveSet={state.saveCountrySet}
            onRemoveSet={state.removeCountrySet}
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
            orientation={orientation}
            placementOf={state.placementOf}
            onToggleLayer={state.toggleLayer}
            onRemoveLayer={state.removeLayer}
            onPlaceLayer={state.placeLayer}
            onDragLayer={setDraggingLayerId}
          />
        </TimelineControls>

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
                  {formatEraRange(item.from, item.to)}
                </span>
                <span className="era-rail__label">{item.label}</span>
              </button>
            ))}
          </nav>
        ) : null}

        <div className="timeline__stage" data-expanded={expanded || undefined} data-orientation={orientation}>
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
            {/* Скрытый зонд: даёт базовые размеры раскладки для расчёта масштаба */}
            <span className="timeline__probe" aria-hidden="true">
              <i data-probe="column" />
              <i data-probe="date" />
              <i data-probe="lane" />
              <i data-probe="lane-fixed" />
              <i data-probe="ruler-fixed" />
              <i data-probe="lane-empty" />
              <i data-probe="ruler" />
              <i data-probe="frame" />
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
                orientation={orientation}
                layoutKey={`${orientation}|${zoom}|${columns.length}|${emptyColumnIds.size}|${stretchColumns}|${groups.length}|${selectedItem?.id ?? ''}|${visibleRelations.length}|${virtualRangeKey}|${scrollMargin}`}
                onRelationClick={openRelation}
              />

              <TimelineHeader
                columns={columns}
                orientation={orientation}
                emptyColumnIds={emptyColumnIds}
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
                      <span
                        className="timeline__origin-year"
                        data-long={formatYearLabel(stats.minYear).length > 4 || undefined}
                      >
                        {formatYearLabel(stats.minYear)}
                      </span>
                      {horizontal ? (
                        <span className="timeline__origin-text">
                          Начало текущей выборки. Время идёт слева направо: чем правее столбец, тем ближе
                          к сегодняшнему дню. Расстояние между столбцами не пропорционально годам — показаны
                          только те даты, где что-то отмечено.
                        </span>
                      ) : (
                        <span className="timeline__origin-text">
                          Начало текущей выборки. Время идёт сверху вниз: чем ниже строка, тем ближе
                          к сегодняшнему дню. Расстояние между строками не пропорционально годам — показаны
                          только те даты, где что-то отмечено.
                        </span>
                      )}
                    </div>
                  </div>

                  {/*
                    Виртуализация групп: рендерятся только видимые группы плюс
                    оверскан, остальное место зарезервировано размером контейнера
                    вдоль оси времени. Каждая группа измеряется после появления
                    в DOM (measureElement), поэтому строки переменной высоты
                    и столбцы переменной ширины стоят корректно. Липкая шапка,
                    липкая ось дат, прокрутка, перетаскивание и нити связей
                    работают в обеих ориентациях — структура DOM групп одна.
                  */}
                  <div
                    className="timeline__rows"
                    ref={rowsRef}
                    style={horizontal ? { width: totalSize } : { height: totalSize }}
                  >
                    {virtualItems.map((virtualRow) => {
                      const group = groups[virtualRow.index];
                      if (!group) return null;
                      const offset = virtualRow.start - scrollMargin;
                      return (
                        <div
                          className="timeline__group"
                          key={virtualRow.key}
                          data-index={virtualRow.index}
                          ref={measureGroup}
                          style={
                            horizontal
                              ? {
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  height: '100%',
                                  transform: `translateX(${offset}px)`,
                                }
                              : {
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  transform: `translateY(${offset}px)`,
                                }
                          }
                        >
                          {group.startsEra ? (
                            <div className="era-band" role="row" title={group.era.note}>
                              <div className="era-band__inner">
                                <span className="era-band__label">{group.era.label}</span>
                                <span className="era-band__years">
                                  {formatEraRange(group.era.from, group.era.to)}
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
                    <span>
                      Конец текущей выборки ·{' '}
                      {stats.maxYear < 0 ? formatYearLabel(stats.maxYear) : `${stats.maxYear} год`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="timeline__tools">
          <StoryChooser
            stories={state.stories}
            activeStoryId={state.activeStory?.id}
            onStart={(storyId) => state.goToStoryStep(storyId, 0)}
          />

          <ResearchTools state={state} />

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
              setPeriod({ type: 'era', id: eraId });
            }}
          />
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
