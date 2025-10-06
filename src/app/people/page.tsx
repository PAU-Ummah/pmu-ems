"use client";
import { useState, useEffect, useCallback } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { useRole } from "@/hooks/useRole";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<Partial<Person>>({});
  const [isEdit, setIsEdit] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [classFilter, setClassFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { hasRole } = useRole();

  const fetchPeople = async () => {
    const querySnapshot = await getDocs(collection(db, "people"));
    const peopleData: Person[] = [];
    querySnapshot.forEach((doc) => {
      peopleData.push({ id: doc.id, ...doc.data() } as Person);
    });
    setPeople(peopleData);
  };

  const applyFilters = useCallback(() => {
    let filtered = people;
    
    if (classFilter) {
      filtered = filtered.filter(person => person.class === classFilter);
    }
    
    if (departmentFilter) {
      filtered = filtered.filter(person => person.department === departmentFilter);
    }
    
    setFilteredPeople(filtered);
  }, [people, classFilter, departmentFilter]);

  useEffect(() => {
    fetchPeople();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getUniqueClasses = () => {
    return Array.from(new Set(people.map(person => person.class))).sort();
  };

  const getUniqueDepartments = () => {
    return Array.from(new Set(people.map(person => person.department))).sort();
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
          <RoleGuard allowedRoles={["it", "admin"]}>
          <Typography
            variant="h4"
            color="black"
            gutterBottom
            sx={{ 
              fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
              fontWeight: 600,
              mb: { xs: 2, md: 3 }
            }}
          >
            People Management
          </Typography>

          {hasRole("it") && (
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
          )}

          {/* Filter Section */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontSize: { xs: "1rem", sm: "1.25rem" },
                fontWeight: 500,
                mb: 2
              }}
            >
              Filters
            </Typography>
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: "column", sm: "row" }, 
              gap: { xs: 2, sm: 2 }, 
              flexWrap: "wrap",
              alignItems: { xs: "stretch", sm: "flex-end" }
            }}>
              <Box sx={{ 
                flex: { xs: "1 1 100%", sm: "1 1 200px" },
                minWidth: { xs: "100%", sm: "200px" }
              }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={classFilter}
                    label="Class"
                    onChange={(e) => setClassFilter(e.target.value)}
                    sx={{ height: { xs: "48px", sm: "40px" } }}
                  >
                    <MenuItem value="">All Classes</MenuItem>
                    {getUniqueClasses().map((className) => (
                      <MenuItem key={className} value={className}>
                        {className}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ 
                flex: { xs: "1 1 100%", sm: "1 1 200px" },
                minWidth: { xs: "100%", sm: "200px" }
              }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={departmentFilter}
                    label="Department"
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    sx={{ height: { xs: "48px", sm: "40px" } }}
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    {getUniqueDepartments().map((department) => (
                      <MenuItem key={department} value={department}>
                        {department}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ 
                flex: { xs: "1 1 100%", sm: "0 0 auto" },
                minWidth: { xs: "100%", sm: "auto" }
              }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setClassFilter("");
                    setDepartmentFilter("");
                  }}
                  sx={{ 
                    height: { xs: "48px", sm: "40px" },
                    width: { xs: "100%", sm: "auto" },
                    minWidth: { xs: "auto", sm: "120px" }
                  }}
                >
                  Clear Filters
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Results Summary */}
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: "0.875rem", sm: "0.875rem" },
                lineHeight: 1.4
              }}
            >
              Showing {filteredPeople.length} of {people.length} people
              {classFilter && ` in class "${classFilter}"`}
              {departmentFilter && ` in department "${departmentFilter}"`}
            </Typography>
          </Box>

          <TableContainer 
            component={Paper} 
            sx={{ 
              overflowX: "auto",
              borderRadius: { xs: 1, sm: 2 },
              boxShadow: { xs: 1, sm: 2 }
            }}
          >
            <Table sx={{ minWidth: { xs: 400, sm: 650 } }} size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                  <TableCell sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "0.875rem" }
                  }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ 
                    display: { xs: "none", md: "table-cell" },
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "0.875rem" }
                  }}>
                    Department
                  </TableCell>
                  <TableCell sx={{ 
                    display: { xs: "none", sm: "table-cell" },
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "0.875rem" }
                  }}>
                    Gender
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "0.875rem" }
                  }}>
                    Class
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: "0.875rem", sm: "0.875rem" },
                    width: { xs: "80px", sm: "auto" }
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPeople.map((person) => (
                  <TableRow 
                    key={person.id}
                    sx={{ 
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell sx={{ 
                      fontSize: { xs: "0.875rem", sm: "0.875rem" },
                      fontWeight: 500
                    }}>
                      <Box>
                        <Box sx={{ fontWeight: 600 }}>
                          {person.firstName} {person.middleName} {person.surname}
                        </Box>
                        {/* Show department and gender on mobile in the name cell */}
                        <Box sx={{ 
                          display: { xs: "block", md: "none" },
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          mt: 0.5
                        }}>
                          {person.department} • {person.gender}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      display: { xs: "none", md: "table-cell" },
                      fontSize: { xs: "0.875rem", sm: "0.875rem" }
                    }}>
                      {person.department}
                    </TableCell>
                    <TableCell sx={{ 
                      display: { xs: "none", sm: "table-cell" },
                      fontSize: { xs: "0.875rem", sm: "0.875rem" }
                    }}>
                      {person.gender}
                    </TableCell>
                    <TableCell sx={{ 
                      fontSize: { xs: "0.875rem", sm: "0.875rem" },
                      fontWeight: 500
                    }}>
                      {person.class}
                    </TableCell>
                    <TableCell sx={{ 
                      width: { xs: "80px", sm: "auto" },
                      padding: { xs: "8px", sm: "16px" }
                    }}>
                      {hasRole("it") && (
                        <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 } }}>
                          <IconButton 
                            onClick={() => handleEdit(person)}
                            size="small"
                            sx={{ 
                              padding: { xs: "4px", sm: "8px" }
                            }}
                          >
                            <Edit 
                              color="primary" 
                              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                            />
                          </IconButton>
                          <IconButton 
                            onClick={() => handleDelete(person.id!)}
                            size="small"
                            sx={{ 
                              padding: { xs: "4px", sm: "8px" }
                            }}
                          >
                            <Delete 
                              color="error" 
                              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                            />
                          </IconButton>
                        </Box>
                      )}
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
            sx={{
              '& .MuiDialog-paper': {
                margin: { xs: 1, sm: 2 },
                width: { xs: 'calc(100% - 16px)', sm: 'auto' }
              }
            }}
          >
            <DialogTitle sx={{ 
              fontSize: { xs: "1.125rem", sm: "1.25rem" },
              fontWeight: 600
            }}>
              {isEdit ? "Edit Person" : "Add New Person"}
            </DialogTitle>
            <DialogContent sx={{ 
              padding: { xs: 2, sm: 3 },
              '& .MuiTextField-root': { 
                marginBottom: { xs: 1, sm: 2 } 
              }
            }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: { xs: 1.5, sm: 2 }, 
                pt: { xs: 1, sm: 2 } 
              }}>
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
            <DialogActions sx={{ 
              padding: { xs: 2, sm: 3 },
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: "column", sm: "row" }
            }}>
              <Button 
                onClick={() => setOpen(false)}
                variant="outlined"
                fullWidth={isMobile}
                sx={{ 
                  order: { xs: 2, sm: 1 },
                  minWidth: { xs: "auto", sm: "80px" }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                fullWidth={isMobile}
                sx={{ 
                  backgroundColor: "#144404", 
                  color: "white",
                  order: { xs: 1, sm: 2 },
                  minWidth: { xs: "auto", sm: "80px" },
                  "&:hover": { backgroundColor: "#0d3002" }
                }}
              >
                {isEdit ? "Update" : "Add"}
              </Button>
            </DialogActions>
          </Dialog>
          </RoleGuard>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}