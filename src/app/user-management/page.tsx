'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import RoleGuard from '@/components/RoleGuard';
import { User } from '@/types';
import NavigationDrawer from '@/components/Drawer';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface UserRegistrationForm {
  email: string;
  password: string;
  role: User['role'];
  displayName: string;
}

export default function UserManagementPage() {
  const { canManageUsers } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<UserRegistrationForm>({
    email: '',
    password: '',
    role: 'event-organizer',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'User registered successfully! A password reset email has been sent to the user.' 
        });
        setFormData({
          email: '',
          password: '',
          role: 'event-organizer',
          displayName: '',
        });
        setOpen(false);
        fetchUsers(); // Refresh the users list
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to register user' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (role: User['role']) => {
    setFormData(prev => ({
      ...prev,
      role,
    }));
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'error';
      case 'it': return 'info';
      case 'finance-manager': return 'warning';
      case 'event-organizer': return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'it': return 'IT';
      case 'finance-manager': return 'Finance Manager';
      case 'event-organizer': return 'Event Organizer';
      default: return role;
    }
  };

  if (!canManageUsers()) {
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
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="h6">Access Denied</Typography>
              <Typography>You don't have permission to access user management.</Typography>
            </Alert>
          </Box>
        </Box>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles="it">
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
              User Management
            </Typography>

            {message && (
              <Alert 
                severity={message.type} 
                sx={{ mb: 2 }}
                onClose={() => setMessage(null)}
              >
                {message.text}
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setOpen(true)}
              sx={{
                mb: 3,
                backgroundColor: "#144404",
                "&:hover": { backgroundColor: "#0d3002" },
                width: { xs: "100%", sm: "auto" }
              }}
            >
              Register New User
            </Button>

            <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 650 }} size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell>Email</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Display Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>User ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        {user.displayName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {user.id}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Dialog
              open={open}
              onClose={() => {
                setOpen(false);
                setMessage(null);
                setFormData({
                  email: '',
                  password: '',
                  role: 'event-organizer',
                  displayName: '',
                });
              }}
              fullWidth
              maxWidth="sm"
              fullScreen={isMobile}
            >
              <DialogTitle>Register New User</DialogTitle>
              <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                  <TextField
                    name="email"
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    size="small"
                    required
                  />
                  
                  <TextField
                    name="password"
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    size="small"
                    required
                    inputProps={{ minLength: 6 }}
                    helperText="Minimum 6 characters"
                  />
                  
                  <TextField
                    name="displayName"
                    label="Display Name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    size="small"
                    placeholder="Optional"
                  />
                  
                  <FormControl fullWidth margin="normal" size="small">
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value as User['role'])}
                      label="Role"
                    >
                      <MenuItem value="event-organizer">Event Organizer</MenuItem>
                      <MenuItem value="it">IT</MenuItem>
                      <MenuItem value="finance-manager">Finance Manager</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      📧 Email Notification
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      After registration, a password reset email will be automatically sent to the user. 
                      They can use this email to set their own password and log in.
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Role Descriptions:</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Event Organizer:</strong> Create, edit, and manage events
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>IT:</strong> Manage people records and register users
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Finance Manager:</strong> Manage invoices and financial data
                    </Typography>
                    <Typography variant="body2">
                      <strong>Admin:</strong> View comprehensive reports and access all data
                    </Typography>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => {
                  setOpen(false);
                  setMessage(null);
                  setFormData({
                    email: '',
                    password: '',
                    role: 'event-organizer',
                    displayName: '',
                  });
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !formData.email || !formData.password}
                  sx={{ backgroundColor: "#144404", color: "white" }}
                >
                  {loading ? 'Registering...' : 'Register User'}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </RoleGuard>
    </ProtectedRoute>
  );
}
