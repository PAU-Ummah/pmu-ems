"use client";
import NavigationDrawer from "@/components/Drawer";
import { Box, Typography } from "@mui/material";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SettingsPage() {

  return (
    <ProtectedRoute>
      <Box sx={{ display: 'flex' }}>
        <NavigationDrawer />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
          ml: { xs: 0, md: "56px" },
        }}
      >
        <Typography 
          variant="h4" 
          color="black" 
          gutterBottom 
          sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}
        >
          Settings
        </Typography>
        <Typography color="black">App settings will be displayed here.</Typography>
      </Box>
    </Box>
    </ProtectedRoute>
  );
}