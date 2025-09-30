// src/utils/userManagement.ts
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { User } from "@/types";

export const createUserDocument = async (userId: string, userData: Partial<User>) => {
  try {
    await setDoc(doc(db, "users", userId), {
      id: userId,
      role: "event-organizer", // Default role
      ...userData,
    });
    // eslint-disable-next-line no-console
    console.log("User document created successfully");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating user document:", error);
    throw error;
  }
};

export const updateUserRole = async (userId: string, role: User['role']) => {
  try {
    await setDoc(doc(db, "users", userId), {
      role,
    }, { merge: true });
    // eslint-disable-next-line no-console
    console.log("User role updated successfully");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating user role:", error);
    throw error;
  }
};

// Helper function to get role permissions
export const getRolePermissions = (role: User['role']) => {
  const permissions = {
    'event-organizer': {
      canCreateEvents: true,
      canEditEvents: true,
      canEndEvents: true,
      canManagePeople: false,
      canManageFinance: false,
      canViewReports: false,
    },
    'it': {
      canCreateEvents: false,
      canEditEvents: false,
      canEndEvents: false,
      canManagePeople: true,
      canManageFinance: false,
      canViewReports: false,
    },
    'finance-manager': {
      canCreateEvents: false,
      canEditEvents: false,
      canEndEvents: false,
      canManagePeople: false,
      canManageFinance: true,
      canViewReports: false,
    },
    'admin': {
      canCreateEvents: false,
      canEditEvents: false,
      canEndEvents: false,
      canManagePeople: false,
      canManageFinance: false,
      canViewReports: true,
    },
  };

  return permissions[role];
};
