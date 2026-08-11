import type { Relation, TimelineItem } from '../types';
import { hasVerifiedSources, isRelationVerified } from './provenance';

export type DataQualityReport = {
  items: { total: number; verified: number; coverage: number };
  relations: { total: number; verified: number; draft: number; coverage: number };
};

/** Машиночитаемый срез редакционного долга; используется тестами и будущей CMS. */
export function buildDataQualityReport(items: TimelineItem[], relations: Relation[]): DataQualityReport {
  const verifiedItems = items.filter((item) => hasVerifiedSources(item.sources)).length;
  const verifiedRelations = relations.filter(isRelationVerified).length;
  const coverage = (verified: number, total: number) => (total ? verified / total : 1);

  return {
    items: {
      total: items.length,
      verified: verifiedItems,
      coverage: coverage(verifiedItems, items.length),
    },
    relations: {
      total: relations.length,
      verified: verifiedRelations,
      draft: relations.length - verifiedRelations,
      coverage: coverage(verifiedRelations, relations.length),
    },
  };
}
