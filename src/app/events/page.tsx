"use client";
import { useState, useEffect } from "react";
import NavigationDrawer from "@/components/Drawer";
import { drawerWidth, collapsedWidth } from "@/components/Drawer";
import ProtectedRoute from "@/components/ProtectedRoute";
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
  IconButton,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
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
import RoleGuard from "@/components/RoleGuard";

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
  const [searchTerm, setSearchTerm] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // Role-based permissions are handled by RoleGuard components

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
    setSearchTerm("");
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

  const toggleAttendance = (personId: string) => {
    const attendees = currentEvent.attendees || [];
    if (attendees.includes(personId)) {
      setCurrentEvent({
        ...currentEvent,
        attendees: attendees.filter((id) => id !== personId),
      });
    } else {
      setCurrentEvent({
        ...currentEvent,
        attendees: [...attendees, personId],
      });
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
            Events Management
          </Typography>

          <RoleGuard allowedRoles="event-organizer">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setOpen(true);
                setIsEdit(false);
              }}
              sx={{
                mb: 3,
                backgroundColor: "#144404",
                "&:hover": { backgroundColor: "#0d3002" },
                width: { xs: "100%", sm: "auto" }
              }}
            >
              Create Event
            </Button>
          </RoleGuard>

          <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                  <TableCell>Event Name</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Start Time</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Status</TableCell>
                  <TableCell>Attendees</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.name}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{event.date}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      <Chip
                        label={event.isEnded ? "Ended" : "Active"}
                        color={event.isEnded ? "default" : "success"}
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
                      <Link href={`/events/${event.id}`} passHref>
                        <IconButton>
                          <People color="primary" />
                        </IconButton>
                      </Link>
                      <RoleGuard allowedRoles="event-organizer">
                        {!event.isEnded && (
                          <IconButton onClick={() => handleEdit(event)}>
                            <Edit color="primary" />
                          </IconButton>
                        )}
                        {!event.isEnded && (
                          <IconButton 
                            onClick={() => handleEndEvent(event.id)}
                            sx={{ color: "#ff9800" }}
                            title="End Event"
                          >
                            <Typography variant="body2">End</Typography>
                          </IconButton>
                        )}
                        <IconButton onClick={() => handleDelete(event.id)}>
                          <Delete color="error" />
                        </IconButton>
                      </RoleGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog
              open={open}
              onClose={() => {
                setOpen(false);
                setSearchTerm("");
                setSelectedDate(dayjs());
                setSelectedDateTime(dayjs());
              }}
              fullWidth
              maxWidth="md"
              fullScreen={isMobile}
            >
              <DialogTitle>{isEdit ? "Edit Event" : "Create New Event"}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                  <TextField
                    name="name"
                    label="Event Name"
                    value={currentEvent.name || ""}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    size="small"
                  />
                  <DatePicker
                    label="Event Date"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: "normal",
                        size: "small",
                      },
                    }}
                  />
                  <DateTimePicker
                    label="Start Date & Time"
                    value={selectedDateTime}
                    onChange={(newValue) => setSelectedDateTime(newValue)}
                    disabled={isEdit && currentEvent.isEnded}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: "normal",
                        size: "small",
                      },
                    }}
                  />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Mark Attendance
                </Typography>
                {isEdit && currentEvent.isEnded ? (
                  <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
                    Cannot modify attendance for ended events
                  </Typography>
                ) : (
                  <>
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
                                {person.department}
                              </Typography>
                            </Box>
                            <input
                              type="checkbox"
                              checked={currentEvent.attendees?.includes(person.id!) || false}
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
                  </>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setOpen(false);
                setSearchTerm("");
                setSelectedDate(dayjs());
                setSelectedDateTime(dayjs());
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                sx={{ backgroundColor: "#144404", color: "white" }}
              >
                {isEdit ? "Update" : "Create"}
              </Button>
            </DialogActions>
            </Dialog>
          </LocalizationProvider>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}