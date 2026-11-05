'use client';

import { useState } from 'react';
import Link from 'next/link';
import RoleGuard from '@/components/auth/RoleGuard';
import { Add } from '@mui/icons-material';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Loading from '@/components/loading/Loading';
import EmptyState from '@/components/empty-state/EmptyState';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useEvents } from '@/hooks/useEvents';
import { useCurrentSession } from '@/hooks/useCurrentSession';
import { useRole } from '@/hooks/useRole';
import {
  archiveInventoryItem,
  deleteInventoryItem,
  restoreInventoryItem,
} from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import ItemForm from './_component/ItemForm';
import ReceiptForm from './_component/ReceiptForm';
import IssueForm from './_component/IssueForm';
import WriteOffForm from './_component/WriteOffForm';
import StockTakeForm from './_component/StockTakeForm';

export default function InventoryPage() {
  const { items, loading, refresh } = useInventoryItems();
  const { currentSessionId } = useCurrentSession();
  const { events } = useEvents(currentSessionId);
  const { canAdminInventory } = useRole();
  const { user } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [receiptFormOpen, setReceiptFormOpen] = useState(false);
  const [receiptDefaultItemId, setReceiptDefaultItemId] = useState<string | undefined>(undefined);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [issueDefaultItemId, setIssueDefaultItemId] = useState<string | undefined>(undefined);
  const [writeOffFormOpen, setWriteOffFormOpen] = useState(false);
  const [writeOffDefaultItemId, setWriteOffDefaultItemId] = useState<string | undefined>(undefined);
  const [stockTakeFormOpen, setStockTakeFormOpen] = useState(false);
  const [stockTakeDefaultItemId, setStockTakeDefaultItemId] = useState<string | undefined>(undefined);

  const openReceiptForm = (itemId?: string) => {
    setReceiptDefaultItemId(itemId);
    setReceiptFormOpen(true);
  };

  const openIssueForm = (itemId?: string) => {
    setIssueDefaultItemId(itemId);
    setIssueFormOpen(true);
  };

  const openWriteOffForm = (itemId?: string) => {
    setWriteOffDefaultItemId(itemId);
    setWriteOffFormOpen(true);
  };

  const openStockTakeForm = (itemId?: string) => {
    setStockTakeDefaultItemId(itemId);
    setStockTakeFormOpen(true);
  };

  const activeItems = items.filter(({ item }) => !item.archived);
  const visibleItems = showArchived ? items : activeItems;

  const runItemAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleDelete = (itemId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    runItemAction(() => deleteInventoryItem(itemId));
  };

  const handleArchive = (itemId: string, name: string) => {
    if (!user) return;
    if (!window.confirm(`Archive "${name}"? Its history is kept and you can restore it later.`)) return;
    runItemAction(() => archiveInventoryItem(itemId, user.uid));
  };

  return (
    <RoleGuard
      allowedRoles={['event-organizer', 'it', 'finance-manager', 'admin', 'registrar']}
    >
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          Inventory
        </h1>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant="primary"
            startIcon={<Add />}
            onClick={() => setItemFormOpen(true)}
          >
            Add Item
          </Button>
          <Button
            variant="outline"
            startIcon={<Add />}
            onClick={() => openReceiptForm(undefined)}
          >
            Add Receipt
          </Button>
          <Button
            variant="outline"
            onClick={() => openStockTakeForm(undefined)}
          >
            Stock Take
          </Button>
          {canAdminInventory() && (
            <Link href="/inventory/reports">
              <Button variant="outline">Reports &amp; Valuation</Button>
            </Link>
          )}
          {canAdminInventory() && (
            <label className="flex items-center gap-2 px-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
          )}
        </div>

        {actionError && <p className="mb-4 text-sm text-error-500">{actionError}</p>}

        {loading ? (
          <Loading />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="No inventory items yet"
            description="Add an item to start tracking refreshment stock."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {visibleItems.map(({ item, layers, onHand, nextLayer }) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white/90">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.unitOfMeasure}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color="primary" variant="light" size="md">
                      On hand: {onHand}
                    </Badge>
                    {item.archived ? (
                      <>
                        <Badge color="warning" variant="light" size="md">
                          Archived
                        </Badge>
                        {canAdminInventory() && (
                          <Button
                            variant="outline"
                            onClick={() => runItemAction(() => restoreInventoryItem(item.id!))}
                            className="text-xs"
                          >
                            Restore
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          startIcon={<Add />}
                          onClick={() => openReceiptForm(item.id)}
                          className="text-xs"
                        >
                          Add Receipt
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openIssueForm(item.id)}
                          className="text-xs"
                        >
                          Issue Stock
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openStockTakeForm(item.id)}
                          className="text-xs"
                        >
                          Stock Take
                        </Button>
                        {canAdminInventory() && (
                          <Button
                            variant="outline"
                            onClick={() => openWriteOffForm(item.id)}
                            className="text-xs"
                          >
                            Write Off
                          </Button>
                        )}
                        {canAdminInventory() && layers.length === 0 && (
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(item.id!, item.name)}
                            className="text-xs"
                          >
                            Delete
                          </Button>
                        )}
                        {canAdminInventory() && layers.length > 0 && onHand === 0 && (
                          <Button
                            variant="outline"
                            onClick={() => handleArchive(item.id!, item.name)}
                            className="text-xs"
                          >
                            Archive
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {layers.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    No batches recorded yet.
                  </p>
                ) : (
                  <div className="max-w-full overflow-x-auto">
                    <div className="min-w-[650px]">
                      <Table>
                        <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                          <TableRow>
                            <TableCell
                              isHeader
                              className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                            >
                              Received
                            </TableCell>
                            <TableCell
                              isHeader
                              className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                            >
                              Source
                            </TableCell>
                            <TableCell
                              isHeader
                              className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                            >
                              Remaining / Received
                            </TableCell>
                            <TableCell
                              isHeader
                              className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                            >
                              Expiry
                            </TableCell>
                            <TableCell
                              isHeader
                              className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                            >
                              Status
                            </TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {layers.map((layer) => (
                            <TableRow
                              key={layer.id}
                              className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                            >
                              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                                {layer.receivedDate}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                                {layer.sourceType}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                                {layer.remainingQty} / {layer.quantityReceived}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                                {layer.expiryDate ?? '—'}
                              </TableCell>
                              <TableCell className="px-5 py-4 text-start">
                                {nextLayer?.id === layer.id && (
                                  <Badge color="success" variant="light" size="sm">
                                    Next
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <ItemForm
          isOpen={itemFormOpen}
          onClose={() => setItemFormOpen(false)}
          onCreated={refresh}
        />
        <ReceiptForm
          isOpen={receiptFormOpen}
          onClose={() => setReceiptFormOpen(false)}
          items={activeItems.map(({ item }) => item)}
          defaultItemId={receiptDefaultItemId}
          onCreated={refresh}
        />
        <IssueForm
          isOpen={issueFormOpen}
          onClose={() => setIssueFormOpen(false)}
          items={activeItems.map(({ item }) => item)}
          events={events}
          defaultItemId={issueDefaultItemId}
          onCreated={refresh}
        />
        <WriteOffForm
          isOpen={writeOffFormOpen}
          onClose={() => setWriteOffFormOpen(false)}
          items={activeItems.map(({ item }) => item)}
          defaultItemId={writeOffDefaultItemId}
          onCreated={refresh}
        />
        <StockTakeForm
          isOpen={stockTakeFormOpen}
          onClose={() => setStockTakeFormOpen(false)}
          items={activeItems.map(({ item }) => item)}
          itemsWithStock={activeItems}
          defaultItemId={stockTakeDefaultItemId}
          onCreated={refresh}
        />
      </div>
    </RoleGuard>
  );
}
