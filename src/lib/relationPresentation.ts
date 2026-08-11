import type { Relation } from '../types';

type RelationPresentation = {
  label: string;
  roles: readonly [string, string];
  arrow: string;
  hint: (isFrom: boolean) => string;
};

/**
 * Единая словесная модель связи для карточек и модального окна.
 * Только `influence` направлено; остальные виды намеренно симметричны.
 */
export const relationPresentation: Record<Relation['kind'], RelationPresentation> = {
  influence: {
    label: 'влияние',
    roles: ['Импульс', 'Результат'],
    arrow: '→',
    hint: (isFrom) => (isFrom ? 'повлияло на' : 'испытало влияние'),
  },
  conflict: {
    label: 'противостояние',
    roles: ['Сторона', 'Сторона'],
    arrow: '↔',
    hint: () => 'связано общим противостоянием с',
  },
  exchange: {
    label: 'обмен',
    roles: ['Участник', 'Участник'],
    arrow: '↔',
    hint: () => 'связано обменом с',
  },
  comparison: {
    label: 'сопоставление',
    roles: ['Случай A', 'Случай B'],
    arrow: '⇄',
    hint: () => 'сопоставляется с',
  },
  context: {
    label: 'общий контекст',
    roles: ['Веха', 'Веха'],
    arrow: '↔',
    hint: () => 'входит в один исторический контекст с',
  },
};

export function relationHint(relation: Relation, itemId: string): string {
  return relationPresentation[relation.kind].hint(relation.from === itemId);
}
