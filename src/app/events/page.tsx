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
  Card,
  CardContent,
  CardActions,
  Stack,
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
            p: { xs: 2, sm: 3 },
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
            sx={{ 
              fontSize: { xs: "1.5rem", md: "2rem" },
              mb: { xs: 2, sm: 3 }
            }}
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
                mb: { xs: 2, sm: 3 },
                backgroundColor: "#144404",
                "&:hover": { backgroundColor: "#0d3002" },
                width: { xs: "100%", sm: "auto" },
                py: { xs: 1.5, sm: 1 },
                fontSize: { xs: "1rem", sm: "0.875rem" }
              }}
            >
              Create Event
            </Button>
          </RoleGuard>

          {/* Mobile Card Layout */}
          {isMobile ? (
            <Stack spacing={2}>
              {events.map((event) => (
                <Card key={event.id} sx={{ boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {event.name}
                    </Typography>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Date: {event.date}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Time: {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          label={event.isEnded ? "Ended" : "Active"}
                          color={event.isEnded ? "default" : "success"}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {event.attendees.length} attendees
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Attendees:
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {event.attendees.slice(0, 2).map((attendee) => (
                            <Chip
                              key={attendee}
                              label={getPersonName(attendee)}
                              size="small"
                            />
                          ))}
                          {event.attendees.length > 2 && (
                            <Chip
                              label={`+${event.attendees.length - 2}`}
                              size="small"
                            />
                          )}
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                    <Link href={`/events/${event.id}`} passHref>
                      <Button
                        variant="outlined"
                        startIcon={<People />}
                        size="small"
                        sx={{ minWidth: "auto" }}
                      >
                        View
                      </Button>
                    </Link>
                    <RoleGuard allowedRoles="event-organizer">
                      <Stack direction="row" spacing={1}>
                        {!event.isEnded && (
                          <IconButton onClick={() => handleEdit(event)} size="small">
                            <Edit color="primary" />
                          </IconButton>
                        )}
                        {!event.isEnded && (
                          <Button
                            onClick={() => handleEndEvent(event.id)}
                            size="small"
                            sx={{ color: "#ff9800", minWidth: "auto" }}
                          >
                            End
                          </Button>
                        )}
                        <IconButton onClick={() => handleDelete(event.id)} size="small">
                          <Delete color="error" />
                        </IconButton>
                      </Stack>
                    </RoleGuard>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          ) : (
            /* Desktop Table Layout */
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
                          {event.attendees.slice(0, 3).map((attendee) => (
                            <Chip
                              key={attendee}
                              label={getPersonName(attendee)}
                              size="small"
                            />
                          ))}
                          {event.attendees.length > 3 && (
                            <Chip
                              label={`+${event.attendees.length - 3}`}
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
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog
              open={open}
              onClose={() => {
                setOpen(false);
                setSelectedDate(dayjs());
                setSelectedDateTime(dayjs());
              }}
              fullWidth
              maxWidth={isMobile ? "sm" : "md"}
              fullScreen={isMobile}
              PaperProps={{
                sx: {
                  m: isMobile ? 0 : 2,
                  height: isMobile ? "100vh" : "auto",
                }
              }}
            >
              <DialogTitle sx={{ 
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                pb: 1
              }}>
                {isEdit ? "Edit Event" : "Create New Event"}
              </DialogTitle>
              <DialogContent sx={{ 
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 2 }
              }}>
                <Stack spacing={2} sx={{ pt: 1 }}>
                  <TextField
                    name="name"
                    label="Event Name"
                    value={currentEvent.name || ""}
                    onChange={handleInputChange}
                    fullWidth
                    size={isMobile ? "medium" : "small"}
                    sx={{
                      '& .MuiInputBase-root': {
                        fontSize: { xs: "1rem", sm: "0.875rem" }
                      }
                    }}
                  />
                  <DatePicker
                    label="Event Date"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: isMobile ? "medium" : "small",
                        sx: {
                          '& .MuiInputBase-root': {
                            fontSize: { xs: "1rem", sm: "0.875rem" }
                          }
                        }
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
                        size: isMobile ? "medium" : "small",
                        sx: {
                          '& .MuiInputBase-root': {
                            fontSize: { xs: "1rem", sm: "0.875rem" }
                          }
                        }
                      },
                    }}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ 
                px: { xs: 2, sm: 3 },
                pb: { xs: 2, sm: 3 },
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 1, sm: 0 }
              }}>
                <Button 
                  onClick={() => {
                    setOpen(false);
                    setSelectedDate(dayjs());
                    setSelectedDateTime(dayjs());
                  }}
                  fullWidth={isMobile}
                  size={isMobile ? "large" : "medium"}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  sx={{ 
                    backgroundColor: "#144404", 
                    color: "white",
                    width: { xs: "100%", sm: "auto" },
                    minWidth: { xs: "auto", sm: "100px" }
                  }}
                  size={isMobile ? "large" : "medium"}
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