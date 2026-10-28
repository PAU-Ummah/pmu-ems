import { describe, test, expect } from 'vitest';
import {
  sortLayersForConsumption,
  consumeFifoLayers,
  calculateStockValue,
  getNextLayerToConsume,
  addFoundLayer,
  InsufficientStockError,
  type InventoryLayer,
} from './fifo';

function layer(overrides: Partial<InventoryLayer>): InventoryLayer {
  return {
    id: 'layer-1',
    receivedDate: '2026-01-01',
    remainingQty: 10,
    unitCost: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('consumeFifoLayers', () => {
  test('partial layer consumption', () => {
    const layers = [layer({ id: 'a', remainingQty: 10 })];
    const result = consumeFifoLayers(layers, 'item-1', 4);

    expect(result.consumption).toHaveLength(1);
    expect(result.consumption[0]).toEqual({ layerId: 'a', qtyConsumed: 4, unitCost: 1 });
    expect(result.updatedLayers).toEqual([{ layerId: 'a', remainingQty: 6 }]);
    expect(result.totalCost).toBe(4);
  });

  test('multi-layer issue drains older layer first then partially drains newer', () => {
    const layers = [
      layer({ id: 'older', remainingQty: 5, receivedDate: '2026-01-01', unitCost: 2 }),
      layer({ id: 'newer', remainingQty: 5, receivedDate: '2026-01-05', unitCost: 3 }),
    ];
    const result = consumeFifoLayers(layers, 'item-1', 8);

    expect(result.consumption).toEqual([
      { layerId: 'older', qtyConsumed: 5, unitCost: 2 },
      { layerId: 'newer', qtyConsumed: 3, unitCost: 3 },
    ]);
    expect(result.updatedLayers).toEqual([
      { layerId: 'older', remainingQty: 0 },
      { layerId: 'newer', remainingQty: 2 },
    ]);
    expect(result.totalCost).toBe(5 * 2 + 3 * 3);
  });

  test('over-issue is rejected with InsufficientStockError and no partial result', () => {
    const layers = [
      layer({ id: 'a', remainingQty: 5 }),
      layer({ id: 'b', remainingQty: 5, receivedDate: '2026-01-02' }),
    ];

    let caught: unknown;
    try {
      consumeFifoLayers(layers, 'item-1', 11);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(InsufficientStockError);
    const error = caught as InsufficientStockError;
    expect(error.available).toBe(10);
    expect(error.requested).toBe(11);
    expect(error.itemId).toBe('item-1');
    expect((error as unknown as Record<string, unknown>).consumption).toBeUndefined();
    expect((error as unknown as Record<string, unknown>).updatedLayers).toBeUndefined();
  });

  test('zero-cost donated layer contributes 0 to totalCost', () => {
    const layers = [layer({ id: 'donated', remainingQty: 10, unitCost: 0 })];
    const result = consumeFifoLayers(layers, 'item-1', 6);

    expect(result.totalCost).toBe(0);
  });

  test('mixed issue spanning one zero-cost and one priced layer produces correct partial totalCost', () => {
    const layers = [
      layer({ id: 'donated', remainingQty: 5, unitCost: 0, receivedDate: '2026-01-01' }),
      layer({ id: 'priced', remainingQty: 5, unitCost: 4, receivedDate: '2026-01-02' }),
    ];
    const result = consumeFifoLayers(layers, 'item-1', 7);

    expect(result.totalCost).toBe(0 * 5 + 4 * 2);
    expect(result.updatedLayers).toEqual([
      { layerId: 'donated', remainingQty: 0 },
      { layerId: 'priced', remainingQty: 3 },
    ]);
  });

  test('exact-match consumption drains last touched layer to exactly 0', () => {
    const layers = [
      layer({ id: 'a', remainingQty: 5, receivedDate: '2026-01-01' }),
      layer({ id: 'b', remainingQty: 5, receivedDate: '2026-01-02' }),
    ];
    const result = consumeFifoLayers(layers, 'item-1', 10);

    expect(result.updatedLayers[result.updatedLayers.length - 1]).toEqual({
      layerId: 'b',
      remainingQty: 0,
    });
  });

  test('tie-break: identical receivedDate, earlier createdAt consumed first', () => {
    const layers = [
      layer({
        id: 'second-created',
        remainingQty: 5,
        receivedDate: '2026-01-01',
        createdAt: '2026-01-01T12:00:00.000Z',
      }),
      layer({
        id: 'first-created',
        remainingQty: 5,
        receivedDate: '2026-01-01',
        createdAt: '2026-01-01T08:00:00.000Z',
      }),
    ];
    const result = consumeFifoLayers(layers, 'item-1', 3);

    expect(result.consumption[0].layerId).toBe('first-created');
  });

  test.each([0, -1, -10])('quantityRequested <= 0 throws a plain Error (%d)', (qty) => {
    const layers = [layer({ id: 'a', remainingQty: 5 })];
    let caught: unknown;
    try {
      consumeFifoLayers(layers, 'item-1', qty);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(InsufficientStockError);
  });

  test('input layers are never mutated', () => {
    const layers = [layer({ id: 'a', remainingQty: 10 })];
    const snapshot = JSON.parse(JSON.stringify(layers));
    consumeFifoLayers(layers, 'item-1', 4);
    expect(layers).toEqual(snapshot);
  });
});

describe('sortLayersForConsumption', () => {
  test('filters out layers with remainingQty <= 0', () => {
    const layers = [
      layer({ id: 'empty', remainingQty: 0 }),
      layer({ id: 'has-stock', remainingQty: 3, receivedDate: '2026-01-05' }),
    ];
    const result = sortLayersForConsumption(layers);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('has-stock');
  });
});

describe('getNextLayerToConsume', () => {
  test('returns the oldest layer with stock', () => {
    const layers = [
      layer({ id: 'newer', remainingQty: 5, receivedDate: '2026-01-05' }),
      layer({ id: 'older', remainingQty: 5, receivedDate: '2026-01-01' }),
    ];
    expect(getNextLayerToConsume(layers)?.id).toBe('older');
  });

  test('returns undefined when no layers have stock', () => {
    const layers = [layer({ id: 'empty', remainingQty: 0 })];
    expect(getNextLayerToConsume(layers)).toBeUndefined();
  });
});

describe('calculateStockValue', () => {
  test('sums remainingQty * unitCost over all layers', () => {
    const layers = [
      layer({ id: 'a', remainingQty: 5, unitCost: 2 }),
      layer({ id: 'b', remainingQty: 3, unitCost: 0 }),
    ];
    expect(calculateStockValue(layers)).toBe(10);
  });

  test('returns 0 for an empty layer list', () => {
    expect(calculateStockValue([])).toBe(0);
  });
});

describe('addFoundLayer', () => {
  test('creates a zero-cost layer sized to the found quantity', () => {
    const result = addFoundLayer(5, '2026-02-01', '2026-02-01T00:00:00.000Z');
    expect(result).toEqual({
      receivedDate: '2026-02-01',
      remainingQty: 5,
      unitCost: 0,
      createdAt: '2026-02-01T00:00:00.000Z',
    });
  });

  test('throws a plain Error when quantityFound is 0 or negative', () => {
    expect(() => addFoundLayer(0, '2026-02-01', '2026-02-01T00:00:00.000Z')).toThrow(Error);
    expect(() => addFoundLayer(-3, '2026-02-01', '2026-02-01T00:00:00.000Z')).toThrow(Error);
  });
});
