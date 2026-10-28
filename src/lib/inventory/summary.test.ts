import { describe, test, expect } from 'vitest';
import { buildStockSummary, totalStockSummary } from './summary';
import type { SummaryLayer, SummaryMovement } from './summary';

// Item A: 10 @ 2.00 received 2026-01-02, 10 @ 3.00 received 2026-01-10.
const layers: SummaryLayer[] = [
  { itemId: 'A', receivedDate: '2026-01-02', quantityReceived: 10, unitCost: 2 },
  { itemId: 'A', receivedDate: '2026-01-10', quantityReceived: 10, unitCost: 3 },
];

const movements: SummaryMovement[] = [
  // Issue 12 on 2026-01-12: 10 from the first layer (@2) and 2 from the second (@3) = 26.
  {
    itemId: 'A',
    type: 'issue',
    date: '2026-01-12',
    layerConsumption: [
      { layerId: 'l1', qtyConsumed: 10, unitCost: 2 },
      { layerId: 'l2', qtyConsumed: 2, unitCost: 3 },
    ],
  },
  // Write-off 3 on 2026-01-20 from the second layer (@3) = 9.
  {
    itemId: 'A',
    type: 'writeoff',
    date: '2026-01-20',
    layerConsumption: [{ layerId: 'l2', qtyConsumed: 3, unitCost: 3 }],
  },
];

describe('buildStockSummary', () => {
  test('whole period: opening is zero, closing is what is left of the last layer', () => {
    const [row] = buildStockSummary(['A'], layers, movements, '2026-01-01', '2026-01-31');
    expect(row.openingQty).toBe(0);
    expect(row.openingValue).toBe(0);
    expect(row.receivedQty).toBe(20);
    expect(row.receivedCost).toBe(50);
    expect(row.issuedQty).toBe(12);
    expect(row.issuedCost).toBe(26);
    expect(row.writtenOffQty).toBe(3);
    expect(row.writtenOffCost).toBe(9);
    expect(row.closingQty).toBe(5);
    expect(row.closingValue).toBe(15);
  });

  test('later period: opening carries the earlier closing forward', () => {
    const [row] = buildStockSummary(['A'], layers, movements, '2026-01-15', '2026-01-31');
    expect(row.openingQty).toBe(8);
    expect(row.openingValue).toBe(24);
    expect(row.receivedQty).toBe(0);
    expect(row.issuedQty).toBe(0);
    expect(row.writtenOffQty).toBe(3);
    expect(row.writtenOffCost).toBe(9);
    expect(row.closingQty).toBe(5);
    expect(row.closingValue).toBe(15);
  });

  test('boundary dates are inclusive on both ends', () => {
    const [row] = buildStockSummary(['A'], layers, movements, '2026-01-10', '2026-01-12');
    expect(row.receivedQty).toBe(10);
    expect(row.issuedQty).toBe(12);
    expect(row.openingQty).toBe(10);
    expect(row.closingQty).toBe(8);
  });

  test('opening + received - issued - written off - adjusted = closing', () => {
    const adjustment: SummaryMovement = {
      itemId: 'A',
      type: 'adjustment',
      date: '2026-01-25',
      layerConsumption: [{ layerId: 'l2', qtyConsumed: 1, unitCost: 3 }],
    };
    const [row] = buildStockSummary(
      ['A'],
      layers,
      [...movements, adjustment],
      '2026-01-05',
      '2026-01-31'
    );
    expect(row.adjustedQty).toBe(1);
    expect(row.adjustedCost).toBe(3);
    expect(
      row.openingQty + row.receivedQty - row.issuedQty - row.writtenOffQty - row.adjustedQty
    ).toBe(row.closingQty);
    expect(
      row.openingValue +
        row.receivedCost -
        row.issuedCost -
        row.writtenOffCost -
        row.adjustedCost
    ).toBe(row.closingValue);
  });

  test('a stock-take gain (zero-cost layer, no consumption) counts as received at zero cost', () => {
    const found: SummaryLayer = {
      itemId: 'A',
      receivedDate: '2026-01-28',
      quantityReceived: 4,
      unitCost: 0,
    };
    const gain: SummaryMovement = {
      itemId: 'A',
      type: 'adjustment',
      date: '2026-01-28',
      layerConsumption: [],
    };
    const [row] = buildStockSummary(
      ['A'],
      [...layers, found],
      [...movements, gain],
      '2026-01-26',
      '2026-01-31'
    );
    expect(row.receivedQty).toBe(4);
    expect(row.receivedCost).toBe(0);
    expect(row.adjustedQty).toBe(0);
    expect(row.closingQty).toBe(9);
    expect(row.closingValue).toBe(15);
  });

  test('a donated layer at zero cost adds quantity but no value', () => {
    const donated: SummaryLayer = {
      itemId: 'A',
      receivedDate: '2026-01-03',
      quantityReceived: 5,
      unitCost: 0,
    };
    const [row] = buildStockSummary(['A'], [donated], [], '2026-01-01', '2026-01-31');
    expect(row.receivedQty).toBe(5);
    expect(row.receivedCost).toBe(0);
    expect(row.closingQty).toBe(5);
    expect(row.closingValue).toBe(0);
  });

  test('items are kept separate', () => {
    const otherLayer: SummaryLayer = {
      itemId: 'B',
      receivedDate: '2026-01-05',
      quantityReceived: 6,
      unitCost: 1,
    };
    const rows = buildStockSummary(
      ['A', 'B'],
      [...layers, otherLayer],
      movements,
      '2026-01-01',
      '2026-01-31'
    );
    expect(rows.find((r) => r.itemId === 'B')?.closingQty).toBe(6);
    expect(rows.find((r) => r.itemId === 'A')?.closingQty).toBe(5);
  });

  test('an item with no activity returns all zeros', () => {
    const [row] = buildStockSummary(['Z'], layers, movements, '2026-01-01', '2026-01-31');
    expect(row.closingQty).toBe(0);
    expect(row.closingValue).toBe(0);
  });
});

describe('totalStockSummary', () => {
  test('sums each column across items', () => {
    const rows = buildStockSummary(
      ['A', 'B'],
      [...layers, { itemId: 'B', receivedDate: '2026-01-05', quantityReceived: 6, unitCost: 1 }],
      movements,
      '2026-01-01',
      '2026-01-31'
    );
    const total = totalStockSummary(rows);
    expect(total.receivedQty).toBe(26);
    expect(total.closingQty).toBe(11);
    expect(total.closingValue).toBe(21);
  });
});
