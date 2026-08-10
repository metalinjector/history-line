/**
 * Доменная модель хронологии.
 *
 * Модель намеренно описана «с запасом»: сейчас шкала строится по годам,
 * но каждый объект уже может нести месяц и день, диапазон лет и вес важности.
 * Благодаря этому переход к делению «год → месяц → день» не потребует
 * миграции данных — достаточно поменять уровень группировки (см. lib/timeline.ts).
 */

export type CountryId =
  | 'germany'
  | 'england'
  | 'france'
  | 'russia'
  | 'belarus'
  | 'spain'
  | 'china'
  | 'japan';

export type TimelineItemKind = 'event' | 'person';

/**
 * Вес объекта на шкале.
 * 3 — опорная веха эпохи, 2 — заметное событие, 1 — деталь/контекст.
 */
export type Importance = 1 | 2 | 3;

/** Уровень группировки шкалы. Сейчас в UI используется 'year', остальные — задел на будущее. */
export type Granularity = 'year' | 'month' | 'day';

export type EraId =
  | 'antiquity'
  | 'early-middle-ages'
  | 'high-middle-ages'
  | 'early-modern'
  | 'age-of-revolutions'
  | 'industrial'
  | 'world-wars'
  | 'cold-war'
  | 'contemporary';

export type Era = {
  id: EraId;
  label: string;
  /** Первый год эпохи включительно. */
  from: number;
  /** Последний год эпохи включительно. */
  to: number;
  note: string;
};

export type SourceLink = {
  label: string;
  url?: string;
};

export type TimelineItem = {
  id: string;
  country: CountryId;
  /** Год размещения на шкале. Может быть годом ключевого действия, а не рождения. */
  year: number;
  /** 1–12. Задел на помесячную детализацию. */
  month?: number;
  /** 1–31. Задел на подневную детализацию. */
  day?: number;
  /** Год окончания процесса, если объект описывает не точку, а отрезок. */
  endYear?: number;
  kind: TimelineItemKind;
  title: string;
  /** Одно предложение: что произошло. */
  summary: string;
  /** 2–4 предложения: что произошло, почему важно, как связано с соседями. */
  detail: string;
  /** Годы жизни — только для персоналий. */
  life?: string;
  tags: string[];
  importance?: Importance;
  /** Короткая реплика о синхронности: что в это же время происходило рядом. */
  parallel?: string;
  /**
   * Полный текст статьи в Markdown для модального окна.
   * Если поля нет, документ собирается из остальных полей — см. lib/markdown.ts.
   */
  body?: string;
  sources?: SourceLink[];
  /** Объект добавлен пользователем через конструктор персоналий. */
  custom?: boolean;
};

export type Country = {
  id: CountryId;
  label: string;
  /** Короткое обозначение для шапки таблицы. */
  short: string;
  /** Пояснение исторической линии: чем эта колонка является для ранних веков. */
  note: string;
  /** Базовый цвет линии, точек и акцентов. Хранится как HSL-компоненты. */
  color: string;
  /** Более тёмный вариант цвета для светлой «пергаментной» темы. */
  colorInk: string;
};

/** Слой фильтрации по типу объекта. */
export type Layer = 'all' | 'events' | 'people';

/** Тема оформления. */
export type ThemeName = 'parchment' | 'atlas';

/**
 * Колонка таблицы. Может держать одну страну или пару стран.
 *
 * Пары нужны, потому что колонок на экране не больше шести: когда включено
 * больше стран, близкие линии «вклиниваются» в общую колонку и различаются
 * цветом точки на шкале и бейджем на карточке.
 */
export type TimelineColumn = {
  /** Идентификатор колонки: 'russia' или 'russia+belarus'. */
  id: string;
  countries: Country[];
  /** Подпись в шапке: «Россия · Беларусь». */
  label: string;
  /** Короткое обозначение: «RU · BY». */
  short: string;
  /** Колонка держит больше одной страны. */
  shared: boolean;
};

/** Группа объектов одного «шага» шкалы (сейчас — одного года). */
export type TimelineGroup = {
  /** Стабильный ключ группы: '1789' | '1789-07' | '1789-07-14'. */
  key: string;
  year: number;
  month?: number;
  day?: number;
  /** Подпись группы для колонки дат. */
  label: string;
  era: Era;
  /** Первая группа эпохи — по ней рисуется разделитель эпохи. */
  startsEra: boolean;
  items: TimelineItem[];
  /** Объекты, разложенные по колонкам таблицы (ключ — TimelineColumn.id). */
  byColumn: Record<string, TimelineItem[]>;
  /** Максимальная важность внутри группы — влияет на вес подписи года. */
  weight: Importance;
};

/**
 * Связь между двумя объектами хронологии — обычно из разных стран.
 * На шкале рисуется нитью-графом между узлами карточек.
 */
export type Relation = {
  id: string;
  /** Идентификатор объекта-источника влияния. */
  from: string;
  /** Идентификатор объекта, на который повлияли. */
  to: string;
  /** Короткая подпись связи для подсказки и заголовка окна. */
  label: string;
  /** Подробное объяснение влияния в Markdown. */
  detail: string;
  /** Характер связи — влияет на цвет и штрих нити. */
  kind: 'influence' | 'conflict' | 'exchange';
};

export type Suggestion = {
  id: string;
  /** Готовый объект, который добавится в хронологию. */
  item: Omit<TimelineItem, 'id' | 'custom'>;
  /** Почему этого деятеля стоит поставить именно в этот год. */
  why: string;
};
