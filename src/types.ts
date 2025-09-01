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
    attendees: string[]; // Array of person IDs
  }