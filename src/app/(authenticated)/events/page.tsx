"use client";
import { useState, useEffect } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Add, Delete, Edit, People } from "@mui/icons-material";
import { Event, Person } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EventForm from "./_component/EventForm";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event>>({
    name: "",
    date: new Date().toISOString().split("T")[0],
    startTime: new Date().toISOString(),
    attendees: [],
  });
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [selectedDateTime, setSelectedDateTime] = useState<Dayjs | null>(dayjs());
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchPeople();
  }, []);

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


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentEvent({ ...currentEvent, [name]: value });
  };

  const handleSubmit = async () => {
    const eventData = {
      ...currentEvent,
      date: selectedDate ? selectedDate.format("YYYY-MM-DD") : currentEvent.date,
      startTime: selectedDateTime ? selectedDateTime.toISOString() : currentEvent.startTime,
    };

    if (isEdit && currentEvent.id) {
      await updateDoc(doc(db, "events", currentEvent.id), eventData);
    } else {
      await addDoc(collection(db, "events"), eventData);
    }
    setOpen(false);
    fetchEvents();
    setCurrentEvent({
      name: "",
      date: new Date().toISOString().split("T")[0],
      startTime: new Date().toISOString(),
      attendees: [],
    });
    setSelectedDate(dayjs());
    setSelectedDateTime(dayjs());
  };

  const handleEdit = (event: Event) => {
    // Don't allow editing if event has ended
    if (event.isEnded) {
      return;
    }
    setCurrentEvent(event);
    setSelectedDate(event.date ? dayjs(event.date) : dayjs());
    setSelectedDateTime(event.startTime ? dayjs(event.startTime) : dayjs());
    setIsEdit(true);
    setOpen(true);
  };

  const handleEndEvent = async (eventId: string) => {
    const endTime = new Date().toISOString();
    await updateDoc(doc(db, "events", eventId), {
      endTime,
      isEnded: true,
    });
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "events", id));
    fetchEvents();
  };

  const getPersonName = (id: string) => {
    const person = people.find((p) => p.id === id);
    return person ? `${person.firstName} ${person.surname}` : "Unknown";
  };

  if (!events) {
    return (
      <div className="w-full">
        <p className="text-gray-900 dark:text-white/90">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
        Events Management
      </h1>

      <RoleGuard allowedRoles={['event-organizer']}>
        <div className="mb-6">
          <Button
            variant="primary"
            startIcon={<Add />}
            onClick={() => {
              setOpen(true);
              setIsEdit(false);
            }}
            className="w-full sm:w-auto"
          >
            Create Event
          </Button>
        </div>
      </RoleGuard>

      {/* Mobile Card Layout */}
      <div className="flex flex-col gap-4 md:hidden">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                {event.name}
              </h3>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Date:</strong> {event.date}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Time:</strong> {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  color={event.isEnded ? 'light' : 'success'}
                  variant="light"
                  size="sm"
                >
                  {event.isEnded ? "Ended" : "Active"}
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {event.attendees.length} attendees
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attendees:
                </p>
                <div className="flex flex-wrap gap-1">
                  {event.attendees.slice(0, 2).map((attendee) => (
                    <Badge
                      key={attendee}
                      color="primary"
                      variant="light"
                      size="sm"
                    >
                      {getPersonName(attendee)}
                    </Badge>
                  ))}
                  {event.attendees.length > 2 && (
                    <Badge
                      color="primary"
                      variant="light"
                      size="sm"
                    >
                      +{event.attendees.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Link href={`/events/${event.id}`}>
                  <Button
                    variant="outline"
                    startIcon={<People />}
                    className="text-xs"
                  >
                    View
                  </Button>
                </Link>
                <RoleGuard allowedRoles={['event-organizer']}>
                  <div className="flex gap-2">
                    {!event.isEnded && (
                      <button
                        onClick={() => handleEdit(event)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                        aria-label="Edit event"
                      >
                        <Edit fontSize="small" />
                      </button>
                    )}
                    {!event.isEnded && (
                      <Button
                        onClick={() => handleEndEvent(event.id)}
                        variant="outline"
                        className="text-xs text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        End
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20"
                      aria-label="Delete event"
                    >
                      <Delete fontSize="small" />
                    </button>
                  </div>
                </RoleGuard>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
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
                    Start Time
                  </TableCell>
                  <TableCell
                    isHeader
                    className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 md:table-cell"
                  >
                    Status
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
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {events.map((event) => (
                  <TableRow
                    key={event.id}
                    className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                  >
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                      {event.name}
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 sm:table-cell">
                      {event.date}
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 md:table-cell">
                      {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 md:table-cell">
                      <Badge
                        color={event.isEnded ? 'light' : 'success'}
                        variant="light"
                        size="sm"
                      >
                        {event.isEnded ? "Ended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {event.attendees.slice(0, 3).map((attendee) => (
                          <Badge
                            key={attendee}
                            color="primary"
                            variant="light"
                            size="sm"
                          >
                            {getPersonName(attendee)}
                          </Badge>
                        ))}
                        {event.attendees.length > 3 && (
                          <Badge
                            color="primary"
                            variant="light"
                            size="sm"
                          >
                            +{event.attendees.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/events/${event.id}`}>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            aria-label="View event"
                          >
                            <People fontSize="small" />
                          </button>
                        </Link>
                        <RoleGuard allowedRoles={['event-organizer']}>
                          {!event.isEnded && (
                            <button
                              onClick={() => handleEdit(event)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                              aria-label="Edit event"
                            >
                              <Edit fontSize="small" />
                            </button>
                          )}
                          {!event.isEnded && (
                            <Button
                              onClick={() => handleEndEvent(event.id)}
                              variant="outline"
                              className="text-xs text-orange-600 border-orange-600 hover:bg-orange-50"
                            >
                              End
                            </Button>
                          )}
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20"
                            aria-label="Delete event"
                          >
                            <Delete fontSize="small" />
                          </button>
                        </RoleGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <EventForm
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setSelectedDate(dayjs());
          setSelectedDateTime(dayjs());
        }}
        currentEvent={currentEvent}
        selectedDate={selectedDate}
        selectedDateTime={selectedDateTime}
        onDateChange={setSelectedDate}
        onDateTimeChange={setSelectedDateTime}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isEdit={isEdit}
        isEnded={currentEvent.isEnded}
      />
    </div>
  );
}