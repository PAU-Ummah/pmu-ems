import type { InventoryLayer, LayerConsumption, FifoConsumptionResult } from '@/lib/inventory/fifo';

export { InsufficientStockError } from '@/lib/inventory/fifo';
export type { InventoryLayer, LayerConsumption, FifoConsumptionResult };

export type InventorySourceType = 'purchased' | 'donated';
export type MovementType = 'issue' | 'writeoff' | 'adjustment';
export type WriteOffReason = 'expired' | 'damaged' | 'lost';
export type RecipientGroup = 'everyone' | 'participants';

export interface InventoryItem {
  id?: string;
  name: string;
  unitOfMeasure: string;
  createdAt: string;
  createdBy: string;
}

export interface InventoryLayerDoc extends InventoryLayer {
  itemId: string;
  sourceType: InventorySourceType;
  quantityReceived: number;
  expiryDate?: string;
  createdBy: string;
}

export interface InventoryMovement {
  id?: string;
  itemId: string;
  type: MovementType;
  date: string;
  quantity: number;
  costOfGoods: number;
  layerConsumption: LayerConsumption[];
  eventId?: string;
  recipientGroup?: RecipientGroup;
  headcount?: number;
  reason?: WriteOffReason;
  createdAt: string;
  createdBy: string;
}
