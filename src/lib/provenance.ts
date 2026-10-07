import type { Relation, SourceLink, TimelineItem } from '../types';

/** Единый контракт верификации для фактов и причинных связей. */
export function hasVerifiedSources(sources?: SourceLink[]): boolean {
  return Boolean(
    sources &&
      sources.length >= 2 &&
      sources.every((source) => source.label.trim().length > 1) &&
      sources.some((source) => source.kind !== 'encyclopedia'),
  );
}

export function isRelationVerified(relation: Relation): boolean {
  return relation.verification === 'verified' && hasVerifiedSources(relation.sources);
}

/**
 * Проверен ли объект. Источники объектов базы грузятся вместе с модальным
 * окном, а до тех пор ответ даёт сводка редакционной базы (item.content),
 * собранная по тому же правилу.
 */
export function isItemVerified(item: TimelineItem): boolean {
  return item.sources ? hasVerifiedSources(item.sources) : Boolean(item.content?.verified);
}
