"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import NavigationDrawer from "@/components/Drawer";
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
  Button,
  useMediaQuery,
  useTheme,
  Chip,
} from "@mui/material";
import { Stop } from "@mui/icons-material";
import { Person, Event } from "@/types";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
      <ProtectedRoute>
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
          <Typography color="black">Loading...</Typography>
        </Box>
      </Box>
      </ProtectedRoute>
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
            p: { xs: 2, md: 3 },
            backgroundColor: "#f5f5f5",
            minHeight: "100vh",
            ml: { xs: 0, md: "56px" },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", mb: 3, gap: 2 }}>
            <Typography variant="h4" color="black" sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>
              {event.name}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexDirection: isMobile ? "column" : "row" }}>
              {!event.isEnded && (
                <Button
                  variant="contained"
                  startIcon={<Stop />}
                  onClick={handleEndEvent}
                  sx={{
                    backgroundColor: "#ff9800",
                    "&:hover": { backgroundColor: "#f57c00" },
                    width: isMobile ? "100%" : "auto"
                  }}
                >
                  End Event
                </Button>
              )}
              <Link href="/events" passHref>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: "#144404",
                    color: "#144404",
                    width: isMobile ? "100%" : "auto"
                  }}
                >
                  Back to Events
                </Button>
              </Link>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
            <Typography variant="subtitle1" color="black">
              Date: {event.date}
            </Typography>
            <Typography variant="subtitle1" color="black">
              Start Time: {event.startTime ? new Date(event.startTime).toLocaleString() : "Not set"}
            </Typography>
            {event.endTime && (
              <Typography variant="subtitle1" color="black">
                End Time: {new Date(event.endTime).toLocaleString()}
              </Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" color="black">
                Status:
              </Typography>
              <Chip
                label={event.isEnded ? "Ended" : "Active"}
                color={event.isEnded ? "default" : "success"}
                size="small"
              />
            </Box>
            <Typography variant="subtitle1" color="black">
              Total Attendees: {event.attendees.length}
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ mt: 3, overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Department</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {event.attendees.map((attendeeId) => {
                  const person = people.find((p) => p.id === attendeeId);
                  if (!person) return null;
                  return (
                    <TableRow key={attendeeId}>
                      <TableCell>
                        {person.firstName} {person.middleName} {person.surname}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{person.department}</TableCell>
                      <TableCell>{person.email}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
      </ProtectedRoute>
  );
}