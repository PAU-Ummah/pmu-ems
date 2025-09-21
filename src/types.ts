// src/types.ts
export interface Person {
    id?: string;
    firstName: string;
    middleName?: string;
    surname: string;
    department: string;
    gender: string;
    email: string;
  }
  
  export interface Event {
    id: string;
    name: string;
    date: string;
    startTime?: string; // ISO string for start time
    endTime?: string; // ISO string for end time
    isEnded?: boolean; // Flag to indicate if event has ended
    attendees: string[]; // Array of person IDs
  }