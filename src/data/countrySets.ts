import type { CountryId, CountrySet } from '../types';
import { allCountryIds, defaultCountryIds } from './countries';

/**
 * Наборы стран.
 *
 * Кнопки «показать все» здесь нет и быть не может: в каталоге больше сотни линий,
 * и одновременный показ всех превращает шкалу в нечитаемую простыню. Вместо этого
 * есть наборы — осмысленные подборки на 5–8 линий, между которыми переключаешься
 * одним нажатием.
 *
 * Встроенные наборы заданы здесь, свои читатель собирает сам и хранит в браузере.
 * Устройство одинаковое, поэтому UI не различает их нигде, кроме права на удаление.
 */
export const builtinCountrySets: CountrySet[] = [
  {
    id: 'default',
    label: 'Европа · по умолчанию',
    note: 'Набор, с которого открывается шкала.',
    countries: defaultCountryIds,
  },
  {
    id: 'east-asia',
    label: 'Восточная Азия',
    note: 'Китай, Япония, Корея, Вьетнам, Монголия и Индия — своя линия развития.',
    countries: ['china', 'japan', 'korea', 'vietnam', 'mongolia', 'india'],
  },
  {
    id: 'ancient-world',
    label: 'Древний мир',
    note: 'Государства, которых давно нет: от Междуречья до Рима.',
    countries: [
      'mesopotamia',
      'ancient-egypt',
      'ancient-israel',
      'achaemenid-persia',
      'ancient-greece',
      'ancient-rome',
    ],
  },
  {
    id: 'eastern-europe',
    label: 'Восточная Европа',
    note: 'Беларусь, Россия, Украина, Польша, Литва и Киевская Русь.',
    countries: ['belarus', 'russia', 'ukraine', 'poland', 'lithuania', 'kievan-rus'],
  },
  {
    id: 'americas',
    label: 'Америка',
    note: 'США, Мексика, Бразилия, Аргентина и доколумбовы цивилизации.',
    countries: ['usa', 'mexico', 'brazil', 'argentina', 'aztec', 'inca'],
  },
];

/**
 * Линии, на которых в этой базе держится древность.
 *
 * Античность здесь не «ранняя история Италии и Греции», а отдельные линии:
 * Древний Рим — не Италия, Древняя Греция — не современная Греция. Из-за этого
 * набор из современных стран может вообще не иметь дат до нашей эры, и
 * переключатель «До н. э.» в нём ничего не меняет. Эти три линии — самые
 * наполненные до нашей эры, их и предлагает добавить подсказка.
 */
export const ANCIENT_LINES: CountryId[] = ['ancient-rome', 'ancient-greece', 'ancient-egypt'];

/** Максимум своих наборов: ограничение чисто визуальное, не архитектурное. */
export const MAX_USER_SETS = 12;

/** Оставляет только существующие страны и убирает повторы, сохраняя порядок каталога. */
export function normalizeSet(ids: CountryId[]): CountryId[] {
  const wanted = new Set(ids);
  return allCountryIds.filter((id) => wanted.has(id));
}

/** Совпадают ли два набора по составу; порядок не важен. */
export function sameSet(a: CountryId[], b: CountryId[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * Имя для нового набора: подсказка по составу, если читатель не ввёл своё.
 * Три страны и «+N» читаются лучше, чем «Набор 4».
 */
export function suggestSetName(ids: CountryId[], labelOf: (id: CountryId) => string): string {
  if (ids.length === 0) return 'Пустой набор';
  const head = ids.slice(0, 3).map(labelOf).join(', ');
  return ids.length > 3 ? `${head} +${ids.length - 3}` : head;
}
