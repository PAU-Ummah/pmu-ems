"use client";
import { useState, useEffect } from "react";
import NavigationDrawer from "@/components/Drawer";
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import * as XLSX from "xlsx";
import { Person } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import RoleGuard from "@/components/RoleGuard";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<Partial<Person>>({});
  const [isEdit, setIsEdit] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    fetchPeople();
  }, []);

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
    setCurrentPerson({ ...currentPerson, [name]: value });
  };

  const handleSubmit = async () => {
    if (isEdit && currentPerson.id) {
      await updateDoc(doc(db, "people", currentPerson.id), currentPerson);
    } else {
      await addDoc(collection(db, "people"), currentPerson);
    }
    setOpen(false);
    fetchPeople();
    setCurrentPerson({});
  };

  const handleEdit = (person: Person) => {
    setCurrentPerson(person);
    setIsEdit(true);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "people", id));
    fetchPeople();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const processExcel = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      const peopleData: Omit<Person, "id">[] = jsonData.map((row) => ({
        firstName: row["FIRST NAME"] || "",
        middleName: row["MIDDLENAME"] || "",
        surname: row["SURNAME"] || "",
        department: row["DEPARTMENT"] || "",
        gender: row["GENDER"] || "",
        class: row["CLASS"] || "",
      }));

      const batchPromises = peopleData.map((person) =>
        addDoc(collection(db, "people"), person)
      );

      await Promise.all(batchPromises);
      fetchPeople();
      setFile(null);
    };
    reader.readAsArrayBuffer(file);
  };

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
          <Typography
            variant="h4"
            color="black"
            gutterBottom
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}
          >
            People Management
          </Typography>

          <RoleGuard allowedRoles="it">
            <Box sx={{ mb: 3, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setOpen(true);
                  setIsEdit(false);
                }}
                sx={{
                  backgroundColor: "#144404",
                  "&:hover": { backgroundColor: "#0d3002" },
                  width: { xs: "100%", sm: "auto" }
                }}
              >
                Add Person
              </Button>

              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  sx={{
                    borderColor: "#144404",
                    color: "#144404",
                    width: { xs: "100%", sm: "auto" }
                  }}
                >
                  Upload Excel
                  <input
                    type="file"
                    hidden
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                  />
                </Button>
                {file && (
                  <Button
                    variant="contained"
                    onClick={processExcel}
                    sx={{
                      backgroundColor: "#144404",
                      "&:hover": { backgroundColor: "#0d3002" },
                      width: { xs: "100%", sm: "auto" }
                    }}
                  >
                    Process File
                  </Button>
                )}
              </Box>
            </Box>
          </RoleGuard>

          <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                  <TableCell>Name</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Department</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Gender</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      {person.firstName} {person.middleName} {person.surname}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{person.department}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{person.gender}</TableCell>
                    <TableCell>{person.class}</TableCell>
                    <TableCell>
                      <RoleGuard allowedRoles="it">
                        <IconButton onClick={() => handleEdit(person)}>
                          <Edit color="primary" />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(person.id!)}>
                          <Delete color="error" />
                        </IconButton>
                      </RoleGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            fullWidth
            maxWidth="sm"
            fullScreen={isMobile}
          >
            <DialogTitle>{isEdit ? "Edit Person" : "Add New Person"}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                <TextField
                  name="firstName"
                  label="First Name"
                  value={currentPerson.firstName || ""}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                />
                <TextField
                  name="middleName"
                  label="Middle Name"
                  value={currentPerson.middleName || ""}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                />
                <TextField
                  name="surname"
                  label="Surname"
                  value={currentPerson.surname || ""}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                />
                <TextField
                  name="department"
                  label="Department"
                  value={currentPerson.department || ""}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                />
                <TextField
                  name="gender"
                  label="Gender"
                  value={currentPerson.gender || ""}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                />
                <TextField
                  name="class"
                  label="Class"
                  value={currentPerson.class || ""}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  size="small"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                sx={{ backgroundColor: "#144404", color: "white" }}
              >
                {isEdit ? "Update" : "Add"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}