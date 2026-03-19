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
import { Person, normalizeYear } from "@/services/types";
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
import { db } from "@/services/firebase";
import RoleGuard from "@/components/auth/RoleGuard";
import { useRole } from "@/hooks/useRole";
import { useCurrentSession } from "@/hooks/useCurrentSession";
import { usePeople } from "@/hooks/usePeople";
import Button from "@/components/ui/button/Button";
import Select from '@/components/form/Select';
import Label from '@/components/form/Label';
import ComponentCard from "@/components/common/ComponentCard";

import AddPersonForm from "./_component/AddPersonForm";
import ProcessingProgress from "./_component/ProcessingProgress";
import DeletePersonModal from "./_component/DeletePersonModal";

export default function PeoplePage() {
  const { currentSessionId } = useCurrentSession();
  const { people, loading: peopleLoading, refresh: fetchPeople } = usePeople(currentSessionId);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [currentPerson, setCurrentPerson] = useState<Partial<Person>>({});
  const [isEdit, setIsEdit] = useState(false);
  const [, setFile] = useState<File | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [livingFilter, setLivingFilter] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { hasRole } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddEditDelete = hasRole("it") || hasRole("admin");
  const canUploadExcel = hasRole("it");

  const applyFilters = useCallback(() => {
    let filtered = people;
    
    if (yearFilter) {
      filtered = filtered.filter(person => String(person.year) === yearFilter);
    }
    
    if (departmentFilter) {
      filtered = filtered.filter(person => person.department === departmentFilter);
    }
    
    if (livingFilter) {
      filtered = filtered.filter(person => person.living === livingFilter);
    }
    
    setFilteredPeople(filtered);
  }, [people, yearFilter, departmentFilter, livingFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getUniqueYears = () => {
    const years = Array.from(new Set(people.map(person => person.year))).filter(
      (potentialYear): potentialYear is number => typeof potentialYear === "number"
    );
    return years.sort((firstYear, secondYear) => firstYear - secondYear);
  };

  const getUniqueDepartments = () => {
    return Array.from(new Set(people.map(person => person.department))).sort();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === "class") {
      const year = normalizeYear(value);
      setCurrentPerson({ ...currentPerson, class: value, year });
    } else {
      setCurrentPerson({ ...currentPerson, [name]: value });
    }
  };

  const handleDepartmentChange = (departmentValue: string) => {
    setCurrentPerson({ ...currentPerson, department: departmentValue });
  };

  const handleClassChange = (classValue: string) => {
    const normalizedYear = normalizeYear(classValue);
    setCurrentPerson({ ...currentPerson, class: classValue, year: normalizedYear });
  };

  const handleLivingChange = (value: string) => {
    setCurrentPerson({ ...currentPerson, living: value });
  };

  const handleSubmit = async () => {
    // Only persist the fields we care about; do not save `class`.
    const baseYear =
      typeof currentPerson.year === "number"
        ? currentPerson.year
        : normalizeYear(currentPerson.class as string | undefined);

    // Build payload without any undefined fields (Firestore does not allow them).
    const payload: Partial<Person> = {
      firstName: currentPerson.firstName ?? "",
      middleName: currentPerson.middleName ?? "",
      surname: currentPerson.surname ?? "",
      department: currentPerson.department ?? "",
      gender: currentPerson.gender ?? "",
      academicSessionId:
        currentPerson.academicSessionId ?? currentSessionId ?? "",
      year: baseYear ?? 1,
      status: currentPerson.status ?? "active",
    };
    if (currentPerson.living) {
      payload.living = currentPerson.living;
    }

    if (isEdit && currentPerson.id) {
      await updateDoc(doc(db, "people", currentPerson.id), payload);
    } else {
      await addDoc(collection(db, "people"), payload);
    }
    setOpen(false);
    fetchPeople();
    setCurrentPerson({});
  };

  const handleEdit = (person: Person) => {
    const derivedClass =
      person.class && person.class.trim()
        ? person.class
        : person.year
          ? `YR${person.year}`
          : "YR1";
    setCurrentPerson({
      ...person,
      middleName: person.middleName ?? "",
      class: derivedClass,
    });
    setIsEdit(true);
    setOpen(true);
  };

  const handleAddClick = () => {
    setCurrentPerson({
      academicSessionId: currentSessionId ?? "",
      middleName: "",
      year: 1,
      status: "active",
    });
    setIsEdit(false);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "people", id));
      fetchPeople();
      setPersonToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    reader.onload = async (loadEvent) => {
      try {
        const data = loadEvent.target?.result;
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

        if (!currentSessionId) {
          setIsProcessing(false);
          setProcessingProgress(0);
          return;
        }
        const peopleData = jsonData.map((row) => {
          const classVal = row["CLASS"] ?? "";
          return {
            firstName: row["FIRST NAME"] ?? "",
            middleName: row["MIDDLENAME"] ?? "",
            surname: row["SURNAME"] ?? "",
            department: row["DEPARTMENT"] ?? "",
            gender: row["GENDER"] ?? "",
            living: normalizeLiving(row["LIVING"] ?? ""),
            academicSessionId: currentSessionId,
            year: normalizeYear(classVal),
            status: "active",
          };
        });

        const totalRecords = peopleData.length;
        let processedCount = 0;

        // Process records sequentially to track progress
        for (const person of peopleData) {
          try {
            const peopleRef = collection(db, "people");
            const duplicateCheckQuery = query(
              peopleRef,
              where("firstName", "==", person.firstName),
              where("surname", "==", person.surname)
            );
            
            const querySnapshot = await getDocs(duplicateCheckQuery);
            
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              const updateData: Partial<Person> = {};
              if (person.living) updateData.living = person.living;
              if (person.department) updateData.department = person.department;
              if (person.gender) updateData.gender = person.gender;
              if (person.middleName) updateData.middleName = person.middleName;
              if (person.year != null) updateData.year = person.year;
              if (person.academicSessionId) updateData.academicSessionId = person.academicSessionId;
              if (Object.keys(updateData).length > 0) {
                await updateDoc(doc(db, "people", existingDoc.id), updateData);
              }
            } else {
              await addDoc(collection(db, "people"), {
                firstName: person.firstName,
                middleName: person.middleName,
                surname: person.surname,
                department: person.department,
                gender: person.gender,
                living: person.living,
                academicSessionId: person.academicSessionId,
                year: person.year,
                status: person.status,
              });
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


  const yearOptions = [
    { value: "", label: "All Years" },
    ...getUniqueYears().map(year => ({ value: String(year), label: `YR${year}` }))
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

  const departmentFormOptions = getUniqueDepartments().map((departmentName) => ({
    value: departmentName,
    label: departmentName,
  }));

  const classFormOptions = [
    { value: "YR1", label: "YR1" },
    { value: "YR2", label: "YR2" },
    { value: "YR3", label: "YR3" },
    { value: "YR4", label: "YR4" },
    { value: "YR5", label: "YR5" },
  ];

  return (
    <RoleGuard allowedRoles={["it", "admin"]}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          People Management
        </h1>

        {!currentSessionId && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-medium">No academic session configured</p>
            <p className="mt-1 text-sm">Configure a session in Settings → Session management to add or view people.</p>
          </div>
        )}

        {peopleLoading && (
          <div className="mb-6 text-sm text-gray-500">Loading people…</div>
        )}

        {canAddEditDelete && (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:gap-2">
            <Button
              variant="primary"
              startIcon={<Add />}
              onClick={handleAddClick}
              disabled={!currentSessionId}
              className="w-full sm:w-auto"
            >
              Add Person
            </Button>

            {canUploadExcel && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || !currentSessionId}
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
            )}
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            Filters
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-2">
            <div className="flex-1 sm:min-w-[200px]">
              <Label htmlFor="year-filter">Year</Label>
            <Select
              options={yearOptions}
              defaultValue={yearFilter}
              onChange={(changeEvent) => setYearFilter(changeEvent.target.value)}
              placeholder="All Years"
            />
            </div>
            <div className="flex-1 sm:min-w-[200px]">
              <Label htmlFor="department-filter">Department</Label>
              <Select
                options={departmentOptions}
                defaultValue={departmentFilter}
                onChange={(changeEvent) => setDepartmentFilter(changeEvent.target.value)}
                placeholder="All Departments"
              />
            </div>
            <div className="flex-1 sm:min-w-[200px]">
              <Label htmlFor="living-filter">Living</Label>
              <Select
                options={livingOptions}
                defaultValue={livingFilter}
                onChange={(changeEvent) => setLivingFilter(changeEvent.target.value)}
                placeholder="All Living"
              />
            </div>
            <div className="sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setYearFilter("");
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
            {yearFilter && ` in year "YR${yearFilter}"`}
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">Year</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {person.year ? `YR${person.year}` : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Living</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {person.living ?? "-"}
                      </span>
                </div>
                {canAddEditDelete && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <IconButton
                      onClick={() => handleEdit(person)}
                      size="small"
                      sx={{ padding: "8px" }}
                    >
                      <Edit color="primary" />
                    </IconButton>
                    <IconButton
                      onClick={() => setPersonToDelete(person)}
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
                      Year
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
                        {person.year ? `YR${person.year}` : "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600">
                        {person.living ?? "-"}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {canAddEditDelete && (
                          <div className="flex gap-2">
                            <IconButton
                              onClick={() => handleEdit(person)}
                              size="small"
                              sx={{ padding: "8px" }}
                            >
                              <Edit color="primary" />
                            </IconButton>
                            <IconButton
                              onClick={() => setPersonToDelete(person)}
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
          onDepartmentChange={handleDepartmentChange}
          onClassChange={handleClassChange}
          onLivingChange={handleLivingChange}
          onSubmit={handleSubmit}
          departmentFormOptions={departmentFormOptions}
          classFormOptions={classFormOptions}
          livingFormOptions={livingFormOptions}
          currentSessionId={currentSessionId}
        />

        <ProcessingProgress
          isOpen={isProcessing}
          progress={processingProgress}
        />

        <DeletePersonModal
          isOpen={!!personToDelete}
          onClose={() => setPersonToDelete(null)}
          person={personToDelete}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      </div>
    </RoleGuard>
  );
}
