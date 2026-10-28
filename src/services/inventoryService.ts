import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import {
  addFoundLayer,
  consumeFifoLayers,
  sortLayersForConsumption,
  type InventoryLayer,
} from '@/lib/inventory/fifo';
import type {
  AdjustmentReason,
  InventoryItem,
  InventoryLayerDoc,
  InventoryMovement,
  InventorySourceType,
  RecipientGroup,
  WriteOffReason,
} from '@/services/inventoryTypes';

export async function createInventoryItem(
  name: string,
  unitOfMeasure: string,
  createdBy: string
): Promise<string> {
  const trimmedName = name.trim();
  const trimmedUnit = unitOfMeasure.trim();
  if (!trimmedName) {
    throw new Error('Item name is required');
  }
  if (!trimmedUnit) {
    throw new Error('Unit of measure is required');
  }

  const docRef = await addDoc(collection(db, 'inventoryItems'), {
    name: trimmedName,
    unitOfMeasure: trimmedUnit,
    createdAt: new Date().toISOString(),
    createdBy,
  });
  return docRef.id;
}

export interface CreateReceiptParams {
  itemId: string;
  sourceType: InventorySourceType;
  receivedDate: string;
  quantityReceived: number;
  unitCost: number;
  expiryDate?: string;
  createdBy: string;
}

export async function createReceipt(params: CreateReceiptParams): Promise<string> {
  if (params.quantityReceived <= 0) {
    throw new Error('quantityReceived must be greater than 0');
  }
  if (params.unitCost < 0) {
    throw new Error('unitCost must be 0 or greater');
  }

  const docRef = await addDoc(collection(db, 'inventoryLayers'), {
    ...params,
    remainingQty: params.quantityReceived,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

interface ConsumeAndRecordMovementOpts {
  itemId: string;
  type: 'issue' | 'writeoff' | 'adjustment';
  quantity: number;
  date: string;
  createdBy: string;
  reason?: AdjustmentReason;
  eventId?: string;
  recipientGroup?: RecipientGroup;
  headcount?: number;
  /** A stock-take count record, written in the same transaction as the adjustment. */
  countData?: Record<string, unknown>;
}

async function consumeAndRecordMovement(opts: ConsumeAndRecordMovementOpts): Promise<string> {
  // Equality-only query (no range filter) so no composite index is needed; empty layers are skipped here.
  const layersQuery = query(collection(db, 'inventoryLayers'), where('itemId', '==', opts.itemId));
  const candidateSnapshot = await getDocs(layersQuery);
  const candidateRefs = candidateSnapshot.docs
    .filter((snap) => (snap.data().remainingQty as number) > 0)
    .map((snap) => snap.ref);

  const movementRef = doc(collection(db, 'inventoryMovements'));

  await runTransaction(db, async (transaction) => {
    const freshLayers: InventoryLayer[] = [];
    for (const ref of candidateRefs) {
      const snap = await transaction.get(ref);
      if (!snap.exists()) continue;
      const data = snap.data();
      freshLayers.push({
        id: ref.id,
        receivedDate: data.receivedDate,
        remainingQty: data.remainingQty,
        unitCost: data.unitCost,
        createdAt: data.createdAt,
      });
    }

    const result = consumeFifoLayers(freshLayers, opts.itemId, opts.quantity);

    const layerRefById = new Map(candidateRefs.map((ref) => [ref.id, ref]));
    for (const updated of result.updatedLayers) {
      const ref = layerRefById.get(updated.layerId);
      if (!ref) continue;
      transaction.update(ref, { remainingQty: updated.remainingQty });
    }

    const movementData: Record<string, unknown> = {
      itemId: opts.itemId,
      type: opts.type,
      date: opts.date,
      quantity: opts.quantity,
      costOfGoods: result.totalCost,
      layerConsumption: result.consumption,
      createdAt: new Date().toISOString(),
      createdBy: opts.createdBy,
    };

    if (opts.type === 'writeoff' || opts.type === 'adjustment') {
      movementData.reason = opts.reason;
    } else {
      if (opts.eventId !== undefined) movementData.eventId = opts.eventId;
      if (opts.recipientGroup !== undefined) movementData.recipientGroup = opts.recipientGroup;
      if (opts.headcount !== undefined) movementData.headcount = opts.headcount;
    }

    transaction.set(movementRef, movementData);
    if (opts.countData) {
      transaction.set(doc(collection(db, 'inventoryCounts')), opts.countData);
    }
  });

  return movementRef.id;
}

export interface IssueStockOpts {
  itemId: string;
  quantity: number;
  date: string;
  createdBy: string;
  eventId?: string;
  recipientGroup?: RecipientGroup;
  headcount?: number;
}

export async function issueStock(opts: IssueStockOpts): Promise<string> {
  return consumeAndRecordMovement({ ...opts, type: 'issue' });
}

export interface WriteOffStockOpts {
  itemId: string;
  quantity: number;
  date: string;
  createdBy: string;
  reason: WriteOffReason;
}

export async function writeOffStock(opts: WriteOffStockOpts): Promise<string> {
  if (!opts.reason) {
    throw new Error('A reason (expired, damaged, or lost) is required for a write-off');
  }
  return consumeAndRecordMovement({ ...opts, type: 'writeoff' });
}

export interface RecordStockTakeOpts {
  itemId: string;
  countedQty: number;
  systemQtyAtCount: number;
  date: string;
  createdBy: string;
  reason?: AdjustmentReason;
  photoPath?: string;
  photoUrl?: string;
}

export async function recordStockTake(opts: RecordStockTakeOpts): Promise<void> {
  if (opts.countedQty < 0) {
    throw new Error('countedQty must be 0 or greater');
  }
  if (opts.countedQty !== opts.systemQtyAtCount && !opts.reason) {
    throw new Error('A reason is required when the counted quantity differs from the system quantity');
  }

  const variance = opts.countedQty - opts.systemQtyAtCount;
  const createdAt = new Date().toISOString();
  const countData: Record<string, unknown> = {
    itemId: opts.itemId,
    countedQty: opts.countedQty,
    systemQtyAtCount: opts.systemQtyAtCount,
    variance,
    date: opts.date,
    createdAt,
    createdBy: opts.createdBy,
  };
  if (opts.photoPath) countData.photoPath = opts.photoPath;
  if (opts.photoUrl) countData.photoUrl = opts.photoUrl;

  // The count record and any adjustment it causes are written in one transaction,
  // so a failed adjustment never leaves a count behind without its movement.
  if (variance === 0) {
    await addDoc(collection(db, 'inventoryCounts'), countData);
    return;
  }

  if (variance < 0) {
    await consumeAndRecordMovement({
      itemId: opts.itemId,
      type: 'adjustment',
      quantity: -variance,
      date: opts.date,
      createdBy: opts.createdBy,
      reason: opts.reason,
      countData,
    });
    return;
  }

  const movementRef = doc(collection(db, 'inventoryMovements'));
  await runTransaction(db, async (transaction) => {
    const foundLayer = addFoundLayer(variance, opts.date, createdAt);
    const layerRef = doc(collection(db, 'inventoryLayers'));
    transaction.set(layerRef, {
      itemId: opts.itemId,
      sourceType: 'donated',
      receivedDate: foundLayer.receivedDate,
      quantityReceived: foundLayer.remainingQty,
      remainingQty: foundLayer.remainingQty,
      unitCost: foundLayer.unitCost,
      createdAt: foundLayer.createdAt,
      createdBy: opts.createdBy,
    });
    transaction.set(movementRef, {
      itemId: opts.itemId,
      type: 'adjustment',
      date: opts.date,
      quantity: variance,
      costOfGoods: 0,
      layerConsumption: [],
      reason: opts.reason,
      createdAt,
      createdBy: opts.createdBy,
    });
    transaction.set(doc(collection(db, 'inventoryCounts')), countData);
  });
}

function layerDocFromSnapshot(
  snap: { id: string; data: () => Record<string, unknown> }
): InventoryLayerDoc {
  const data = snap.data();
  return {
    id: snap.id,
    itemId: data.itemId as string,
    sourceType: data.sourceType as InventorySourceType,
    receivedDate: data.receivedDate as string,
    quantityReceived: data.quantityReceived as number,
    remainingQty: data.remainingQty as number,
    unitCost: data.unitCost as number,
    expiryDate: data.expiryDate as string | undefined,
    createdAt: data.createdAt as string,
    createdBy: data.createdBy as string,
  };
}

export async function getItemWithLayers(
  itemId: string
): Promise<{ item: InventoryItem; layers: InventoryLayerDoc[] }> {
  const itemSnap = await getDoc(doc(db, 'inventoryItems', itemId));
  if (!itemSnap.exists()) {
    throw new Error(`Inventory item ${itemId} not found`);
  }
  const item = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;

  const layersSnap = await getDocs(
    query(collection(db, 'inventoryLayers'), where('itemId', '==', itemId))
  );
  const layers = sortLayersForConsumption(
    layersSnap.docs.map(layerDocFromSnapshot)
  ) as InventoryLayerDoc[];

  return { item, layers };
}

export interface InventoryReportData {
  items: InventoryItem[];
  layers: InventoryLayerDoc[];
  movements: InventoryMovement[];
}

/** Every item, every layer (including fully used ones) and every movement, for reporting. */
export async function loadInventoryReportData(): Promise<InventoryReportData> {
  const [itemsSnap, layersSnap, movementsSnap] = await Promise.all([
    getDocs(collection(db, 'inventoryItems')),
    getDocs(collection(db, 'inventoryLayers')),
    getDocs(collection(db, 'inventoryMovements')),
  ]);

  return {
    items: itemsSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }) as InventoryItem),
    layers: layersSnap.docs.map(layerDocFromSnapshot),
    movements: movementsSnap.docs.map(
      (snap) => ({ id: snap.id, ...snap.data() }) as InventoryMovement
    ),
  };
}

export async function listInventoryItemsWithLayers(): Promise<
  { item: InventoryItem; layers: InventoryLayerDoc[] }[]
> {
  const itemsSnap = await getDocs(collection(db, 'inventoryItems'));
  const results: { item: InventoryItem; layers: InventoryLayerDoc[] }[] = [];

  for (const itemSnap of itemsSnap.docs) {
    const item = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;
    const layersSnap = await getDocs(
      query(collection(db, 'inventoryLayers'), where('itemId', '==', itemSnap.id))
    );
    const layers = sortLayersForConsumption(
      layersSnap.docs.map(layerDocFromSnapshot)
    ) as InventoryLayerDoc[];
    results.push({ item, layers });
  }

  return results;
}
