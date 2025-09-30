"use client";
import { useState, useEffect } from "react";
import NavigationDrawer from "@/components/Drawer";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Event, Person } from "@/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import RoleGuard from "@/components/RoleGuard";

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

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles="admin">
        <Box sx={{ display: 'flex' }}>
          <NavigationDrawer />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            backgroundColor: "#f5f5f5",
            minHeight: "100vh",
            ml: { xs: 0, md: "56px" },
          }}
        >
          <Typography 
            variant="h4" 
            color="black" 
            gutterBottom 
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}
          >
            Event Reports
          </Typography>

        <FormControl fullWidth sx={{ mb: 3, maxWidth: 400 }}>
          <InputLabel>Select Event</InputLabel>
          <Select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            label="Select Event"
          >
            {events.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name} - {event.date}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedEventData && (
          <>
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                fontSize: { xs: "1.25rem", md: "1.5rem" },
                color: "black",
              }}
            >
              {selectedEventData.name} - {selectedEventData.date}
            </Typography>
            <Typography 
              variant="subtitle1" 
              gutterBottom
              sx={{ 
                color: "black",
                mb: 1
              }}
            >
              Total Attendees: {selectedEventData.attendees.length}
            </Typography>
            <Typography 
              variant="subtitle1" 
              gutterBottom
              sx={{ 
                color: "black",
                mb: 1
              }}
            >
              Amount Spent: ₦{selectedEventData.amountSpent?.toLocaleString() || "0"}
            </Typography>
            {(selectedEventData.startTime || selectedEventData.endTime) && (
              <Typography 
                variant="body1" 
                gutterBottom
                sx={{ 
                  color: "text.secondary",
                  mb: 2
                }}
              >
                {selectedEventData.startTime && (
                  <>Start Time: {new Date(selectedEventData.startTime).toLocaleString()}</>
                )}
                {selectedEventData.startTime && selectedEventData.endTime && " | "}
                {selectedEventData.endTime && (
                  <>End Time: {new Date(selectedEventData.endTime).toLocaleString()}</>
                )}
              </Typography>
            )}

            <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell>Name</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Department</TableCell>
                    <TableCell>Class</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedEventData.attendees.map((attendeeId) => {
                    const person = people.find((p) => p.id === attendeeId);
                    if (!person) return null;
                    return (
                      <TableRow key={attendeeId}>
                        <TableCell>
                          {person.firstName} {person.middleName} {person.surname}
                        </TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{person.department}</TableCell>
                        <TableCell>{person.class}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
        </Box>
      </Box>
      </RoleGuard>
    </ProtectedRoute>
  );
}