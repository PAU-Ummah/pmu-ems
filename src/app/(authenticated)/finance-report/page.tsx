"use client";
import { useState, useEffect } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import { AttachMoney, Print, Download, Visibility } from "@mui/icons-material";
import { Event, Invoice } from "@/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { generateInvoicePDF, generateCSVData, downloadCSV } from "@/utils/pdfGenerator";
import MetricCard from "@/components/common/MetricCard";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EventDetailsModal from "./_component/EventDetailsModal";

export interface EventFinanceData {
  event: Event;
  invoices: Invoice[];
  totalSpent: number;
  itemCount: number;
}

export default function FinanceReportPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventFinanceData, setEventFinanceData] = useState<EventFinanceData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventFinanceData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [eventsSnapshot, invoicesSnapshot] = await Promise.all([
      getDocs(collection(db, "events")),
      getDocs(collection(db, "invoices"))
    ]);

    const eventsData: Event[] = [];
    eventsSnapshot.forEach((doc) => {
      eventsData.push({ id: doc.id, ...doc.data() } as Event);
    });

    const invoicesData: Invoice[] = [];
    invoicesSnapshot.forEach((doc) => {
      invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
    });

    setEvents(eventsData);

    // Process finance data
    const financeData: EventFinanceData[] = eventsData.map(event => {
      const eventInvoices = invoicesData.filter(invoice => invoice.eventId === event.id);
      const totalSpent = eventInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const itemCount = eventInvoices.reduce((sum, invoice) => sum + (invoice.items?.length || 0), 0);

      return {
        event,
        invoices: eventInvoices,
        totalSpent,
        itemCount,
      };
    });

    setEventFinanceData(financeData);
  };

  const getTotalSpending = () => {
    return eventFinanceData.reduce((sum, data) => sum + data.totalSpent, 0);
  };

  const getTotalInvoices = () => {
    return eventFinanceData.reduce((sum, data) => sum + data.invoices.length, 0);
  };

  const getTotalItems = () => {
    return eventFinanceData.reduce((sum, data) => sum + data.itemCount, 0);
  };

  const handleViewDetails = (data: EventFinanceData) => {
    setSelectedEvent(data);
    setOpen(true);
  };

  const handleGeneratePDF = (data: EventFinanceData) => {
    generateInvoicePDF(data);
  };

  const handleDownloadData = (data: EventFinanceData) => {
    const csvData = generateCSVData(data);
    const filename = `${data.event.name.replace(/\s+/g, '_')}_invoice_data.csv`;
    downloadCSV(csvData, filename);
  };

  return (
    <RoleGuard allowedRoles={["admin", "finance-manager"]}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          Finance Report
        </h1>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Events"
            value={events.length}
          />
          <MetricCard
            title="Total Spending"
            value={`₦${getTotalSpending().toLocaleString()}`}
          />
          <MetricCard
            title="Total Invoices"
            value={getTotalInvoices()}
          />
          <MetricCard
            title="Total Items"
            value={getTotalItems()}
          />
        </div>

        {/* Events Finance Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[650px]">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Event Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 sm:table-cell"
                    >
                      Date
                    </TableCell>
                    <TableCell
                      isHeader
                      className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 md:table-cell"
                    >
                      Status
                    </TableCell>
                    <TableCell
                      isHeader
                      className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 lg:table-cell"
                    >
                      Invoices
                    </TableCell>
                    <TableCell
                      isHeader
                      className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 lg:table-cell"
                    >
                      Items
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Total Spent
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {eventFinanceData.map((data) => (
                    <TableRow
                      key={data.event.id}
                      className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                    >
                      <TableCell className="px-5 py-4 text-start">
                        <div>
                          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                            {data.event.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2 sm:hidden">
                            <Badge
                              color={data.event.isEnded ? 'light' : 'success'}
                              variant="light"
                              size="sm"
                            >
                              {data.event.isEnded ? "Ended" : "Active"}
                            </Badge>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {data.event.date}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 sm:table-cell">
                        {data.event.date}
                      </TableCell>
                      <TableCell className="hidden px-5 py-4 md:table-cell">
                        <Badge
                          color={data.event.isEnded ? 'light' : 'success'}
                          variant="light"
                          size="sm"
                        >
                          {data.event.isEnded ? "Ended" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 lg:table-cell">
                        {data.invoices.length} invoice(s)
                      </TableCell>
                      <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 lg:table-cell">
                        {data.itemCount} item(s)
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div>
                          <div className="flex items-center gap-1">
                            <AttachMoney className="!h-4 !w-4 text-success-500" />
                            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                              ₦{data.totalSpent.toLocaleString()}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                            {data.invoices.length} invoices • {data.itemCount} items
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleViewDetails(data)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            aria-label="View details"
                            title="View Details"
                          >
                            <Visibility fontSize="small" />
                          </button>
                          <button
                            onClick={() => handleGeneratePDF(data)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            aria-label="Generate PDF"
                            title="Generate PDF"
                          >
                            <Print fontSize="small" />
                          </button>
                          <button
                            onClick={() => handleDownloadData(data)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            aria-label="Download data"
                            title="Download Data"
                          >
                            <Download fontSize="small" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <EventDetailsModal
          isOpen={open}
          onClose={() => setOpen(false)}
          selectedEvent={selectedEvent}
          onGeneratePDF={handleGeneratePDF}
          onDownloadData={handleDownloadData}
        />
      </div>
    </RoleGuard>
  );
}
