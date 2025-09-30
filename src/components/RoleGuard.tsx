// src/components/RoleGuard.tsx
import { ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import { Box, Typography, Alert } from "@mui/material";

interface RoleGuardProps {
  allowedRoles: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { hasRole } = useRole();
  
  if (!hasRole(allowedRoles)) {
    return fallback || (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            You don't have permission to access this feature. 
            Required role(s): {Array.isArray(allowedRoles) ? allowedRoles.join(", ") : allowedRoles}
          </Typography>
        </Alert>
      </Box>
    );
  }
  
  return <>{children}</>;
}
