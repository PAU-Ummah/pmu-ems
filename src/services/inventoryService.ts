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
  consumeFifoLayers,
  sortLayersForConsumption,
  type InventoryLayer,
} from '@/lib/inventory/fifo';
import type {
  InventoryItem,
  InventoryLayerDoc,
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
  type: 'issue' | 'writeoff';
  quantity: number;
  date: string;
  createdBy: string;
  reason?: WriteOffReason;
  eventId?: string;
  recipientGroup?: RecipientGroup;
  headcount?: number;
}

async function consumeAndRecordMovement(opts: ConsumeAndRecordMovementOpts): Promise<string> {
  const layersQuery = query(
    collection(db, 'inventoryLayers'),
    where('itemId', '==', opts.itemId),
    where('remainingQty', '>', 0)
  );
  const candidateSnapshot = await getDocs(layersQuery);
  const candidateRefs = candidateSnapshot.docs.map((snap) => snap.ref);

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

    if (opts.type === 'writeoff') {
      movementData.reason = opts.reason;
    } else {
      if (opts.eventId !== undefined) movementData.eventId = opts.eventId;
      if (opts.recipientGroup !== undefined) movementData.recipientGroup = opts.recipientGroup;
      if (opts.headcount !== undefined) movementData.headcount = opts.headcount;
    }

    transaction.set(movementRef, movementData);
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
