import type { Relation, TimelineItem } from '../types';
import { hasVerifiedSources } from './sourceRule';

export { hasVerifiedSources };

/**
 * Проверена ли связь. Источники связей базы лежат в файлах содержания и
 * грузятся вместе с окном связи; до тех пор ответ даёт сводка (relation.content).
 */
export function isRelationVerified(relation: Relation): boolean {
  if (relation.verification !== 'verified') return false;
  return relation.sources ? hasVerifiedSources(relation.sources) : Boolean(relation.content?.verified);
}

/**
 * Проверен ли объект. Источники объектов базы грузятся вместе с модальным
 * окном, а до тех пор ответ даёт сводка редакционной базы (item.content),
 * собранная по тому же правилу.
 */
export function isItemVerified(item: TimelineItem): boolean {
  return item.sources ? hasVerifiedSources(item.sources) : Boolean(item.content?.verified);
}
