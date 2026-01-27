"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  Event as EventIcon,
  People as PeopleIcon,
  AttachMoney as FinanceIcon,
  Assessment as ReportsIcon,
  HowToReg as AttendanceIcon,
  PersonAdd as UserManagementIcon,
  TrendingUp,
  CalendarToday,
  CheckCircle,
} from "@mui/icons-material";
import { Event, Person, Invoice } from "@/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import MetricCard from "@/components/common/MetricCard";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Link from "next/link";
import Loading from "@/components/loading/Loading";

export default function Home() {
  const { userData } = useAuth();
  const { userRole, hasRole } = useRole();

  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [eventsSnapshot, peopleSnapshot, invoicesSnapshot] = await Promise.all([
        getDocs(collection(db, "events")),
        getDocs(collection(db, "people")),
        getDocs(collection(db, "invoices")),
      ]);

      const eventsData: Event[] = [];
      eventsSnapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });

      const peopleData: Person[] = [];
      peopleSnapshot.forEach((doc) => {
        peopleData.push({ id: doc.id, ...doc.data() } as Person);
      });

      const invoicesData: Invoice[] = [];
      invoicesSnapshot.forEach((doc) => {
        invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
      });

      setEvents(eventsData);
      setPeople(peopleData);
      setInvoices(invoicesData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalEvents = events.length;
  const upcomingEvents = events.filter(
    (event) => !event.isEnded && event.startTime && dayjs(event.startTime).isAfter(dayjs())
  ).length;
  const activeEvents = events.filter((event) => !event.isEnded).length;
  const totalPeople = people.length;
  const totalInvoices = invoices.length;
  const totalSpent = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const totalAttendees = events.reduce((sum, event) => sum + (event.attendees?.length || 0), 0);

  // Get upcoming events (next 5)
  const upcomingEventsList = events
    .filter((event) => !event.isEnded && event.startTime && dayjs(event.startTime).isAfter(dayjs()))
    .sort((a, b) => {
      const timeA = a.startTime ? dayjs(a.startTime).valueOf() : 0;
      const timeB = b.startTime ? dayjs(b.startTime).valueOf() : 0;
      return timeA - timeB;
    })
    .slice(0, 5);

  // Get recent events (last 5)
  const recentEvents = events
    .filter((event) => event.isEnded)
    .sort((a, b) => {
      const timeA = a.endTime ? dayjs(a.endTime).valueOf() : 0;
      const timeB = b.endTime ? dayjs(b.endTime).valueOf() : 0;
      return timeB - timeA;
    })
    .slice(0, 5);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    return dayjs(dateString).format("MMM DD, YYYY h:mm A");
  };

  const getRoleDisplayName = (role?: string) => {
    const roleMap: Record<string, string> = {
      "event-organizer": "Event Organizer",
      "it": "IT",
      "finance-manager": "Finance Manager",
      admin: "Administrator",
      registrar: "Registrar",
    };
    return role ? roleMap[role] || role : "User";
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] md:p-8">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white/90 sm:text-3xl md:text-4xl">
          Welcome back{userData?.displayName ? `, ${userData.displayName}` : ""}!
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
          You are logged in as <span className="font-medium">{getRoleDisplayName(userRole)}</span>
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
          Here's an overview of your dashboard
        </p>
      </div>

      {/* Role-based Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Events Metrics - Visible to Event Organizer and Admin */}
        {hasRole(["event-organizer", "admin"]) && (
          <MetricCard
            title="Total Events"
            value={totalEvents}
            icon={<EventIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" />}
          />
        )}

        {hasRole(["event-organizer", "admin"]) && (
          <MetricCard
            title="Upcoming Events"
            value={upcomingEvents}
            icon={<CalendarToday className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          />
        )}

        {hasRole(["event-organizer", "admin"]) && (
          <MetricCard
            title="Active Events"
            value={activeEvents}
            icon={<TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />}
          />
        )}

        {/* People Metrics - Visible to IT and Admin */}
        {hasRole(["it", "admin"]) && (
          <MetricCard
            title="Total People"
            value={totalPeople}
            icon={<PeopleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
          />
        )}

        {/* Finance Metrics - Visible to Finance Manager and Admin */}
        {hasRole(["finance-manager", "admin"]) && (
          <MetricCard
            title="Total Invoices"
            value={totalInvoices}
            icon={<FinanceIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          />
        )}

        {hasRole(["finance-manager", "admin"]) && (
          <MetricCard
            title="Total Spent"
            value={`₦${totalSpent.toLocaleString()}`}
            icon={<FinanceIcon className="h-6 w-6 text-red-600 dark:text-red-400" />}
          />
        )}

        {/* Attendance Metrics - Visible to Registrar and Admin */}
        {hasRole(["registrar", "admin"]) && (
          <MetricCard
            title="Total Attendees"
            value={totalAttendees}
            icon={<CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />}
            description="Across all events"
          />
        )}
      </div>

      {/* Quick Actions */}
      {(hasRole(["event-organizer", "admin"]) ||
        hasRole(["it", "admin"]) ||
        hasRole(["finance-manager", "admin"]) ||
        hasRole(["admin"]) ||
        hasRole(["registrar", "admin"])) && (
        <ComponentCard title="Quick Actions" desc="Navigate to key features based on your role">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hasRole(["event-organizer", "admin"]) && (
              <Link href="/events">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left"
                >
                  <EventIcon className="h-5 w-5" />
                  Manage Events
                </Button>
              </Link>
            )}

            {hasRole(["it", "admin"]) && (
              <Link href="/people">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left"
                >
                  <PeopleIcon className="h-5 w-5" />
                  Manage People
                </Button>
              </Link>
            )}

            {hasRole(["it", "admin"]) && (
              <Link href="/user-management">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left"
                >
                  <UserManagementIcon className="h-5 w-5" />
                  User Management
                </Button>
              </Link>
            )}

            {hasRole(["finance-manager", "admin"]) && (
              <Link href="/finance">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left"
                >
                  <FinanceIcon className="h-5 w-5" />
                  Manage Finance
                </Button>
              </Link>
            )}

            {hasRole(["admin"]) && (
              <Link href="/reports">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left"
                >
                  <ReportsIcon className="h-5 w-5" />
                  View Reports
                </Button>
              </Link>
            )}

            {hasRole(["registrar", "admin"]) && (
              <Link href="/attendance">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left"
                >
                  <AttendanceIcon className="h-5 w-5" />
                  Mark Attendance
                </Button>
              </Link>
            )}
          </div>
        </ComponentCard>
      )}

      {/* Upcoming Events - Visible to Event Organizer and Admin */}
      {hasRole(["event-organizer", "admin"]) && (
        <ComponentCard
          title="Upcoming Events"
          desc="Events scheduled in the near future"
        >
          {upcomingEventsList.length > 0 ? (
            <div className="space-y-3">
              {upcomingEventsList.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white/90">
                        {event.name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(event.startTime)}
                      </p>
                      {event.attendees && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="success">Upcoming</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No upcoming events scheduled
            </p>
          )}
        </ComponentCard>
      )}

      {/* Recent Events - Visible to Event Organizer and Admin */}
      {hasRole(["event-organizer", "admin"]) && (
        <ComponentCard
          title="Recent Events"
          desc="Recently completed events"
        >
          {recentEvents.length > 0 ? (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white/90">
                        {event.name}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Ended: {formatDateTime(event.endTime)}
                      </p>
                      {event.attendees && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="primary">Completed</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No recent events
            </p>
          )}
        </ComponentCard>
      )}

      {/* Finance Overview - Visible to Finance Manager and Admin */}
      {hasRole(["finance-manager", "admin"]) && (
        <ComponentCard
          title="Finance Overview"
          desc="Quick financial summary"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Invoices
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
                {totalInvoices}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Amount Spent
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white/90">
                ₦{totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/finance">
              <Button variant="primary" className="w-full sm:w-auto">
                View Finance Details
              </Button>
            </Link>
          </div>
        </ComponentCard>
      )}
    </div>
  );
}
