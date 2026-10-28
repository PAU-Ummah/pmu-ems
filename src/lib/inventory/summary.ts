import type { LayerConsumption } from './fifo';

export interface SummaryLayer {
  itemId: string;
  receivedDate: string; // 'YYYY-MM-DD'
  quantityReceived: number;
  unitCost: number;
}

export interface SummaryMovement {
  itemId: string;
  type: 'issue' | 'writeoff' | 'adjustment';
  date: string; // 'YYYY-MM-DD'
  layerConsumption: LayerConsumption[];
}

export interface StockSummaryRow {
  itemId: string;
  openingQty: number;
  openingValue: number;
  receivedQty: number;
  receivedCost: number;
  issuedQty: number;
  issuedCost: number;
  writtenOffQty: number;
  writtenOffCost: number;
  adjustedQty: number;
  adjustedCost: number;
  closingQty: number;
  closingValue: number;
}

interface Flow {
  qty: number;
  cost: number;
}

const ZERO: Flow = { qty: 0, cost: 0 };

function consumed(movement: SummaryMovement): Flow {
  return movement.layerConsumption.reduce(
    (acc, c) => ({ qty: acc.qty + c.qtyConsumed, cost: acc.cost + c.qtyConsumed * c.unitCost }),
    ZERO
  );
}

function sumFlows(flows: Flow[]): Flow {
  return flows.reduce((acc, f) => ({ qty: acc.qty + f.qty, cost: acc.cost + f.cost }), ZERO);
}

/**
 * Stock and movement summary for one date range, per item.
 *
 * Quantities and costs are rebuilt from the layers (what came in) and the movements' recorded
 * layer consumption (what went out), so opening + received - issued - written off - adjusted
 * always equals closing. A stock-take gain is stored as a zero-cost layer, so it shows under
 * "received"; a stock-take shortage consumes layers like any other issue and shows under "adjusted".
 * Dates are 'YYYY-MM-DD' strings, which compare correctly as plain strings.
 */
export function buildStockSummary(
  itemIds: string[],
  layers: SummaryLayer[],
  movements: SummaryMovement[],
  from: string,
  to: string
): StockSummaryRow[] {
  return itemIds.map((itemId) => {
    const itemLayers = layers.filter((l) => l.itemId === itemId);
    const itemMovements = movements.filter((m) => m.itemId === itemId);

    const receivedFlow = (include: (date: string) => boolean): Flow =>
      sumFlows(
        itemLayers
          .filter((l) => include(l.receivedDate))
          .map((l) => ({ qty: l.quantityReceived, cost: l.quantityReceived * l.unitCost }))
      );

    const outFlow = (type: SummaryMovement['type'], include: (date: string) => boolean): Flow =>
      sumFlows(
        itemMovements.filter((m) => m.type === type && include(m.date)).map(consumed)
      );

    const before = (date: string) => date < from;
    const through = (date: string) => date <= to;
    const inRange = (date: string) => date >= from && date <= to;

    const openingIn = receivedFlow(before);
    const openingOut = sumFlows([
      outFlow('issue', before),
      outFlow('writeoff', before),
      outFlow('adjustment', before),
    ]);
    const closingIn = receivedFlow(through);
    const closingOut = sumFlows([
      outFlow('issue', through),
      outFlow('writeoff', through),
      outFlow('adjustment', through),
    ]);

    const received = receivedFlow(inRange);
    const issued = outFlow('issue', inRange);
    const writtenOff = outFlow('writeoff', inRange);
    const adjusted = outFlow('adjustment', inRange);

    return {
      itemId,
      openingQty: openingIn.qty - openingOut.qty,
      openingValue: openingIn.cost - openingOut.cost,
      receivedQty: received.qty,
      receivedCost: received.cost,
      issuedQty: issued.qty,
      issuedCost: issued.cost,
      writtenOffQty: writtenOff.qty,
      writtenOffCost: writtenOff.cost,
      adjustedQty: adjusted.qty,
      adjustedCost: adjusted.cost,
      closingQty: closingIn.qty - closingOut.qty,
      closingValue: closingIn.cost - closingOut.cost,
    };
  });
}

export function totalStockSummary(rows: StockSummaryRow[]): Omit<StockSummaryRow, 'itemId'> {
  return rows.reduce(
    (acc, r) => ({
      openingQty: acc.openingQty + r.openingQty,
      openingValue: acc.openingValue + r.openingValue,
      receivedQty: acc.receivedQty + r.receivedQty,
      receivedCost: acc.receivedCost + r.receivedCost,
      issuedQty: acc.issuedQty + r.issuedQty,
      issuedCost: acc.issuedCost + r.issuedCost,
      writtenOffQty: acc.writtenOffQty + r.writtenOffQty,
      writtenOffCost: acc.writtenOffCost + r.writtenOffCost,
      adjustedQty: acc.adjustedQty + r.adjustedQty,
      adjustedCost: acc.adjustedCost + r.adjustedCost,
      closingQty: acc.closingQty + r.closingQty,
      closingValue: acc.closingValue + r.closingValue,
    }),
    {
      openingQty: 0,
      openingValue: 0,
      receivedQty: 0,
      receivedCost: 0,
      issuedQty: 0,
      issuedCost: 0,
      writtenOffQty: 0,
      writtenOffCost: 0,
      adjustedQty: 0,
      adjustedCost: 0,
      closingQty: 0,
      closingValue: 0,
    }
  );
}
