import ComponentCard from '@/components/common/ComponentCard';
import EmptyState from '@/components/empty-state/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Event, Invoice } from '@/services/types';
import {OpenInNew, Download} from '@mui/icons-material';
import Button from '@/components/ui/button/Button';


interface InvoicesTabProps {
  events: Event[];
  invoices: Invoice[];
  onExportSessionInvoices: () => void;
}

export default function InvoicesTab({ events, invoices, onExportSessionInvoices }: InvoicesTabProps) {
  const eventsById = new Map(events.map((event) => [event.id, event]));

  const sessionInvoices = invoices.filter((invoice) =>
    eventsById.has(invoice.eventId)
  );

  const totalAmountSpent = sessionInvoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0
  );

  if (events.length === 0) {
    return (
      <ComponentCard title="Invoices">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This session has no events, so there are no invoices to show.
        </p>
      </ComponentCard>
    );
  }

  if (sessionInvoices.length === 0) {
    return (
      <EmptyState
        title="No invoices for this session"
        description="Invoices will appear here once they are created for events in this session."
      />
    );
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          Invoices for this session
        </h3>
        <Button
          variant="primary"
          onClick={onExportSessionInvoices}
          className="inline-flex items-center gap-2"
        >
          <Download fontSize="small" />
          Export as PDF
        </Button>
      </div>
      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {sessionInvoices.map((invoice) => {
          const event = eventsById.get(invoice.eventId);
          return (
            <ComponentCard
              key={invoice.id ?? invoice.invoiceNumber}
              title={event?.name ?? 'Unknown event'}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Invoice #
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.invoiceNumber ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Vendor
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.vendor ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Date
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.date}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total amount
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    ₦{invoice.totalAmount.toLocaleString()}
                  </span>
                </div>
                {invoice.attachmentUrl && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Receipt
                    </span>
                    <a
                      href={invoice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-brand-500 hover:underline"
                    >
                      View receipt
                      <OpenInNew sx={{ fontSize: 14 }} />
                    </a>
                  </div>
                )}
              </div>
            </ComponentCard>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <ComponentCard className="hidden md:block" title="All invoices">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[650px]">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                <TableRow>
                  <TableCell
                    isHeader
                    className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                  >
                    Invoice #
                  </TableCell>
                  <TableCell
                    isHeader
                    className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                  >
                    Event
                  </TableCell>
                  <TableCell
                    isHeader
                    className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                  >
                    Vendor
                  </TableCell>
                  <TableCell
                    isHeader
                    className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                  >
                    Date
                  </TableCell>
                  <TableCell
                    isHeader
                    className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                  >
                    Total amount
                  </TableCell>
                  <TableCell
                    isHeader
                    className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                  >
                    Receipt
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sessionInvoices.map((invoice) => {
                  const event = eventsById.get(invoice.eventId);
                  return (
                    <TableRow
                      key={invoice.id ?? invoice.invoiceNumber}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                        {invoice.invoiceNumber ?? '—'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {event?.name ?? 'Unknown event'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {invoice.vendor ?? '—'}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {invoice.date}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                        ₦{invoice.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {invoice.attachmentUrl ? (
                          <a
                            href={invoice.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-theme-sm text-brand-500 hover:underline"
                            title="View receipt"
                          >
                            View
                            <OpenInNew sx={{ fontSize: 14 }} />
                          </a>
                        ) : (
                          <span className="text-theme-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <tfoot>
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-5 py-3 text-right text-theme-sm font-semibold text-gray-700 dark:text-white/90"
                  >
                    Total for session
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    className="px-5 py-3 text-start text-theme-sm font-semibold text-gray-800 dark:text-white/90"
                  >
                    ₦{totalAmountSpent.toLocaleString()}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}

