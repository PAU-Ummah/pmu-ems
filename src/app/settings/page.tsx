"use client";
import { useState } from "react";
import NavigationDrawer from "@/components/Drawer";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import { Person, Email, Security, Refresh } from "@mui/icons-material";

export default function SettingsPage() {
  const { userData } = useAuth();
  const { userRole } = useRole();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'it': return 'info';
      case 'finance-manager': return 'warning';
      case 'event-organizer': return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'it': return 'IT';
      case 'finance-manager': return 'Finance Manager';
      case 'event-organizer': return 'Event Organizer';
      default: return role;
    }
  };

  const handlePasswordReset = async () => {
    if (!userData?.email) {
      setMessage({ type: 'error', text: 'No email address found for your account.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Password reset email sent! Please check your inbox and follow the instructions to reset your password.' 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send password reset email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

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

          {message && (
            <Alert 
              severity={message.type} 
              sx={{ mb: 3 }}
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
            {/* User Information Card */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Person sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Account Information</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="Email Address"
                    value={userData?.email || ''}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                  
                  <TextField
                    label="Display Name"
                    value={userData?.displayName || 'Not set'}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Role:
                    </Typography>
                    <Chip
                      label={getRoleLabel(userRole || '')}
                      color={getRoleColor(userRole || '')}
                      size="small"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Security sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Security</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Change your password or update your security settings.
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handlePasswordReset}
                  disabled={loading}
                  sx={{
                    borderColor: '#144404',
                    color: '#144404',
                    '&:hover': {
                      borderColor: '#0d3002',
                      backgroundColor: 'rgba(20, 68, 4, 0.04)'
                    }
                  }}
                >
                  {loading ? 'Sending...' : 'Request Password Reset'}
                </Button>
                
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  A password reset link will be sent to your email address.
                </Typography>
              </CardContent>
            </Card>

            {/* App Information Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Application Information
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Application Name:
                    </Typography>
                    <Typography variant="body2">
                      PAU Muslim Ummah EMS
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Version:
                    </Typography>
                    <Typography variant="body2">
                      1.0.0
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      User ID:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {userData?.id || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}