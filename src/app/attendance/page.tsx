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
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/firebase";
import dayjs from "dayjs";

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
              p: { xs: 1, sm: 2, md: 3 },
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

                {/* Desktop Table View */}
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    overflowX: "auto",
                    display: { xs: "none", md: "block" }
                  }}
                >
                  <Table sx={{ minWidth: 650 }} size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                        <TableCell>Event Name</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Start Time</TableCell>
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
                            <TableCell>{event.date}</TableCell>
                            <TableCell>
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

                {/* Mobile Card View */}
                <Box sx={{ display: { xs: "block", md: "none" } }}>
                  {upcomingEvents.map((event) => {
                    const eventStartTime = dayjs(event.startTime);
                    const timeUntilStart = eventStartTime.diff(dayjs(), 'minute');
                    const timeDisplay = timeUntilStart > 0 
                      ? `${timeUntilStart} minutes` 
                      : 'Starting now';
                    
                    return (
                      <Paper
                        key={event.id}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2,
                          boxShadow: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                            {event.name}
                          </Typography>
                          
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Date:</strong> {event.date}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Start Time:</strong> {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Time Until Start:
                            </Typography>
                            <Chip
                              label={timeDisplay}
                              color={timeUntilStart <= 15 ? "error" : timeUntilStart <= 30 ? "warning" : "success"}
                              size="small"
                            />
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              Attendees ({event.attendees.length}):
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                              {event.attendees.slice(0, 2).map((attendee) => (
                                <Chip
                                  key={attendee}
                                  label={getPersonName(attendee)}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                              {event.attendees.length > 2 && (
                                <Chip
                                  label={`+${event.attendees.length - 2} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                          
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleOpenAttendance(event)}
                            sx={{
                              backgroundColor: "#144404",
                              "&:hover": { backgroundColor: "#0d3002" },
                              mt: 1,
                            }}
                          >
                            Mark Attendance
                          </Button>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </>
            )}

            <Dialog
              open={open}
              onClose={handleCloseAttendance}
              fullWidth
              maxWidth="md"
              fullScreen={isMobile}
              sx={{
                '& .MuiDialog-paper': {
                  margin: { xs: 0, sm: 2 },
                  height: { xs: '100vh', sm: 'auto' },
                  maxHeight: { xs: '100vh', sm: '90vh' },
                }
              }}
            >
              <DialogTitle sx={{ 
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
                pb: 1
              }}>
                Mark Attendance - {currentEvent?.name}
              </DialogTitle>
              <DialogContent sx={{ 
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 2 }
              }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Alert severity="info" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                    Mark attendance for people attending this event. Only events starting within 1 hour are shown.
                  </Alert>
                  
                  {updateError && (
                    <Alert severity="error" onClose={() => setUpdateError(null)}>
                      {updateError}
                    </Alert>
                  )}
                  
                  {isUpdating && (
                    <Alert severity="info">
                      Updating attendance...
                    </Alert>
                  )}
                  
                  <TextField
                    label="Search by name or department"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      mb: 1,
                      '& .MuiOutlinedInput-root': {
                        fontSize: { xs: "0.875rem", sm: "1rem" }
                      }
                    }}
                  />
                  
                  <Box sx={{ 
                    maxHeight: { xs: "calc(100vh - 300px)", sm: "400px" }, 
                    overflow: "auto",
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    backgroundColor: "#fafafa"
                  }}>
                    {filteredPeople.length > 0 ? (
                      filteredPeople.map((person) => (
                        <Box
                          key={person.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            p: { xs: 1.5, sm: 2 },
                            borderBottom: "1px solid #eee",
                            backgroundColor: "white",
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                            '&:last-child': {
                              borderBottom: 'none'
                            }
                          }}
                        >
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography 
                              sx={{ 
                                fontSize: { xs: "0.875rem", sm: "1rem" },
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {person.firstName} {person.middleName} {person.surname}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {person.department} - {person.class}
                            </Typography>
                          </Box>
                          <Box sx={{ ml: 1, flexShrink: 0 }}>
                            <input
                              type="checkbox"
                              checked={currentEvent?.attendees?.includes(person.id!) || false}
                              onChange={() => toggleAttendance(person.id!)}
                              disabled={isUpdating}
                              style={{ 
                                width: isMobile ? '20px' : '18px', 
                                height: isMobile ? '20px' : '18px',
                                cursor: isUpdating ? 'not-allowed' : 'pointer'
                              }}
                            />
                          </Box>
                        </Box>
                      ))
                    ) : (
                      <Box sx={{ 
                        p: 3, 
                        textAlign: 'center', 
                        color: 'text.secondary',
                        backgroundColor: "white"
                      }}>
                        <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                          No matching people found
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions sx={{ 
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 2 }
              }}>
                <Button 
                  onClick={handleCloseAttendance}
                  variant="outlined"
                  fullWidth={isMobile}
                  sx={{
                    minWidth: { xs: "auto", sm: "64px" }
                  }}
                >
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
