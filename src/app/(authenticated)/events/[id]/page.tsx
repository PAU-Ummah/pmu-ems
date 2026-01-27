"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Stop } from "@mui/icons-material";
import { Person, Event } from "@/types";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import ComponentCard from "@/components/common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const fetchEvent = async () => {
      const docRef = doc(db, "events", eventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
      }
    };

    const fetchPeople = async () => {
      const querySnapshot = await getDocs(collection(db, "people"));
      const peopleData: Person[] = [];
      querySnapshot.forEach((doc) => {
        peopleData.push({ id: doc.id, ...doc.data() } as Person);
      });
      setPeople(peopleData);
    };

    fetchEvent();
    fetchPeople();
  }, [eventId]);

  const handleEndEvent = async () => {
    if (!event) return;
    const endTime = new Date().toISOString();
    await updateDoc(doc(db, "events", event.id), {
      endTime,
      isEnded: true,
    });
    // Refresh the event data
    const docRef = doc(db, "events", eventId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
    }
  };

  if (!event) {
    return (
      <div className="w-full">
        <p className="text-gray-900 dark:text-white/90">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          {event.name}
        </h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <RoleGuard allowedRoles={['event-organizer']}>
            {!event.isEnded && (
              <Button
                variant="warning"
                startIcon={<Stop />}
                onClick={handleEndEvent}
                className="w-full sm:w-auto"
              >
                End Event
              </Button>
            )}
          </RoleGuard>
          <Link href="/events">
            <Button
              variant="outline"
              className="w-full border-[#144404] text-[#144404] hover:border-[#0d3002] hover:bg-[rgba(20,68,4,0.04)] sm:w-auto"
            >
              Back to Events
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <strong>Date:</strong> {event.date}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <strong>Start Time:</strong> {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
          </p>
        </div>
        {event.endTime && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <strong>End Time:</strong> {new Date(event.endTime).toLocaleString()}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <strong>Status:</strong>
          </p>
          <Badge
            color={event.isEnded ? 'light' : 'success'}
            variant="light"
            size="sm"
          >
            {event.isEnded ? "Ended" : "Active"}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <strong>Total Attendees:</strong> {event.attendees.length}
          </p>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {event.attendees.map((attendeeId) => {
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
                {event.attendees.map((attendeeId) => {
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
    </div>
  );
}