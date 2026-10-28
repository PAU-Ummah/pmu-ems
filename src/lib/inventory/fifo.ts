export interface InventoryLayer {
  id: string;
  receivedDate: string; // 'YYYY-MM-DD'
  remainingQty: number;
  unitCost: number; // may be 0 (donated)
  createdAt: string; // ISO datetime, tie-breaks equal receivedDate
}

export interface LayerConsumption {
  layerId: string;
  qtyConsumed: number;
  unitCost: number;
}

export interface FifoConsumptionResult {
  consumption: LayerConsumption[];
  updatedLayers: { layerId: string; remainingQty: number }[];
  totalCost: number;
}

export class InsufficientStockError extends Error {
  itemId: string;
  requested: number;
  available: number;

  constructor(itemId: string, requested: number, available: number) {
    super(
      `Insufficient stock for item ${itemId}: requested ${requested}, available ${available}`
    );
    this.name = 'InsufficientStockError';
    this.itemId = itemId;
    this.requested = requested;
    this.available = available;
  }
}

export function sortLayersForConsumption(layers: InventoryLayer[]): InventoryLayer[] {
  return layers
    .filter((layer) => layer.remainingQty > 0)
    .slice()
    .sort((a, b) => {
      if (a.receivedDate !== b.receivedDate) {
        return a.receivedDate < b.receivedDate ? -1 : 1;
      }
      if (a.createdAt !== b.createdAt) {
        return a.createdAt < b.createdAt ? -1 : 1;
      }
      return 0;
    });
}

export function consumeFifoLayers(
  layers: InventoryLayer[],
  itemId: string,
  quantityRequested: number
): FifoConsumptionResult {
  if (quantityRequested <= 0) {
    throw new Error('quantityRequested must be greater than 0');
  }

  const sorted = sortLayersForConsumption(layers);
  const totalAvailable = sorted.reduce((sum, layer) => sum + layer.remainingQty, 0);

  if (quantityRequested > totalAvailable) {
    throw new InsufficientStockError(itemId, quantityRequested, totalAvailable);
  }

  const consumption: LayerConsumption[] = [];
  const updatedLayers: { layerId: string; remainingQty: number }[] = [];
  let totalCost = 0;
  let remainingToConsume = quantityRequested;

  for (const layer of sorted) {
    if (remainingToConsume <= 0) break;

    const qtyConsumed = Math.min(layer.remainingQty, remainingToConsume);
    consumption.push({
      layerId: layer.id,
      qtyConsumed,
      unitCost: layer.unitCost,
    });
    updatedLayers.push({
      layerId: layer.id,
      remainingQty: layer.remainingQty - qtyConsumed,
    });
    totalCost += qtyConsumed * layer.unitCost;
    remainingToConsume -= qtyConsumed;
  }

  return { consumption, updatedLayers, totalCost };
}

export function calculateStockValue(layers: InventoryLayer[]): number {
  return layers.reduce((sum, layer) => sum + layer.remainingQty * layer.unitCost, 0);
}

export function getNextLayerToConsume(layers: InventoryLayer[]): InventoryLayer | undefined {
  return sortLayersForConsumption(layers)[0];
}
