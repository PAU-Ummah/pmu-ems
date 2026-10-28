'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowBack, Download } from '@mui/icons-material';
import RoleGuard from '@/components/auth/RoleGuard';
import Button from '@/components/ui/button/Button';
import Loading from '@/components/loading/Loading';
import EmptyState from '@/components/empty-state/EmptyState';
import InputField from '@/components/form/input/InputField';
import Label from '@/components/form/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { downloadCSV } from '@/utils/pdfGenerator';
import {
  loadInventoryReportData,
  type InventoryReportData,
} from '@/services/inventoryService';
import { calculateStockValue } from '@/lib/inventory/fifo';
import { buildStockSummary, totalStockSummary } from '@/lib/inventory/summary';

const headerCell =
  'text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90';
const bodyCell = 'px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400';

const money = (value: number) => value.toFixed(2);

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
}

function today(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function InventoryReportsPage() {
  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadInventoryReportData());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rangeValid = !!from && !!to && from <= to;

  const rows = useMemo(() => {
    if (!data || !rangeValid) return [];
    return buildStockSummary(
      data.items.map((item) => item.id as string),
      data.layers,
      data.movements,
      from,
      to
    );
  }, [data, from, to, rangeValid]);

  const totals = useMemo(() => totalStockSummary(rows), [rows]);

  const valuation = useMemo(() => {
    if (!data) return [];
    return data.items.map((item) => {
      const itemLayers = data.layers.filter((layer) => layer.itemId === item.id);
      return {
        item,
        onHand: itemLayers.reduce((sum, layer) => sum + layer.remainingQty, 0),
        value: calculateStockValue(itemLayers),
      };
    });
  }, [data]);

  const valuationTotal = valuation.reduce((sum, row) => sum + row.value, 0);

  const itemName = (itemId: string) =>
    data?.items.find((item) => item.id === itemId)?.name ?? itemId;

  const handleDownload = () => {
    const csvRows = rows.map((row) => ({
      Item: itemName(row.itemId),
      'Opening Qty': row.openingQty,
      'Opening Value': money(row.openingValue),
      'Received Qty': row.receivedQty,
      'Received Cost': money(row.receivedCost),
      'Issued Qty': row.issuedQty,
      'Issued Cost': money(row.issuedCost),
      'Written Off Qty': row.writtenOffQty,
      'Written Off Cost': money(row.writtenOffCost),
      'Stock-take Shortage Qty': row.adjustedQty,
      'Stock-take Shortage Cost': money(row.adjustedCost),
      'Closing Qty': row.closingQty,
      'Closing Value': money(row.closingValue),
    }));
    csvRows.push({
      Item: 'TOTAL',
      'Opening Qty': totals.openingQty,
      'Opening Value': money(totals.openingValue),
      'Received Qty': totals.receivedQty,
      'Received Cost': money(totals.receivedCost),
      'Issued Qty': totals.issuedQty,
      'Issued Cost': money(totals.issuedCost),
      'Written Off Qty': totals.writtenOffQty,
      'Written Off Cost': money(totals.writtenOffCost),
      'Stock-take Shortage Qty': totals.adjustedQty,
      'Stock-take Shortage Cost': money(totals.adjustedCost),
      'Closing Qty': totals.closingQty,
      'Closing Value': money(totals.closingValue),
    });
    downloadCSV(csvRows, `inventory_summary_${from}_to_${to}.csv`);
  };

  const cell = (qty: number, cost: number) => `${qty} (${money(cost)})`;

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
            Inventory Reports
          </h1>
          <Link href="/inventory">
            <Button variant="outline" startIcon={<ArrowBack />}>
              Back to Inventory
            </Button>
          </Link>
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <p className="text-sm text-error-600">{error}</p>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No inventory items yet"
            description="Add items and receipts before running a report."
          />
        ) : (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white/90">
                Stock and movement summary
              </h2>
              <div className="mb-4 flex flex-wrap items-end gap-4">
                <div>
                  <Label htmlFor="reportFrom">From</Label>
                  <InputField
                    id="reportFrom"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reportTo">To</Label>
                  <InputField
                    id="reportTo"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <Button
                  variant="primary"
                  startIcon={<Download />}
                  onClick={handleDownload}
                  disabled={!rangeValid}
                >
                  Download CSV
                </Button>
              </div>

              {!rangeValid ? (
                <p className="text-sm text-error-600">
                  Choose a start date that is on or before the end date.
                </p>
              ) : (
                <>
                  <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="min-w-[900px]">
                      <Table>
                        <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                          <TableRow>
                            <TableCell isHeader className={headerCell}>Item</TableCell>
                            <TableCell isHeader className={headerCell}>Opening</TableCell>
                            <TableCell isHeader className={headerCell}>Received</TableCell>
                            <TableCell isHeader className={headerCell}>Issued</TableCell>
                            <TableCell isHeader className={headerCell}>Written off</TableCell>
                            <TableCell isHeader className={headerCell}>Stock-take shortage</TableCell>
                            <TableCell isHeader className={headerCell}>Closing</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {rows.map((row) => (
                            <TableRow key={row.itemId}>
                              <TableCell className={bodyCell}>{itemName(row.itemId)}</TableCell>
                              <TableCell className={bodyCell}>{cell(row.openingQty, row.openingValue)}</TableCell>
                              <TableCell className={bodyCell}>{cell(row.receivedQty, row.receivedCost)}</TableCell>
                              <TableCell className={bodyCell}>{cell(row.issuedQty, row.issuedCost)}</TableCell>
                              <TableCell className={bodyCell}>{cell(row.writtenOffQty, row.writtenOffCost)}</TableCell>
                              <TableCell className={bodyCell}>{cell(row.adjustedQty, row.adjustedCost)}</TableCell>
                              <TableCell className={bodyCell}>{cell(row.closingQty, row.closingValue)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className={`${bodyCell} font-semibold`}>Total</TableCell>
                            <TableCell className={`${bodyCell} font-semibold`}>{cell(totals.openingQty, totals.openingValue)}</TableCell>
                            <TableCell className={`${bodyCell} font-semibold`}>{cell(totals.receivedQty, totals.receivedCost)}</TableCell>
                            <TableCell className={`${bodyCell} font-semibold`}>{cell(totals.issuedQty, totals.issuedCost)}</TableCell>
                            <TableCell className={`${bodyCell} font-semibold`}>{cell(totals.writtenOffQty, totals.writtenOffCost)}</TableCell>
                            <TableCell className={`${bodyCell} font-semibold`}>{cell(totals.adjustedQty, totals.adjustedCost)}</TableCell>
                            <TableCell className={`${bodyCell} font-semibold`}>{cell(totals.closingQty, totals.closingValue)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Each cell shows quantity, then cost in brackets. Opening + received − issued −
                    written off − stock-take shortage = closing. Stock found in a stock-take is
                    counted under received at zero cost.
                  </p>
                </>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white/90">
                Current stock valuation (FIFO cost of what is on hand today)
              </h2>
              <div className="max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="min-w-[400px]">
                  <Table>
                    <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
                        <TableCell isHeader className={headerCell}>Item</TableCell>
                        <TableCell isHeader className={headerCell}>On hand</TableCell>
                        <TableCell isHeader className={headerCell}>Value</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {valuation.map(({ item, onHand, value }) => (
                        <TableRow key={item.id}>
                          <TableCell className={bodyCell}>{item.name}</TableCell>
                          <TableCell className={bodyCell}>{onHand}</TableCell>
                          <TableCell className={bodyCell}>{money(value)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className={`${bodyCell} font-semibold`}>Total</TableCell>
                        <TableCell className={`${bodyCell} font-semibold`}>
                          {valuation.reduce((sum, row) => sum + row.onHand, 0)}
                        </TableCell>
                        <TableCell className={`${bodyCell} font-semibold`}>
                          {money(valuationTotal)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
