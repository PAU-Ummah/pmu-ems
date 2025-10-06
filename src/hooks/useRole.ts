// src/hooks/useRole.ts
import { useAuth } from "@/context/AuthContext";

export const useRole = () => {
  const { userData } = useAuth();
  
  const hasRole = (role: string | string[]) => {
    if (!userData) return false;
    
    if (Array.isArray(role)) {
      return role.includes(userData.role);
    }
    
    return userData.role === role;
  };

  const canCreateEvents = () => hasRole('event-organizer');
  const canEditEvents = () => hasRole('event-organizer');
  const canEndEvents = () => hasRole('event-organizer');
  const canManagePeople = () => hasRole(['it', 'admin']);
  const canManageFinance = () => hasRole('finance-manager');
  const canViewReports = () => hasRole('admin');
  const canManageUsers = () => hasRole('it');
  const canRegisterUsers = () => hasRole('it');
  const canMarkAttendance = () => hasRole('registrar');

  return {
    userRole: userData?.role,
    hasRole,
    canCreateEvents,
    canEditEvents,
    canEndEvents,
    canManagePeople,
    canManageFinance,
    canViewReports,
    canManageUsers,
    canRegisterUsers,
    canMarkAttendance,
  };
};
