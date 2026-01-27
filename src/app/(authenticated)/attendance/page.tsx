"use client";
import { useState, useEffect } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import { Event, Person } from "@/types";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/firebase";
import dayjs from "dayjs";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AttendanceDialog from "./_component/AttendanceDialog";

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchPeople();
  }, []);

  // Set up real-time listener for events when attendance dialog is open
  useEffect(() => {
    if (!open || !currentEvent) return;

    const eventRef = doc(db, "events", currentEvent.id);
    const unsubscribe = onSnapshot(eventRef, (doc) => {
      if (doc.exists()) {
        const updatedEvent = { id: doc.id, ...doc.data() } as Event;
        setCurrentEvent(updatedEvent);
        
        // Also update the events list
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === updatedEvent.id ? updatedEvent : event
          )
        );
      }
    });

    return () => unsubscribe();
  }, [open, currentEvent]);

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

  const toggleAttendance = async (personId: string) => {
    if (!currentEvent || isUpdating) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      const eventRef = doc(db, "events", currentEvent.id);
      const attendees = currentEvent.attendees || [];
      const isAttending = attendees.includes(personId);
      
      if (isAttending) {
        // Remove person from attendees using arrayRemove
        await updateDoc(eventRef, {
          attendees: arrayRemove(personId)
        });
      } else {
        // Add person to attendees using arrayUnion
        await updateDoc(eventRef, {
          attendees: arrayUnion(personId)
        });
      }
      
      // Update local state optimistically
      const newAttendees = isAttending 
        ? attendees.filter((id) => id !== personId)
        : [...attendees, personId];
        
      setCurrentEvent({
        ...currentEvent,
        attendees: newAttendees,
      });
      
    } catch {
      // Handle error silently and show user-friendly message
      setUpdateError("Failed to update attendance. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getPersonName = (id: string) => {
    const person = people.find((p) => p.id === id);
    return person ? `${person.firstName} ${person.surname}` : "Unknown";
  };

  const filteredPeople = people.filter((person) => {
    const fullName = `${person.firstName} ${person.middleName || ""} ${person.surname}`.toLowerCase();
    const department = person.department?.toLowerCase() || "";
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      department.includes(searchTerm.toLowerCase())
    );
  });

  // Filter events that are starting within 1 hour or have already started but not ended
  const getUpcomingEvents = () => {
    const now = dayjs();
    const oneHourFromNow = now.add(1, 'hour');
    
    return events.filter(event => {
      if (!event.startTime || event.isEnded) return false;
      
      const eventStartTime = dayjs(event.startTime);
      // Show events that:
      // 1. Start within the next hour, OR
      // 2. Have already started (but not ended)
      return (eventStartTime.isAfter(now) && eventStartTime.isBefore(oneHourFromNow)) ||
             (eventStartTime.isBefore(now) || eventStartTime.isSame(now, 'minute'));
    });
  };

  const upcomingEvents = getUpcomingEvents();

  const handleOpenAttendance = (event: Event) => {
    setCurrentEvent(event);
    setOpen(true);
    setSearchTerm("");
  };

  const handleCloseAttendance = () => {
    setOpen(false);
    setCurrentEvent(null);
    setSearchTerm("");
  };

  if (!events) {
    return (
      <div className="w-full">
        <p className="text-gray-900 dark:text-white/90">Loading...</p>
      </div>
    );
  }

  const getTimeColor = (timeUntilStart: number): 'primary' | 'success' | 'error' | 'warning' | 'info' => {
    if (timeUntilStart < 0) return 'info';
    if (timeUntilStart <= 15) return 'error';
    if (timeUntilStart <= 30) return 'warning';
    return 'success';
  };

  return (
    <RoleGuard allowedRoles={['registrar']}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          Event Attendance
        </h1>

        {upcomingEvents.length === 0 ? (
          <Alert
            variant="info"
            title="No Events Available"
            message="No events available for attendance. Events will appear here 1 hour before they start and remain visible until they end."
          />
        ) : (
          <>
            <p className="mb-4 text-lg font-medium text-gray-600 dark:text-gray-400">
              Events Available for Attendance ({upcomingEvents.length})
            </p>

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
                          Event Name
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
                          Start Time
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Time Until Start
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
                      {upcomingEvents.map((event) => {
                        const eventStartTime = dayjs(event.startTime);
                        const now = dayjs();
                        const timeUntilStart = eventStartTime.diff(now, 'minute');
                        const timeDisplay = timeUntilStart > 0 
                          ? `${timeUntilStart} minutes` 
                          : timeUntilStart === 0 
                          ? 'Starting now'
                          : `Started ${Math.abs(timeUntilStart)} minutes ago`;
                        
                        return (
                          <TableRow
                            key={event.id}
                            className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                          >
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                              {event.name}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {event.date}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <Badge
                                color={getTimeColor(timeUntilStart)}
                                variant="light"
                                size="sm"
                              >
                                {timeDisplay}
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
                              <Button
                                variant="primary"
                                onClick={() => handleOpenAttendance(event)}
                                className="text-xs"
                              >
                                Mark Attendance
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="flex flex-col gap-4 md:hidden">
              {upcomingEvents.map((event) => {
                const eventStartTime = dayjs(event.startTime);
                const now = dayjs();
                const timeUntilStart = eventStartTime.diff(now, 'minute');
                const timeDisplay = timeUntilStart > 0 
                  ? `${timeUntilStart} minutes` 
                  : timeUntilStart === 0 
                  ? 'Starting now'
                  : `Started ${Math.abs(timeUntilStart)} minutes ago`;
                
                return (
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
                          <strong>Start Time:</strong> {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Status:
                        </p>
                        <Badge
                          color={getTimeColor(timeUntilStart)}
                          variant="light"
                          size="sm"
                        >
                          {timeDisplay}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Attendees ({event.attendees.length}):
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
                              +{event.attendees.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="primary"
                        onClick={() => handleOpenAttendance(event)}
                        className="mt-2 w-full"
                      >
                        Mark Attendance
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <AttendanceDialog
          isOpen={open}
          onClose={handleCloseAttendance}
          currentEvent={currentEvent}
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          filteredPeople={filteredPeople}
          onToggleAttendance={toggleAttendance}
          isUpdating={isUpdating}
          updateError={updateError}
        />
      </div>
    </RoleGuard>
  );
}
