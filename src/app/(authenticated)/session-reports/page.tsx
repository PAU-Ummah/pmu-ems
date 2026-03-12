'use client';

import { useState, useEffect } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Download, AttachMoney } from '@mui/icons-material';
import { Event, Invoice } from '@/services/types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { generateSessionSummaryPDF } from '@/utils/pdfGenerator';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
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
import { useAllSessions } from '@/hooks/useAllSessions';
import { useEvents } from '@/hooks/useEvents';
import { usePeople } from '@/hooks/usePeople';
import Spinner from '@/components/ui/spinner/Spinner';
import EmptyState from '@/components/empty-state/EmptyState';

interface EventFinanceRow {
  event: Event;
  invoices: Invoice[];
  totalSpent: number;
  attendeeCount: number;
}

export default function SessionReportsPage() {
  const { sessions, loading: sessionsLoading } = useAllSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const { events, loading: eventsLoading } = useEvents(
    selectedSessionId || null
  );
  const { people, loading: peopleLoading } = usePeople(
    selectedSessionId || null,
    { activeOnly: false }
  );

  const [eventFinanceRows, setEventFinanceRows] = useState<EventFinanceRow[]>(
    []
  );

  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const loading =
    sessionsLoading ||
    (!!selectedSessionId && (eventsLoading || peopleLoading));

  useEffect(() => {
    const fetchInvoices = async () => {
      const snapshot = await getDocs(collection(db, 'invoices'));
      const data: Invoice[] = [];
      snapshot.forEach((invoiceDoc) => {
        data.push({ id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice);
      });
      setInvoices(data);
    };
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (!selectedSessionId || events.length === 0) {
      setEventFinanceRows([]);
      return;
    }
    const rows: EventFinanceRow[] = events.map((event) => {
      const eventInvoices = invoices.filter(
        (invoice) => invoice.eventId === event.id
      );
      const totalSpent = eventInvoices.reduce(
        (sum, invoice) => sum + invoice.totalAmount,
        0
      );
      const attendeeCount = event.attendees?.length ?? 0;
      return {
        event,
        invoices: eventInvoices,
        totalSpent,
        attendeeCount,
      };
    });
    setEventFinanceRows(rows);
  }, [selectedSessionId, events, invoices]);

  const handleExportSession = () => {
    generateSessionSummaryPDF(
      selectedSession?.name ?? selectedSessionId,
      eventFinanceRows.map((row) => ({
        eventName: row.event.name,
        date: row.event.date,
        attendeeCount: row.attendeeCount,
        amountSpent: row.totalSpent,
      }))
    );
  };

  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: `${session.name}${session.isActive ? ' (Current)' : ''}`,
  }));

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl dark:text-white/90">
          Session Reports
        </h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          View past session reports: events, attendees, and finance summary.
          Export as PDF shows per-event attendee count and amount spent only
          (no invoices or attendee names).
        </p>

        <div className="mb-6 max-w-md">
          <Label>Select Session</Label>
          <Select
            key={selectedSessionId || 'none'}
            options={[
              { value: '', label: 'Select a session' },
              ...sessionOptions,
            ]}
            defaultValue={selectedSessionId}
            onChange={(changeEvent) =>
              setSelectedSessionId(changeEvent.target.value)
            }
            placeholder="Select a session"
          />
        </div>

        {!selectedSessionId && (
          <EmptyState
            title="No session selected"
            description="Choose a session above to view its events, attendees, and finance report."
          />
        )}

        {selectedSessionId && loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {selectedSessionId && !loading && selectedSession && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
                {selectedSession.name}
              </h2>
              <Button
                variant="primary"
                onClick={handleExportSession}
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
                value={eventFinanceRows.reduce(
                  (sum, row) => sum + row.attendeeCount,
                  0
                )}
              />
              <MetricCard
                title="Total spent"
                value={`₦${eventFinanceRows
                  .reduce((sum, row) => sum + row.totalSpent, 0)
                  .toLocaleString()}`}
              />
            </div>

            {/* Events & finance summary table */}
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
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="max-w-full overflow-x-auto">
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
              )}
            </div>

            {/* Attendees per event */}
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
                Attendees by event
              </h3>
              <div className="space-y-6">
                {eventFinanceRows.map((row) => {
                  const attendeeIds = row.event.attendees ?? [];
                  const attendeePeople = attendeeIds
                    .map((attendeeId) =>
                      people.find((person) => person.id === attendeeId)
                    )
                    .filter(Boolean);
                  return (
                    <ComponentCard key={row.event.id} title={row.event.name}>
                      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        {row.event.date} · {row.attendeeCount} attendee
                        {row.attendeeCount !== 1 ? 's' : ''}
                      </p>
                      {attendeePeople.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No attendees recorded.
                        </p>
                      ) : (
                        <div className="max-w-full overflow-x-auto">
                          <Table>
                            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                              <TableRow>
                                <TableCell
                                  isHeader
                                  className="text-theme-xs px-3 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                                >
                                  Name
                                </TableCell>
                                <TableCell
                                  isHeader
                                  className="text-theme-xs px-3 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                                >
                                  Department
                                </TableCell>
                                <TableCell
                                  isHeader
                                  className="text-theme-xs px-3 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                                >
                                  Year
                                </TableCell>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {attendeePeople.map((person) => (
                                <TableRow
                                  key={person!.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >
                                  <TableCell className="px-3 py-2 text-start text-theme-sm text-gray-800 dark:text-white/90">
                                    {person!.firstName}{' '}
                                    {person!.middleName} {person!.surname}
                                  </TableCell>
                                  <TableCell className="px-3 py-2 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                                    {person!.department}
                                  </TableCell>
                                  <TableCell className="px-3 py-2 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                                    {person!.year ? `YR${person!.year}` : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </ComponentCard>
                  );
                })}
              </div>
            </div>

            {/* Finance report (per-event totals, no invoice detail) */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
                Finance report
              </h3>
              <ComponentCard title="Spending by event">
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Total amount spent per event (from invoices). Export summary
                  does not include invoice or attendee details.
                </p>
                <div className="max-w-full overflow-x-auto">
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
                          Invoices
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Total spent
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
                            {row.invoices.length}
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
              </ComponentCard>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}
