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

interface InvoicesTabProps {
  events: Event[];
  invoices: Invoice[];
}

export default function InvoicesTab({ events, invoices }: InvoicesTabProps) {
  const eventsById = new Map(events.map((event) => [event.id, event]));

  const sessionInvoices = invoices.filter((invoice) =>
    eventsById.has(invoice.eventId)
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
    <div className="mb-8">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
        Invoices for this session
      </h3>
      <ComponentCard title="All invoices">
        <div className="max-w-full overflow-x-auto">
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>
    </div>
  );
}

