// src/types.ts
export interface Person {
    id?: string;
    firstName: string;
    middleName?: string;
    surname: string;
    department: string;
    gender: string;
    class: string;
    living?: string; // "On Campus" or "Off Campus"
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