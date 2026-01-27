'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import RoleGuard from '@/components/auth/RoleGuard';
import { User } from '@/types';
import { PersonAdd } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import Badge from '@/components/ui/badge/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RegisterUserForm from './_component/RegisterUserForm';

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

  const getRoleColor = (role: User['role']): 'primary' | 'success' | 'error' | 'warning' | 'info' => {
    switch (role) {
      case 'admin': return 'error';
      case 'it': return 'info';
      case 'finance-manager': return 'warning';
      case 'event-organizer': return 'success';
      default: return 'primary';
    }
  };

  const getRoleLabel = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'it': return 'IT';
      case 'finance-manager': return 'Finance Manager';
      case 'event-organizer': return 'Event Organizer';
      case 'registrar': return 'Registrar';
      default: return role;
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setMessage(null);
    setFormData({
      email: '',
      password: '',
      role: 'event-organizer',
      displayName: '',
    });
  };

  if (!canManageUsers()) {
    return (
      <div className="w-full">
        <Alert
          variant="error"
          title="Access Denied"
          message="You don't have permission to access user management."
        />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['it', 'admin']}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          User Management
        </h1>

        {message && (
          <div className="mb-6">
            <Alert
              variant={message.type}
              title={message.type === 'success' ? 'Success' : 'Error'}
              message={message.text}
            />
          </div>
        )}

        <div className="mb-6">
          <Button
            variant="primary"
            startIcon={<PersonAdd />}
            onClick={() => setOpen(true)}
            className="w-full sm:w-auto"
          >
            Register New User
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[650px]">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Email
                    </TableCell>
                    <TableCell
                      isHeader
                      className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 sm:table-cell"
                    >
                      Display Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Role
                    </TableCell>
                    <TableCell
                      isHeader
                      className="hidden text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90 md:table-cell"
                    >
                      User ID
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                    >
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                        {user.email}
                      </TableCell>
                      <TableCell className="hidden px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400 sm:table-cell">
                        {user.displayName || 'N/A'}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          color={getRoleColor(user.role)}
                          variant="light"
                          size="sm"
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-5 py-4 text-start font-mono text-xs text-gray-600 dark:text-gray-400 md:table-cell">
                        {user.id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <RegisterUserForm
          isOpen={open}
          onClose={handleCloseModal}
          formData={formData}
          onInputChange={handleInputChange}
          onRoleChange={handleRoleChange}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </RoleGuard>
  );
}
