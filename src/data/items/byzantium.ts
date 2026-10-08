import type { TimelineItem } from '../../types';

/**
 * Византия — Восточная Римская империя. Записи справочника (ref-…) выверены
 * и переписаны под теми же id — см. docs/AI-CONTRIBUTING.md, §10.0.
 * День и месяц до 1582 года — по юлианскому календарю, как в источниках.
 */
export const byzantium: TimelineItem[] = [
  {
    id: 'ref-p027-perenesenie-stolicy-rimskoy-imperii-v-kons',
    country: 'byzantium',
    year: 330,
    month: 5,
    day: 11,
    kind: 'event',
    title: 'Основание Константинополя',
    summary: 'Император Константин освящает новую столицу империи на месте греческого города Византий.',
    tags: ['города', 'империя'],
    importance: 3,
  },
  {
    id: 'ref-p028-pravlenie-imperatora-yustiniana',
    country: 'byzantium',
    year: 527,
    endYear: 565,
    kind: 'person',
    title: 'Юстиниан I',
    summary: 'Император Восточной Римской империи возвращает часть западных земель и сводит римское право в единый свод.',
    life: 'ок. 482–565',
    tags: ['право', 'империя', 'завоевание'],
    importance: 3,
  },
  {
    id: 'ref-p034-zahvat-krestonoscami-konstantinopolya',
    country: 'byzantium',
    year: 1204,
    month: 4,
    kind: 'event',
    title: 'Крестоносцы берут Константинополь',
    summary: 'Участники Четвёртого крестового похода штурмуют и грабят Константинополь и основывают Латинскую империю.',
    tags: ['крестовые походы', 'война'],
    importance: 3,
  },
  {
    id: 'ref-p034-vosstanovlenie-vizantiyskoy-imperii',
    country: 'byzantium',
    year: 1261,
    kind: 'event',
    title: 'Возвращение Константинополя',
    summary: 'Войско Никейской империи отбивает Константинополь у латинян, и империя возрождается под властью Палеологов.',
    tags: ['война', 'государство'],
    importance: 2,
  },
  {
    id: 'ref-p039-vzyatie-konstantinopolya-turkami-osmanami',
    country: 'byzantium',
    year: 1453,
    month: 5,
    day: 29,
    kind: 'event',
    title: 'Падение Константинополя',
    summary: 'Османский султан Мехмед II после осады берёт Константинополь, и Византийская империя прекращает существование.',
    tags: ['война', 'империя'],
    importance: 3,
  },
];
