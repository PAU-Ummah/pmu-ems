'use client';

import { useState, useEffect } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { Event, Invoice } from '@/services/types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { generateSessionSummaryPDF } from '@/utils/pdfGenerator';
import Label from '@/components/form/Label';
import Select from '@/components/form/Select';
import Tabs from '@/components/ui/tabs/Tabs';
import TabPane from '@/components/ui/tabs/TabPane';
import { useAllSessions } from '@/hooks/useAllSessions';
import { useEvents } from '@/hooks/useEvents';
import { usePeople } from '@/hooks/usePeople';
import Spinner from '@/components/ui/spinner/Spinner';
import EmptyState from '@/components/empty-state/EmptyState';
import SessionOverviewTab from './_components/SessionOverviewTab';
import AttendeesByEventTab from './_components/AttendeesByEventTab';
import InvoicesTab from './_components/InvoicesTab';

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
          <Tabs justifyTabs="left" tabStyle="independent">
            <TabPane tab="Overview">
              <SessionOverviewTab
                sessionName={selectedSession.name}
                eventFinanceRows={eventFinanceRows}
                events={events as Event[]}
                onExport={handleExportSession}
              />
            </TabPane>
            <TabPane tab="Attendees by event">
              <AttendeesByEventTab
                eventFinanceRows={eventFinanceRows}
                people={people}
              />
            </TabPane>
            <TabPane tab="Invoices">
              <InvoicesTab events={events as Event[]} invoices={invoices} />
            </TabPane>
          </Tabs>
        )}
      </div>
    </RoleGuard>
  );
}
