"use client";
import { useState, useEffect } from "react";
import { Event, Person } from "@/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import RoleGuard from "@/components/auth/RoleGuard";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import ComponentCard from "@/components/common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ReportsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");

  useEffect(() => {
    const fetchEvents = async () => {
      const querySnapshot = await getDocs(collection(db, "events"));
      const eventsData: Event[] = [];
      querySnapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      setEvents(eventsData);
    };

    const fetchPeople = async () => {
      const querySnapshot = await getDocs(collection(db, "people"));
      const peopleData: Person[] = [];
      querySnapshot.forEach((doc) => {
        peopleData.push({ id: doc.id, ...doc.data() } as Person);
      });
      setPeople(peopleData);
    };

    fetchEvents();
    fetchPeople();
  }, []);

  const selectedEventData = events.find((e) => e.id === selectedEvent);

  const eventOptions = events.map((event) => ({
    value: event.id || '',
    label: `${event.name} - ${event.date}`,
  }));

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          Event Reports
        </h1>

        <div className="mb-6 max-w-md">
          <Label htmlFor="event-select">Select Event</Label>
          <Select
            options={[
              { value: '', label: 'Select an event' },
              ...eventOptions,
            ]}
            defaultValue={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            placeholder="Select an event"
          />
        </div>

        {selectedEventData && (
          <>
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white/90">
                {selectedEventData.name} - {selectedEventData.date}
              </h2>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <strong>Total Attendees:</strong> {selectedEventData.attendees.length}
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <strong>Amount Spent:</strong> ₦{selectedEventData.amountSpent?.toLocaleString() || "0"}
                </p>
                {(selectedEventData.startTime || selectedEventData.endTime) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedEventData.startTime && (
                      <>Start Time: {new Date(selectedEventData.startTime).toLocaleString()}</>
                    )}
                    {selectedEventData.startTime && selectedEventData.endTime && " | "}
                    {selectedEventData.endTime && (
                      <>End Time: {new Date(selectedEventData.endTime).toLocaleString()}</>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {selectedEventData.attendees.map((attendeeId) => {
                const person = people.find((p) => p.id === attendeeId);
                if (!person) return null;
                return (
                  <ComponentCard
                    key={attendeeId}
                    title={`${person.firstName} ${person.middleName} ${person.surname}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Department</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {person.department}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Class</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {person.class}
                        </span>
                      </div>
                    </div>
                  </ComponentCard>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[650px]">
                  <Table>
                    <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Name
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Department
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Class
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedEventData.attendees.map((attendeeId) => {
                        const person = people.find((p) => p.id === attendeeId);
                        if (!person) return null;
                        return (
                          <TableRow
                            key={attendeeId}
                            className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                          >
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                              {person.firstName} {person.middleName} {person.surname}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {person.department}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {person.class}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  );
}