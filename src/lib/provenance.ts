import type { Relation, SourceLink } from '../types';

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
