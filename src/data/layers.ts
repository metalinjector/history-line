import type { Layer } from '../types';
import { OWN_COLUMN } from '../types';
import { contentSummaryById } from './contentSummary';

/**
 * Наложенные слои.
 *
 * Слой — это набор событий одного сюжета, который по умолчанию не показывается:
 * на поверхности шкалы должны оставаться только значимые для стран события.
 * Включённый слой кладётся на колонку страны или получает свою и позволяет
 * увидеть частную траекторию на фоне общей истории.
 *
 * Вместе с детализацией по месяцам это даёт главный эффект: приблизив шкалу,
 * видно, что «год чудес» Эйнштейна укладывается между мартом и сентябрём 1905-го,
 * а разгром при Ватерлоо случился через сто дней после возвращения с Эльбы.
 *
 * Добавить слой — значит добавить одну запись в этот массив. Требования
 * к фактам те же, что и для основной базы: см. docs/AI-CONTRIBUTING.md.
 */
const layerDefinitions: Layer[] = [
  {
    id: 'einstein',
    title: 'Жизнь Альберта Эйнштейна',
    subtitle: '1879–1955 · физика',
    short: 'AE',
    note: 'Биография человека, чьи четыре статьи 1905 года изменили физику, а бегство от нацизма изменило науку двух континентов.',
    color: '262 72% 62%',
    colorInk: '262 60% 42%',
    category: 'person',
    defaultPlacement: 'germany',
    items: [
      {
        id: 'layer-einstein-1879',
        year: 1879, month: 3, day: 14,
        kind: 'person',
        title: 'Рождение в Ульме',
        summary: 'Родился в семье владельца небольшой электротехнической мастерской.',
        tags: ['наука'],
        importance: 1,
      },
      {
        id: 'layer-einstein-1896',
        year: 1896,
        kind: 'person',
        title: 'Отказ от германского гражданства',
        summary: 'Чтобы не служить в армии, отказывается от подданства и на пять лет остаётся без гражданства.',
        tags: ['наука', 'общество'],
        importance: 1,
      },
      {
        id: 'layer-einstein-1902',
        year: 1902, month: 6,
        kind: 'person',
        title: 'Патентное бюро в Берне',
        summary: 'Не найдя места в университете, устраивается экспертом третьего класса.',
        tags: ['наука'],
        importance: 2,
      },
      {
        id: 'layer-einstein-1905',
        year: 1905, month: 3,
        endYear: 1905,
        kind: 'person',
        title: 'Год чудес',
        summary: 'За двенадцать месяцев выходят четыре статьи, каждой хватило бы на репутацию.',
        tags: ['наука', 'физика'],
        importance: 3,
      },
      {
        id: 'layer-einstein-1915',
        year: 1915, month: 11, day: 25,
        kind: 'person',
        title: 'Общая теория относительности',
        summary: 'Представляет уравнения поля тяготения Прусской академии наук.',
        tags: ['наука', 'физика'],
        importance: 3,
      },
      {
        id: 'layer-einstein-1919',
        year: 1919, month: 5, day: 29,
        kind: 'person',
        title: 'Затмение подтверждает теорию',
        summary: 'Экспедиции Эддингтона измеряют отклонение света у края Солнца.',
        tags: ['наука', 'физика'],
        importance: 2,
      },
      {
        id: 'layer-einstein-1921',
        year: 1921,
        kind: 'person',
        title: 'Нобелевская премия',
        summary: 'Присуждена за объяснение фотоэффекта, а не за относительность.',
        tags: ['наука', 'нобелевская премия'],
        importance: 2,
      },
      {
        id: 'layer-einstein-1933',
        year: 1933, month: 3,
        kind: 'person',
        title: 'Эмиграция',
        summary: 'Узнав о приходе нацистов к власти, не возвращается в Германию из поездки в США.',
        tags: ['наука', 'эмиграция', 'нацизм'],
        importance: 3,
      },
      {
        id: 'layer-einstein-1939',
        year: 1939, month: 8, day: 2,
        kind: 'person',
        title: 'Письмо Рузвельту',
        summary: 'Подписывает письмо о возможности атомного оружия у Германии.',
        tags: ['наука', 'атом', 'война'],
        importance: 3,
      },
      {
        id: 'layer-einstein-1955',
        year: 1955, month: 4, day: 18,
        kind: 'person',
        title: 'Смерть в Принстоне',
        summary: 'Отказывается от операции: «Я хочу уйти, когда захочу».',
        tags: ['наука'],
        importance: 2,
      },
    ],
  },

  {
    id: 'napoleon',
    title: 'Путь Наполеона',
    subtitle: '1769–1821 · от Корсики до Святой Елены',
    short: 'NB',
    note: 'Биография, которая за двадцать лет перекроила карту Европы и оставила след в законах доброго десятка стран.',
    color: '18 82% 56%',
    colorInk: '14 74% 38%',
    category: 'person',
    defaultPlacement: 'france',
    items: [
      {
        id: 'layer-napoleon-1769',
        year: 1769, month: 8, day: 15,
        kind: 'person',
        title: 'Рождение на Корсике',
        summary: 'Родился в Аяччо через год после перехода острова к Франции.',
        tags: ['Наполеон'],
        importance: 1,
      },
      {
        id: 'layer-napoleon-1793',
        year: 1793, month: 12,
        kind: 'person',
        title: 'Тулон',
        summary: 'В 24 года берёт мятежный порт и получает генеральский чин.',
        tags: ['Наполеон', 'война', 'революция'],
        importance: 2,
      },
      {
        id: 'layer-napoleon-1798',
        year: 1798, month: 7,
        kind: 'person',
        title: 'Египетский поход',
        summary: 'Военная неудача, обернувшаяся научным успехом.',
        tags: ['Наполеон', 'война', 'наука'],
        importance: 2,
      },
      {
        id: 'layer-napoleon-1799',
        year: 1799, month: 11, day: 9,
        kind: 'person',
        title: '18 брюмера',
        summary: 'Переворот приводит его к власти и завершает революцию.',
        tags: ['Наполеон', 'революция'],
        importance: 3,
      },
      {
        id: 'layer-napoleon-1804',
        year: 1804, month: 12, day: 2,
        kind: 'person',
        title: 'Коронация',
        summary: 'Возлагает корону на себя сам, в присутствии папы римского.',
        tags: ['Наполеон', 'империя', 'право'],
        importance: 3,
      },
      {
        id: 'layer-napoleon-1805',
        year: 1805, month: 12, day: 2,
        kind: 'person',
        title: 'Аустерлиц',
        summary: 'Разгром русско-австрийской армии ровно через год после коронации.',
        tags: ['Наполеон', 'война'],
        importance: 3,
      },
      {
        id: 'layer-napoleon-1812',
        year: 1812, month: 6, day: 24,
        endYear: 1812,
        kind: 'person',
        title: 'Поход в Россию',
        summary: 'Переходит Неман с крупнейшей армией, какую видела Европа, и теряет её за полгода.',
        tags: ['Наполеон', 'война', 'Россия'],
        importance: 3,
      },
      {
        id: 'layer-napoleon-1814',
        year: 1814, month: 4, day: 6,
        kind: 'person',
        title: 'Отречение и Эльба',
        summary: 'Отрекается от престола и получает во владение остров с титулом императора.',
        tags: ['Наполеон'],
        importance: 2,
      },
      {
        id: 'layer-napoleon-1815',
        year: 1815, month: 6, day: 18,
        kind: 'person',
        title: 'Ватерлоо',
        summary: 'Через сто дней после возвращения с Эльбы теряет всё за один день.',
        tags: ['Наполеон', 'война'],
        importance: 3,
      },
      {
        id: 'layer-napoleon-1821',
        year: 1821, month: 5, day: 5,
        kind: 'person',
        title: 'Смерть на Святой Елене',
        summary: 'Умирает в британской ссылке на острове посреди Атлантики.',
        tags: ['Наполеон'],
        importance: 2,
      },
    ],
  },

  {
    id: 'curie',
    title: 'Мария Склодовская-Кюри',
    subtitle: '1867–1934 · две Нобелевские премии',
    short: 'MC',
    note: 'Биография, которая не помещается в одну страну: родилась в Варшаве, работала в Париже, спасала раненых на фронте.',
    color: '160 62% 46%',
    colorInk: '164 62% 30%',
    category: 'person',
    defaultPlacement: OWN_COLUMN,
    items: [
      {
        id: 'layer-curie-1867',
        year: 1867, month: 11, day: 7,
        kind: 'person',
        title: 'Рождение в Варшаве',
        summary: 'Родилась в городе, входившем тогда в состав Российской империи.',
        tags: ['наука', 'образование'],
        importance: 1,
      },
      {
        id: 'layer-curie-1891',
        year: 1891, month: 11,
        kind: 'person',
        title: 'Сорбонна',
        summary: 'Приезжает в Париж и поступает на факультет естественных наук.',
        tags: ['наука', 'образование'],
        importance: 2,
      },
      {
        id: 'layer-curie-1898',
        year: 1898, month: 12, day: 26,
        kind: 'person',
        title: 'Открытие радия',
        summary: 'Вместе с Пьером Кюри объявляет об открытии полония и радия.',
        tags: ['наука', 'химия'],
        importance: 3,
      },
      {
        id: 'layer-curie-1903',
        year: 1903, month: 12,
        kind: 'person',
        title: 'Нобелевская премия по физике',
        summary: 'Первая женщина — лауреат Нобелевской премии.',
        tags: ['наука', 'нобелевская премия'],
        importance: 3,
      },
      {
        id: 'layer-curie-1906',
        year: 1906, month: 4, day: 19,
        kind: 'person',
        title: 'Гибель Пьера и кафедра',
        summary: 'После смерти мужа занимает его место в Сорбонне — первая женщина-профессор.',
        tags: ['наука', 'образование'],
        importance: 2,
      },
      {
        id: 'layer-curie-1911',
        year: 1911, month: 12,
        kind: 'person',
        title: 'Вторая Нобелевская премия',
        summary: 'Премия по химии — за выделение чистого радия.',
        tags: ['наука', 'химия', 'нобелевская премия'],
        importance: 3,
      },
      {
        id: 'layer-curie-1914',
        year: 1914, month: 10,
        endYear: 1918,
        kind: 'person',
        title: '«Маленькие Кюри» на фронте',
        summary: 'Организует передвижные рентгеновские установки для полевых госпиталей.',
        tags: ['наука', 'война', 'медицина'],
        importance: 2,
      },
      {
        id: 'layer-curie-1934',
        year: 1934, month: 7, day: 4,
        kind: 'person',
        title: 'Смерть от лучевой болезни',
        summary: 'Умирает от апластической анемии, вызванной многолетним облучением.',
        tags: ['наука', 'медицина'],
        importance: 2,
      },
    ],
  },

  {
    id: 'plagues',
    title: 'Эпидемии и пандемии',
    subtitle: 'от Юстиниановой чумы до COVID-19',
    short: 'EP',
    note: 'Сквозной сюжет, который не принадлежит ни одной стране: болезни приходили по тем же дорогам, что торговля и армии.',
    color: '350 66% 56%',
    colorInk: '350 62% 38%',
    category: 'event',
    defaultPlacement: OWN_COLUMN,
    items: [
      {
        id: 'layer-plague-541',
        year: 541,
        kind: 'event',
        title: 'Юстинианова чума',
        summary: 'Первая задокументированная пандемия чумы обрушивается на Византию.',
        tags: ['эпидемия', 'Византия'],
        importance: 3,
        approximate: true,
      },
      {
        id: 'layer-plague-1347',
        year: 1347, month: 10,
        endYear: 1351,
        kind: 'event',
        title: 'Чёрная смерть приходит в Европу',
        summary: 'Генуэзские корабли привозят чуму в Мессину, за четыре года гибнет треть населения.',
        tags: ['эпидемия', 'торговля', 'общество'],
        importance: 3,
      },
      {
        id: 'layer-plague-1665',
        year: 1665,
        kind: 'event',
        title: 'Великая чума в Лондоне',
        summary: 'Последняя крупная вспышка чумы в Англии уносит около четверти жителей города.',
        tags: ['эпидемия', 'наука'],
        importance: 2,
      },
      {
        id: 'layer-plague-1817',
        year: 1817,
        kind: 'event',
        title: 'Первая пандемия холеры',
        summary: 'Болезнь выходит из Бенгалии и за десятилетия обходит мир.',
        tags: ['эпидемия', 'медицина', 'города'],
        importance: 2,
      },
      {
        id: 'layer-plague-1918',
        year: 1918, month: 3,
        endYear: 1920,
        kind: 'event',
        title: 'Испанский грипп',
        summary: 'Пандемия убивает больше людей, чем только что закончившаяся мировая война.',
        tags: ['эпидемия', 'война', 'медицина'],
        importance: 3,
      },
      {
        id: 'layer-plague-2020',
        year: 2020, month: 3, day: 11,
        endYear: 2023,
        kind: 'event',
        title: 'Пандемия COVID-19',
        summary: 'ВОЗ объявляет пандемию, и мир впервые останавливается почти синхронно.',
        tags: ['эпидемия', 'медицина', 'современность'],
        importance: 3,
      },
    ],
  },
];

/**
 * Источники объектов слоя лежат в `content/layers/<слой>/<id>.md` —
 * ровно так же, как у основной базы. Требование то же: два независимых
 * источника, хотя бы один не энциклопедия. Здесь, как и у основной базы,
 * подмешивается только сводка — полные данные грузит модальное окно.
 */
export const layers: Layer[] = layerDefinitions.map((layer) => ({
  ...layer,
  items: layer.items.map((item) => ({
    ...item,
    ...(contentSummaryById[item.id] ? { content: contentSummaryById[item.id] } : {}),
  })),
}));

export const layerById = Object.fromEntries(layers.map((layer) => [layer.id, layer]));

/**
 * Сколько слоёв можно держать включёнными одновременно.
 *
 * Ограничение визуальное, а не архитектурное: каждый слой добавляет дорожку
 * в колонку или отдельную колонку, и после трёх таблица перестаёт читаться.
 * Всё остальное — раскладка, размещение, перетаскивание — на число слоёв
 * не завязано, поэтому предел поднимается изменением одной этой константы.
 */
export const MAX_ACTIVE_LAYERS = 3;

/** Самый ранний год слоя — по нему сортируются сюжетные слои. */
export function layerStartYear(layer: Layer): number {
  return layer.items.reduce((min, item) => Math.min(min, item.year), Number.POSITIVE_INFINITY);
}

/**
 * Слои для выпадающего меню: персоны по алфавиту, события по времени.
 * Порядок разделов фиксирован, внутри разделов — понятный читателю признак.
 */
export function groupedLayers(): { category: Layer['category']; label: string; layers: Layer[] }[] {
  const persons = layers
    .filter((layer) => layer.category === 'person')
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  const events = layers
    .filter((layer) => layer.category === 'event')
    .sort((a, b) => layerStartYear(a) - layerStartYear(b));

  return [
    { category: 'person' as const, label: 'Персоны — по алфавиту', layers: persons },
    { category: 'event' as const, label: 'События и сюжеты — от древних к новым', layers: events },
  ].filter((group) => group.layers.length > 0);
}
