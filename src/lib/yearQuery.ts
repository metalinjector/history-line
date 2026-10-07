/** Отрезок времени из поля «к году»: один год, век или десятилетие. */
export type YearSpan = { from: number; to: number };

/**
 * Разбор года, который читатель ввёл в поле «к году».
 *
 * Понимает:
 * - `1812`, `-500`, `−500`, `3 000 000` — год; минус означает «до н. э.»;
 * - `500 до н. э.`, `500 г. до н.э.`, `500 BC` — до нашей эры;
 * - `1812 н. э.`, `1812 г.`, `1812 AD` — наша эра явно;
 * - `XVII век`, `17 в.`, `V в. до н. э.` — век целиком;
 * - `1990-е` — десятилетие;
 * - `3 млн`, `2,5 млн лет`, `40 тыс. лет назад` — давность: «назад» считается
 *   от текущего года, без него число читается как год до н. э.
 *
 * Нулевого года нет, поэтому `0` означает 1 год. Возвращает undefined,
 * если строка не похожа на год.
 */
export function parseYearQuery(input: string, currentYear = new Date().getFullYear()): YearSpan | undefined {
  const span = parseSpan(input, currentYear);
  return typeof span === 'number' ? { from: span, to: span } : span;
}

function parseSpan(input: string, currentYear: number): YearSpan | number | undefined {
  let text = input
    .trim()
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ');
  if (!text) return undefined;

  let bce = false;
  const bceSuffix = /\s*(?:до\s*н\.?\s*э\.?|до\s*нашей\s*эры|bce|b\.?\s*c\.?)$/;
  const ceSuffix = /\s*(?:н\.?\s*э\.?|нашей\s*эры|a\.?\s*d\.?|ce)$/;
  if (bceSuffix.test(text)) {
    bce = true;
    text = text.replace(bceSuffix, '');
  } else {
    text = text.replace(ceSuffix, '');
  }
  text = text.replace(/\s*(?:гг?\.?|год[ау]?)$/, '');

  const ago = /^(\d+(?:[.,]\d+)?)\s*(млн|миллион\S*|тыс\S*)(?:\s*лет)?(\s*назад)?$/.exec(text);
  if (ago) {
    const amount = Math.round(Number(ago[1].replace(',', '.')) * (ago[2].startsWith('м') ? 1_000_000 : 1_000));
    if (!amount) return undefined;
    if (!ago[3] || bce) return -amount;
    const year = currentYear - amount;
    return year > 0 ? year : year - 1;
  }

  const century = /^([ivxlcdm]+|\d{1,2})(?:-?й)?\s*(?:вв?\.?|век\S*)$/.exec(text);
  if (century) {
    const order = /^\d+$/.test(century[1]) ? Number(century[1]) : fromRoman(century[1]);
    if (!order) return undefined;
    // XVII век — 1601–1700, V век до н. э. — 500–401 до н. э.
    return bce ? { from: -order * 100, to: -(order - 1) * 100 - 1 } : { from: (order - 1) * 100 + 1, to: order * 100 };
  }

  const decade = /^(\d{2,4}0)-?е$/.exec(text);
  if (decade) {
    const start = Number(decade[1]);
    // 390-е до н. э. — это 399–390 до н. э.
    return bce ? { from: -(start + 9), to: -start } : { from: start, to: start + 9 };
  }

  const plain = /^(-)?\s*(\d{1,3}(?: \d{3})+|\d+)$/.exec(text);
  if (plain) {
    const year = Number(plain[2].replaceAll(' ', '')) || 1;
    return bce || plain[1] ? -year : year;
  }

  return undefined;
}

const ROMAN_DIGITS: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

/** XVII → 17. Неканоническую запись (IIII, VX) не отвергает: читателю виднее. */
function fromRoman(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index++) {
    const digit = ROMAN_DIGITS[value[index]];
    const next = ROMAN_DIGITS[value[index + 1]] ?? 0;
    total += digit < next ? -digit : digit;
  }
  return total;
}

/**
 * Индекс группы для отрезка: первая группа внутри него, а если внутри
 * пусто — ближайшая снаружи (при равном расстоянии — более ранняя).
 * Группы отсортированы по времени; из нескольких групп одного года
 * (месяцы, дни) берётся первая. −1 для пустого списка.
 */
export function nearestGroupIndex(groups: readonly { year: number }[], { from, to }: YearSpan): number {
  if (groups.length === 0) return -1;
  let low = 0;
  let high = groups.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (groups[middle].year < from) low = middle + 1;
    else high = middle;
  }
  if (low < groups.length && groups[low].year <= to) return low;
  if (low === 0) return 0;
  const before = low - 1;
  if (low < groups.length && groups[low].year - to < from - groups[before].year) return low;
  // Шагаем к первой группе того же года, что и предыдущая.
  let first = before;
  while (first > 0 && groups[first - 1].year === groups[before].year) first--;
  return first;
}
