import type { Relation, TimelineItem } from '../types';

export type RelationCandidate = {
  item: TimelineItem;
  /** Суммарный вес совпадений. Чем выше, тем вероятнее настоящая связь. */
  score: number;
  /** Человекочитаемые причины — их видит и пользователь, и наполняющий базу AI. */
  reasons: string[];
  /** Пересекающиеся темы — самая содержательная часть подсказки. */
  sharedTags: string[];
};

type Draft = Pick<TimelineItem, 'country' | 'year' | 'tags'> & Partial<Pick<TimelineItem, 'id'>>;

/**
 * Насколько близость по времени говорит о возможной связи.
 * Влияние обычно проявляется в пределах жизни поколения-двух;
 * дальше связь возможна, но требует отдельного обоснования.
 */
function proximityScore(distance: number): number {
  if (distance <= 5) return 5;
  if (distance <= 25) return 4;
  if (distance <= 60) return 3;
  if (distance <= 120) return 2;
  if (distance <= 250) return 1;
  return 0;
}

/**
 * Подбирает кандидатов на историческую связь для нового объекта.
 *
 * Это не автоматическое создание связей, а именно подсказка: алгоритм видит
 * только совпадения тем, времени и стран, но не причинность. Решение о том,
 * что одно событие действительно повлияло на другое, остаётся за человеком
 * или наполняющим базу AI — и должно подтверждаться источниками.
 *
 * Правила отбора:
 * — совпадение тем весит больше всего: общая тема плюс близкое время
 *   почти всегда означает общий процесс;
 * — межстрановые пары ценнее внутристрановых: ради них и строится шкала;
 * — опорные вехи поднимаются выше: связь с ними объяснит больше;
 * — уже описанные связи из выдачи убираются.
 */
export function suggestRelations(
  draft: Draft,
  items: TimelineItem[],
  existing: Relation[] = [],
  limit = 6,
): RelationCandidate[] {
  const draftTags = new Set(draft.tags ?? []);

  const linked = new Set(
    existing
      .filter((relation) => relation.from === draft.id || relation.to === draft.id)
      .map((relation) => (relation.from === draft.id ? relation.to : relation.from)),
  );

  const candidates: RelationCandidate[] = [];

  for (const item of items) {
    if (item.id === draft.id || linked.has(item.id)) continue;

    const distance = Math.abs(item.year - draft.year);
    const proximity = proximityScore(distance);
    if (proximity === 0) continue;

    const sharedTags = item.tags.filter((tag) => draftTags.has(tag));
    const crossCountry = item.country !== draft.country;
    const importance = item.importance ?? 2;

    // Без общей темы связь возможна только между вехами близких лет.
    if (sharedTags.length === 0 && (importance < 3 || proximity < 4)) continue;

    const score =
      sharedTags.length * 4 + proximity + (crossCountry ? 3 : 0) + (importance >= 3 ? 2 : 0);

    const reasons: string[] = [];
    if (sharedTags.length > 0) reasons.push(`общие темы: ${sharedTags.join(', ')}`);
    reasons.push(
      distance === 0 ? 'тот же год' : `разница ${distance} ${yearsWord(distance)}`,
    );
    if (crossCountry) reasons.push('другая страна');
    if (importance >= 3) reasons.push('опорная веха');

    candidates.push({ item, score, reasons, sharedTags });
  }

  return candidates
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(a.item.year - draft.year) - Math.abs(b.item.year - draft.year) ||
        a.item.title.localeCompare(b.item.title, 'ru'),
    )
    .slice(0, limit);
}

function yearsWord(count: number): string {
  const abs = count % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return 'лет';
  if (tail > 1 && tail < 5) return 'года';
  if (tail === 1) return 'год';
  return 'лет';
}
