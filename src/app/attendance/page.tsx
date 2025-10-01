"use client";
import { useState, useEffect } from "react";
import NavigationDrawer from "@/components/Drawer";
import { drawerWidth, collapsedWidth } from "@/components/Drawer";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  useMediaQuery,
  useTheme,
  Alert,
} from "@mui/material";
import { Event, Person } from "@/types";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import dayjs from "dayjs";

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

  const toggleAttendance = async (personId: string) => {
    if (!currentEvent) return;
    
    const attendees = currentEvent.attendees || [];
    let newAttendees: string[];
    
    if (attendees.includes(personId)) {
      newAttendees = attendees.filter((id) => id !== personId);
    } else {
      newAttendees = [...attendees, personId];
    }

    // Update the event in the database
    await updateDoc(doc(db, "events", currentEvent.id), {
      attendees: newAttendees,
    });

    // Update local state
    setCurrentEvent({
      ...currentEvent,
      attendees: newAttendees,
    });

    // Refresh events list
    fetchEvents();
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

  // Filter events that are starting within 1 hour
  const getUpcomingEvents = () => {
    const now = dayjs();
    const oneHourFromNow = now.add(1, 'hour');
    
    return events.filter(event => {
      if (!event.startTime || event.isEnded) return false;
      
      const eventStartTime = dayjs(event.startTime);
      // Show events that start within the next hour
      return eventStartTime.isAfter(now) && eventStartTime.isBefore(oneHourFromNow);
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
      <Box sx={{ display: "flex" }}>
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
          <Typography color="black">Loading...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles="registrar">
        <Box sx={{ display: 'flex' }}>
          <NavigationDrawer />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              backgroundColor: "#f5f5f5",
              minHeight: "100vh",
              marginLeft: {
                xs: 0,
                md: `calc(${drawerWidth}px - ${drawerWidth - collapsedWidth}px * ${open ? 0 : 1})`
              },
              transition: (theme) => theme.transitions.create('margin', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            }}
          >
            <Typography
              variant="h4"
              color="black"
              gutterBottom
              sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}
            >
              Event Attendance
            </Typography>

            {upcomingEvents.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No events starting within the next hour. Events will appear here 1 hour before they start.
              </Alert>
            ) : (
              <>
                <Typography variant="h6" sx={{ mb: 2, color: "text.secondary" }}>
                  Events starting within 1 hour ({upcomingEvents.length})
                </Typography>

                <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 650 }} size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                        <TableCell>Event Name</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Start Time</TableCell>
                        <TableCell>Time Until Start</TableCell>
                        <TableCell>Attendees</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {upcomingEvents.map((event) => {
                        const eventStartTime = dayjs(event.startTime);
                        const timeUntilStart = eventStartTime.diff(dayjs(), 'minute');
                        const timeDisplay = timeUntilStart > 0 
                          ? `${timeUntilStart} minutes` 
                          : 'Starting now';
                        
                        return (
                          <TableRow key={event.id}>
                            <TableCell>{event.name}</TableCell>
                            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{event.date}</TableCell>
                            <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                              {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={timeDisplay}
                                color={timeUntilStart <= 15 ? "error" : timeUntilStart <= 30 ? "warning" : "success"}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                {event.attendees.slice(0, isMobile ? 1 : 3).map((attendee) => (
                                  <Chip
                                    key={attendee}
                                    label={getPersonName(attendee)}
                                    size="small"
                                  />
                                ))}
                                {event.attendees.length > (isMobile ? 1 : 3) && (
                                  <Chip
                                    label={`+${event.attendees.length - (isMobile ? 1 : 3)}`}
                                    size="small"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleOpenAttendance(event)}
                                sx={{
                                  backgroundColor: "#144404",
                                  "&:hover": { backgroundColor: "#0d3002" },
                                }}
                              >
                                Mark Attendance
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            <Dialog
              open={open}
              onClose={handleCloseAttendance}
              fullWidth
              maxWidth="md"
              fullScreen={isMobile}
            >
              <DialogTitle>
                Mark Attendance - {currentEvent?.name}
              </DialogTitle>
              <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                  <Alert severity="info">
                    Mark attendance for people attending this event. Only events starting within 1 hour are shown.
                  </Alert>
                  
                  <TextField
                    label="Search by name or department"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  
                  <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
                    {filteredPeople.length > 0 ? (
                      filteredPeople.map((person) => (
                        <Box
                          key={person.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            p: 1,
                            borderBottom: "1px solid #eee",
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography>
                              {person.firstName} {person.middleName} {person.surname}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {person.department} - {person.class}
                            </Typography>
                          </Box>
                          <input
                            type="checkbox"
                            checked={currentEvent?.attendees?.includes(person.id!) || false}
                            onChange={() => toggleAttendance(person.id!)}
                            style={{ width: '18px', height: '18px' }}
                          />
                        </Box>
                      ))
                    ) : (
                      <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        No matching people found
                      </Typography>
                    )}
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseAttendance}>
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </RoleGuard>
    </ProtectedRoute>
  );
}
