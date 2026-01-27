"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { IconButton } from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";
import { Person } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase";
import RoleGuard from "@/components/auth/RoleGuard";
import { useRole } from "@/hooks/useRole";
import Button from "@/components/ui/button/Button";
import Select from '@/components/form/Select';
import Label from '@/components/form/Label';
import ComponentCard from "@/components/common/ComponentCard";

import AddPersonForm from "./_component/AddPersonForm";
import ProcessingProgress from "./_component/ProcessingProgress";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<Partial<Person>>({});
  const [isEdit, setIsEdit] = useState(false);
  const [, setFile] = useState<File | null>(null);
  const [classFilter, setClassFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [livingFilter, setLivingFilter] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { hasRole } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    if (livingFilter) {
      filtered = filtered.filter(person => person.living === livingFilter);
    }
    
    setFilteredPeople(filtered);
  }, [people, classFilter, departmentFilter, livingFilter]);

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

  const handleLivingChange = (value: string) => {
    setCurrentPerson({ ...currentPerson, living: value });
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      // Start processing immediately
      await processExcelFile(file);
    }
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

        const normalizeLiving = (value: string): string => {
          const normalized = value.trim();
          if (!normalized) return "";
          
          const lower = normalized.toLowerCase();
          if (lower === "on campus" || lower === "oncampus" || lower === "on-campus") {
            return "On Campus";
          }
          if (lower === "off campus" || lower === "offcampus" || lower === "off-campus") {
            return "Off Campus";
          }
          return normalized;
        };

        const peopleData: Omit<Person, "id">[] = jsonData.map((row) => ({
          firstName: row["FIRST NAME"] || "",
          middleName: row["MIDDLENAME"] || "",
          surname: row["SURNAME"] || "",
          department: row["DEPARTMENT"] || "",
          gender: row["GENDER"] || "",
          class: row["CLASS"] || "",
          living: normalizeLiving(row["LIVING"] || ""),
        }));

        const totalRecords = peopleData.length;
        let processedCount = 0;

        // Process records sequentially to track progress
        for (const person of peopleData) {
          try {
            const peopleRef = collection(db, "people");
            const q = query(
              peopleRef,
              where("firstName", "==", person.firstName),
              where("surname", "==", person.surname)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              const updateData: Partial<Person> = {};
              
              if (person.living) {
                updateData.living = person.living;
              }
              
              if (person.department) updateData.department = person.department;
              if (person.gender) updateData.gender = person.gender;
              if (person.class) updateData.class = person.class;
              if (person.middleName) updateData.middleName = person.middleName;
              
              if (Object.keys(updateData).length > 0) {
                await updateDoc(doc(db, "people", existingDoc.id), updateData);
              }
            } else {
              await addDoc(collection(db, "people"), person);
            }
          } catch {
            // Continue processing other records even if one fails
          }
          
          processedCount++;
          const progress = Math.round((processedCount / totalRecords) * 100);
          setProcessingProgress(progress);
        }

        await fetchPeople();
        setFile(null);
        setProcessingProgress(100);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Wait a moment to show 100% before closing
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
        }, 500);
      } catch{
        // Error processing Excel file
        setIsProcessing(false);
        setProcessingProgress(0);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };


  const classOptions = [
    { value: "", label: "All Classes" },
    ...getUniqueClasses().map(className => ({ value: className, label: className }))
  ];

  const departmentOptions = [
    { value: "", label: "All Departments" },
    ...getUniqueDepartments().map(dept => ({ value: dept, label: dept }))
  ];

  const livingOptions = [
    { value: "", label: "All Living" },
    { value: "On Campus", label: "On Campus" },
    { value: "Off Campus", label: "Off Campus" },
  ];

  const livingFormOptions = [
    { value: "", label: "Select..." },
    { value: "On Campus", label: "On Campus" },
    { value: "Off Campus", label: "Off Campus" },
  ];

  return (
    <RoleGuard allowedRoles={["it", "admin"]}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          People Management
        </h1>

        {hasRole("it") && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:gap-2">
            <Button
              variant="primary"
              startIcon={<Add />}
              onClick={() => {
                setOpen(true);
                setIsEdit(false);
                setCurrentPerson({});
              }}
              className="w-full sm:w-auto"
            >
              Add Person
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                Upload Excel
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            Filters
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-2">
            <div className="flex-1 sm:min-w-[200px]">
              <Label htmlFor="class-filter">Class</Label>
              <Select
                options={classOptions}
                defaultValue={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                placeholder="All Classes"
              />
            </div>
            <div className="flex-1 sm:min-w-[200px]">
              <Label htmlFor="department-filter">Department</Label>
              <Select
                options={departmentOptions}
                defaultValue={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                placeholder="All Departments"
              />
            </div>
            <div className="flex-1 sm:min-w-[200px]">
              <Label htmlFor="living-filter">Living</Label>
              <Select
                options={livingOptions}
                defaultValue={livingFilter}
                onChange={(e) => setLivingFilter(e.target.value)}
                placeholder="All Living"
              />
            </div>
            <div className="sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setClassFilter("");
                  setDepartmentFilter("");
                  setLivingFilter("");
                }}
                className="w-full sm:w-auto sm:min-w-[120px]"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredPeople.length} of {people.length} people
            {classFilter && ` in class "${classFilter}"`}
            {departmentFilter && ` in department "${departmentFilter}"`}
            {livingFilter && ` living "${livingFilter}"`}
          </p>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredPeople.map((person) => (
            <ComponentCard
              key={person.id}
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">Gender</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {person.gender}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Class</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {person.class}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Living</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {person.living || "-"}
                  </span>
                </div>
                {hasRole("it") && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <IconButton
                      onClick={() => handleEdit(person)}
                      size="small"
                      sx={{ padding: "8px" }}
                    >
                      <Edit color="primary" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(person.id!)}
                      size="small"
                      sx={{ padding: "8px" }}
                    >
                      <Delete color="error" />
                    </IconButton>
                  </div>
                )}
              </div>
            </ComponentCard>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[650px]">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700"
                    >
                      Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700"
                    >
                      Department
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700"
                    >
                      Gender
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700"
                    >
                      Class
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700"
                    >
                      Living
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                  {filteredPeople.map((person) => (
                    <TableRow
                      key={person.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="px-5 py-4 text-start">
                        <div className="text-theme-sm font-semibold text-gray-800">
                          {person.firstName} {person.middleName} {person.surname}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
                        {person.department}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
                        {person.gender}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm font-medium text-gray-800">
                        {person.class}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
                        {person.living || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {hasRole("it") && (
                          <div className="flex gap-2">
                            <IconButton
                              onClick={() => handleEdit(person)}
                              size="small"
                              sx={{ padding: "8px" }}
                            >
                              <Edit color="primary" />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDelete(person.id!)}
                              size="small"
                              sx={{ padding: "8px" }}
                            >
                              <Delete color="error" />
                            </IconButton>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <AddPersonForm
          isOpen={open}
          onClose={() => setOpen(false)}
          currentPerson={currentPerson}
          isEdit={isEdit}
          onInputChange={handleInputChange}
          onLivingChange={handleLivingChange}
          onSubmit={handleSubmit}
          livingFormOptions={livingFormOptions}
        />

        <ProcessingProgress
          isOpen={isProcessing}
          progress={processingProgress}
        />
      </div>
    </RoleGuard>
  );
}
