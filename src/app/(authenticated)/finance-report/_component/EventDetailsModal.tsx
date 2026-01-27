'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Print, Download } from '@mui/icons-material';
import { EventFinanceData } from '../page';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: EventFinanceData | null;
  onGeneratePDF: (data: EventFinanceData) => void;
  onDownloadData: (data: EventFinanceData) => void;
}

export default function EventDetailsModal({
  isOpen,
  onClose,
  selectedEvent,
  onGeneratePDF,
  onDownloadData,
}: EventDetailsModalProps) {
  if (!selectedEvent) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-[1000px] !m-2 sm:!m-4 p-3 sm:p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-semibold text-gray-900 dark:text-white/90 pr-8 sm:pr-0">
          Invoice Details - {selectedEvent.event.name}
        </h2>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-gray-900 dark:text-white/90">
                Event Information
              </h3>
              <div className="flex flex-col gap-2 text-sm">
                <p className="break-words">
                  <strong>Name:</strong> {selectedEvent.event.name}
                </p>
                <p>
                  <strong>Date:</strong> {selectedEvent.event.date}
                </p>
                <p>
                  <strong>Status:</strong> {selectedEvent.event.isEnded ? "Ended" : "Active"}
                </p>
                <p>
                  <strong>Total Spent:</strong> ₦{selectedEvent.totalSpent.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <h3 className="mb-2 sm:mb-3 text-base sm:text-lg font-semibold text-gray-900 dark:text-white/90">
                Summary
              </h3>
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  <strong>Total Invoices:</strong> {selectedEvent.invoices.length}
                </p>
                <p>
                  <strong>Total Items:</strong> {selectedEvent.itemCount}
                </p>
                <p>
                  <strong>Average per Invoice:</strong> ₦{selectedEvent.invoices.length > 0 ? Math.round(selectedEvent.totalSpent / selectedEvent.invoices.length).toLocaleString() : "0"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          <div>
            <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-gray-900 dark:text-white/90">
              Invoice Details
            </h3>

            <div className="flex flex-col gap-3 sm:gap-4">
              {selectedEvent.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-700 dark:bg-white/[0.03]"
                >
                  <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white/90 break-words">
                      Invoice #{invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                    </h4>
                    <p className="text-base sm:text-lg font-semibold text-brand-500 whitespace-nowrap">
                      ₦{invoice.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="mb-3 sm:mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      <strong>Vendor:</strong> {invoice.vendor || "N/A"}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Date:</strong> {invoice.date}
                    </p>
                  </div>

                  {invoice.notes && (
                    <p className="mb-3 sm:mb-4 text-sm text-gray-700 dark:text-gray-300 break-words">
                      <strong>Notes:</strong> {invoice.notes}
                    </p>
                  )}

                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="max-w-full overflow-x-auto -mx-3 sm:mx-0">
                      <div className="min-w-0 sm:min-w-[400px] px-3 sm:px-0">
                        <Table>
                          <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                            <TableRow>
                              <TableCell
                                isHeader
                                className="text-theme-xs px-2 sm:px-4 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                              >
                                Description
                              </TableCell>
                              <TableCell
                                isHeader
                                className="hidden text-theme-xs px-2 sm:px-4 py-2 text-start font-semibold text-gray-700 dark:text-white/90 sm:table-cell"
                              >
                                Quantity
                              </TableCell>
                              <TableCell
                                isHeader
                                className="hidden text-theme-xs px-2 sm:px-4 py-2 text-start font-semibold text-gray-700 dark:text-white/90 md:table-cell"
                              >
                                Unit Price
                              </TableCell>
                              <TableCell
                                isHeader
                                className="text-theme-xs px-2 sm:px-4 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                              >
                                Total
                              </TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {invoice.items?.map((item) => (
                              <TableRow
                                key={item.id}
                                className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                              >
                                <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-start text-xs sm:text-sm text-gray-800 dark:text-white/90">
                                  <div>
                                    <p className="break-words">{item.description}</p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                                      Qty: {item.quantity} × ₦{item.unitPrice.toLocaleString()}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden px-2 sm:px-4 py-2 sm:py-3 text-start text-xs sm:text-sm text-gray-600 dark:text-gray-400 sm:table-cell">
                                  {item.quantity}
                                </TableCell>
                                <TableCell className="hidden px-2 sm:px-4 py-2 sm:py-3 text-start text-xs sm:text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                                  ₦{item.unitPrice.toLocaleString()}
                                </TableCell>
                                <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-start text-xs sm:text-sm font-medium text-gray-800 dark:text-white/90">
                                  ₦{item.totalPrice.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-200 pt-3 sm:pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              startIcon={<Print />}
              onClick={() => onGeneratePDF(selectedEvent)}
              className="w-full sm:w-auto"
            >
              Generate PDF
            </Button>
            <Button
              variant="primary"
              startIcon={<Download />}
              onClick={() => onDownloadData(selectedEvent)}
              className="w-full sm:w-auto"
            >
              Download Data
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
