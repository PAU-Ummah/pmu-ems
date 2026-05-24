import type { Person } from '@/services/types';
import { downloadCSV } from '@/utils/pdfGenerator';

function formatClass(person: Person): string {
  if (person.class?.trim()) {
    return person.class.trim();
  }
  if (typeof person.year === 'number') {
    return `YR${person.year}`;
  }
  return '';
}

export function buildPeopleCsvRows(people: Person[]): Record<string, string>[] {
  return people.map((person) => ({
    'FIRST NAME': person.firstName,
    MIDDLENAME: person.middleName ?? '',
    SURNAME: person.surname,
    DEPARTMENT: person.department,
    GENDER: person.gender,
    CLASS: formatClass(person),
    LIVING: person.living ?? '',
    STATUS: person.status ?? 'active',
  }));
}

export function exportPeopleToCsv(people: Person[], filename: string): void {
  if (people.length === 0) {
    return;
  }
  downloadCSV(buildPeopleCsvRows(people), filename);
}

export function buildPeopleExportFilename(sessionName?: string): string {
  const datePart = new Date().toISOString().slice(0, 10);
  if (sessionName?.trim()) {
    const safeSession = sessionName.trim().replace(/[/\\?%*:|"<>]/g, '-');
    return `people_${safeSession}_${datePart}.csv`;
  }
  return `people_export_${datePart}.csv`;
}
