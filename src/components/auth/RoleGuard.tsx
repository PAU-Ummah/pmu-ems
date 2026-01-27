// src/components/RoleGuard.tsx
import { ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import Alert from "../ui/alert/Alert";

interface RoleGuardProps {
  allowedRoles: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { hasRole } = useRole();
  
  if (!hasRole(allowedRoles)) {
    return fallback || (
      <div className="p-6">
        <Alert 
          variant="error" 
          title="Access Denied"
          message={`You don't have permission to access this feature. Required role(s): ${Array.isArray(allowedRoles) ? allowedRoles.join(", ") : allowedRoles}`}
        />
      </div>
    );
  }
  
  return <>{children}</>;
}
