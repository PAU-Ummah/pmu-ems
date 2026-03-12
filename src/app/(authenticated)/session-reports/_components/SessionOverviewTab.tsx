import { AttachMoney, Download } from '@mui/icons-material';
import MetricCard from '@/components/common/MetricCard';
import ComponentCard from '@/components/common/ComponentCard';
import Button from '@/components/ui/button/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Event, Invoice } from '@/services/types';

interface EventFinanceRow {
  event: Event;
  invoices: Invoice[];
  totalSpent: number;
  attendeeCount: number;
}

interface SessionOverviewTabProps {
  sessionName: string;
  eventFinanceRows: EventFinanceRow[];
  events: Event[];
  onExport: () => void;
}

export default function SessionOverviewTab({
  sessionName,
  eventFinanceRows,
  events,
  onExport,
}: SessionOverviewTabProps) {
  const totalAttendees = eventFinanceRows.reduce(
    (sum, row) => sum + row.attendeeCount,
    0
  );

  const totalSpent = eventFinanceRows.reduce(
    (sum, row) => sum + row.totalSpent,
    0
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
          {sessionName}
        </h2>
        <Button
          variant="primary"
          onClick={onExport}
          className="inline-flex items-center gap-2"
        >
          <Download fontSize="small" />
          Export as PDF
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Events" value={events.length} />
        <MetricCard
          title="Total attendees (all events)"
          value={totalAttendees}
        />
        <MetricCard
          title="Total spent"
          value={`₦${totalSpent.toLocaleString()}`}
        />
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
          Events and finance summary
        </h3>
        {eventFinanceRows.length === 0 ? (
          <ComponentCard title="No events">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This session has no events.
            </p>
          </ComponentCard>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
              {eventFinanceRows.map((row) => (
                <ComponentCard key={row.event.id} title={row.event.name}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Date
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {row.event.date}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Attendees
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {row.attendeeCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Amount spent
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-white/90">
                        <AttachMoney className="!h-4 !w-4 text-success-500" />
                        ₦{row.totalSpent.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </ComponentCard>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] md:block">
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[650px]">
                  <Table>
                    <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
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
                          Date
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Attendees
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Amount spent
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {eventFinanceRows.map((row) => (
                        <TableRow
                          key={row.event.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800 dark:text-white/90">
                            {row.event.name}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                            {row.event.date}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                            {row.attendeeCount}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-start">
                            <span className="inline-flex items-center gap-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                              <AttachMoney className="!h-4 !w-4 text-success-500" />
                              ₦{row.totalSpent.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
