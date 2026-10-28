'use client';

import { useState, useEffect, useCallback } from 'react';
import { listInventoryItemsWithLayers } from '@/services/inventoryService';
import { computeOnHand } from '@/lib/inventory/onHand';
import { getNextLayerToConsume } from '@/lib/inventory/fifo';
import type { InventoryItem, InventoryLayerDoc } from '@/services/inventoryTypes';

export interface InventoryItemWithStock {
  item: InventoryItem;
  layers: InventoryLayerDoc[];
  onHand: number;
  nextLayer: InventoryLayerDoc | undefined;
}

export function useInventoryItems() {
  const [items, setItems] = useState<InventoryItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listInventoryItemsWithLayers();
      setItems(
        results.map(({ item, layers }) => ({
          item,
          layers,
          onHand: computeOnHand(layers),
          nextLayer: getNextLayerToConsume(layers) as InventoryLayerDoc | undefined,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refresh: fetchItems };
}
