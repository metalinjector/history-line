import type { Relation, TimelineItem } from '../types';
import { hasVerifiedSources } from './sourceRule';

export { hasVerifiedSources };

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
