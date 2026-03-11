// src/types.ts

/** Academic session (e.g. "2024/2025"). One session is current at a time. */
export interface AcademicSession {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

/**
 * Engineering departments that are 5-year programs (graduate at YR5).
 * All other departments (e.g. Software Engineering, Accounting) graduate at YR4.
 */
export const ENGINEERING_DEPARTMENTS_5_YEAR = [
  "Mechanical Engineering",
  "Electrical and Electronics Engineering",
  "Mechatronics Engineering",
] as const;

export type EngineeringDepartment5Year = (typeof ENGINEERING_DEPARTMENTS_5_YEAR)[number];

export function isEngineeringDepartment(department: string): boolean {
  const normalized = (department || "").trim().toLowerCase();
  return ENGINEERING_DEPARTMENTS_5_YEAR.some(
    (d) => d.toLowerCase() === normalized
  );
}

/** Map class/year input to normalized year 1-5 for progression and graduation. */
export function normalizeYear(value: string | number | undefined): number {
  if (value === undefined || value === null) return 1;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 5) return n;
  const s = String(value).trim().toUpperCase();
  const yrMatch = s.match(/^YR\s*(\d)$/);
  if (yrMatch) return parseInt(yrMatch[1], 10);
  const levelMatch = s.match(/^(\d)00\s*LEVEL$/);
  if (levelMatch) return parseInt(levelMatch[1], 10);
  return 1;
}

export interface Person {
  id?: string;
  firstName: string;
  middleName?: string;
  surname: string;
  department: string;
  gender: string;
  // Legacy UI-only field; new records no longer persist this, use `year` instead.
  class?: string;
  living?: string; // "On Campus" or "Off Campus"
  /** Session this person belongs to. */
  academicSessionId: string;
  /** Normalized year 1-5 for progression and graduation. */
  year: number;
  /** active = in current cohort; graduated = left after session end. */
  status?: "active" | "graduated";
}

export interface Event {
  id: string;
  name: string;
  date: string;
  startTime?: string; // ISO string for start time
  endTime?: string; // ISO string for end time
  isEnded?: boolean; // Flag to indicate if event has ended
  attendees: string[]; // Array of person IDs
  amountSpent?: number; // Amount spent on the event
  /** Session this event belongs to. */
  academicSessionId: string;
}

  export interface User {
    id: string;
    email: string;
    role: 'event-organizer' | 'it' | 'finance-manager' | 'admin' | 'registrar';
    displayName?: string;
  }

  export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }

  export interface Invoice {
    id?: string;
    eventId: string;
    items: InvoiceItem[];
    totalAmount: number;
    date: string;
    attachmentUrl?: string;
    createdBy: string; // User ID who created the invoice
    invoiceNumber?: string;
    vendor?: string;
    notes?: string;
  }