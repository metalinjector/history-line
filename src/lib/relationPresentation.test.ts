import { describe, expect, it } from 'vitest';
import type { Relation } from '../types';
import { relationHint, relationPresentation } from './relationPresentation';

const relation = (kind: Relation['kind']): Relation => ({
  id: kind,
  from: 'a',
  to: 'b',
  kind,
  label: kind,
  detail: kind,
});

describe('relation presentation', () => {
  it('keeps causal influence directed', () => {
    expect(relationHint(relation('influence'), 'a')).toBe('повлияло на');
    expect(relationHint(relation('influence'), 'b')).toBe('испытало влияние');
    expect(relationPresentation.influence.roles).toEqual(['Импульс', 'Результат']);
  });

  it.each(['conflict', 'exchange', 'comparison', 'context'] as const)(
    'presents %s symmetrically',
    (kind) => {
      expect(relationHint(relation(kind), 'a')).toBe(relationHint(relation(kind), 'b'));
      expect(relationPresentation[kind].arrow).not.toBe('→');
    },
  );
});
