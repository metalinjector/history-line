import { describe, expect, it } from 'vitest';
import { buildColumns } from '../data/columns';
import { applyLayers, materializeLayerItems } from './layers';

describe('layer placement', () => {
  it('does not materialize a layer whose host country is hidden', () => {
    const result = applyLayers(buildColumns(['france'], []), ['einstein'], {
      einstein: 'germany',
    });

    expect(result.state.placed).toHaveLength(0);
    expect(result.state.unplacedReasons.einstein).toBe('hidden-host');
    expect(materializeLayerItems(result.state.placed.map((layer) => layer.id), {}, 'france')).toHaveLength(0);
  });

  it('keeps historical context visible but rejects a layer after the manual three-country cap', () => {
    const result = applyLayers(
      buildColumns(['germany', 'england', 'france'], [['germany', 'england', 'france']]),
      ['einstein'],
      { einstein: 'germany' },
    );

    expect(result.columns[0].tracks).toHaveLength(5);
    expect(result.state.placed).toHaveLength(0);
    expect(result.state.unplacedReasons.einstein).toBe('full-host');
  });

  it('keeps an own-column layer available even when country columns are full', () => {
    const result = applyLayers(
      buildColumns(['germany', 'england', 'france'], [['germany', 'england', 'france']]),
      ['einstein'],
      { einstein: 'own' },
    );

    expect(result.state.placed.map((layer) => layer.id)).toEqual(['einstein']);
    expect(result.columns.at(-1)?.layerOnly).toBe(true);
  });
});
