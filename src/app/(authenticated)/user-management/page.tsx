'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/context/AuthContext';
import RoleGuard from '@/components/auth/RoleGuard';
import { User } from '@/services/types';
import { DeleteOutline, PersonAdd, SaveOutlined } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { updateUserRole } from '@/utils/userManagement';
import Button from '@/components/ui/button/Button';
import Alert from '@/components/ui/alert/Alert';
import Badge from '@/components/ui/badge/Badge';
import ComponentCard from '@/components/common/ComponentCard';
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
  const { user: currentUser, logout } = useAuth();
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
  const [roleDrafts, setRoleDrafts] = useState<Record<string, User['role']>>({});
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      querySnapshot.forEach((userDoc) => {
        usersData.push({ id: userDoc.id, ...userDoc.data() } as User);
      });
      setUsers(usersData);
      setRoleDrafts((previousRoleDrafts) => {
        const nextRoleDrafts: Record<string, User['role']> = {};
        usersData.forEach((listedUser) => {
          nextRoleDrafts[listedUser.id] = previousRoleDrafts[listedUser.id] ?? listedUser.role;
        });
        return nextRoleDrafts;
      });
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
        setMessage({ type: 'error', text: result.error ?? 'Failed to register user' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
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

  const handleRoleDraftChange = (userId: string, role: User['role']) => {
    setRoleDrafts((previousRoleDrafts) => ({
      ...previousRoleDrafts,
      [userId]: role,
    }));
  };

  const handleRoleUpdate = async (selectedUser: User) => {
    const selectedRole = roleDrafts[selectedUser.id] ?? selectedUser.role;
    if (selectedRole === selectedUser.role) {
      return;
    }

    setUpdatingRoleUserId(selectedUser.id);
    setMessage(null);
    try {
      await updateUserRole(selectedUser.id, selectedRole);
      setUsers((previousUsers) =>
        previousUsers.map((listedUser) =>
          listedUser.id === selectedUser.id ? { ...listedUser, role: selectedRole } : listedUser
        )
      );
      setMessage({
        type: 'success',
        text: `Updated role for ${selectedUser.email}.`,
      });
    } catch {
      setMessage({
        type: 'error',
        text: `Failed to update role for ${selectedUser.email}.`,
      });
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleDeleteUser = async (selectedUser: User) => {
    if (selectedUser.id === currentUser?.uid) {
      setMessage({
        type: 'error',
        text: 'You cannot delete your own user account.',
      });
      return;
    }

    const shouldDeleteUser = window.confirm(
      `Delete ${selectedUser.email}? This will remove the user record from User Management.`
    );
    if (!shouldDeleteUser) {
      return;
    }

    setDeletingUserId(selectedUser.id);
    setMessage(null);
    try {
      const idToken = await currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Missing auth token');
      }

      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Failed to delete user');
      }

      setUsers((previousUsers) => previousUsers.filter((listedUser) => listedUser.id !== selectedUser.id));
      setRoleDrafts((previousRoleDrafts) => {
        const { [selectedUser.id]: removedRoleDraft, ...remainingRoleDrafts } = previousRoleDrafts;
        void removedRoleDraft;
        return remainingRoleDrafts;
      });
      setMessage({
        type: 'success',
        text: result.message ?? `Deleted ${selectedUser.email}.`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('auth/id-token-expired')) {
        await logout();
      }
      setMessage({
        type: 'error',
        text: `Failed to delete ${selectedUser.email}. Please try again.`,
      });
    } finally {
      setDeletingUserId(null);
    }
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {users.map((listedUser) => (
            <ComponentCard
              key={listedUser.id}
              title={listedUser.email}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Display Name</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {listedUser.displayName ?? 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
                  <Badge
                    color={getRoleColor(listedUser.role)}
                    variant="light"
                    size="sm"
                  >
                    {getRoleLabel(listedUser.role)}
                  </Badge>
                </div>
                <div>
                  <label
                    htmlFor={`role-${listedUser.id}`}
                    className="mb-1 block text-sm text-gray-500 dark:text-gray-400"
                  >
                    Edit Role
                  </label>
                  <select
                    id={`role-${listedUser.id}`}
                    value={roleDrafts[listedUser.id] ?? listedUser.role}
                    onChange={(event) =>
                      handleRoleDraftChange(listedUser.id, event.target.value as User['role'])
                    }
                    disabled={updatingRoleUserId === listedUser.id}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="event-organizer">Event Organizer</option>
                    <option value="it">IT</option>
                    <option value="finance-manager">Finance Manager</option>
                    <option value="admin">Admin</option>
                    <option value="registrar">Registrar</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleRoleUpdate(listedUser)}
                    disabled={
                      (roleDrafts[listedUser.id] ?? listedUser.role) === listedUser.role ||
                      updatingRoleUserId === listedUser.id
                    }
                  >
                    {updatingRoleUserId === listedUser.id ? 'Saving...' : 'Save Role'}
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => handleDeleteUser(listedUser)}
                    disabled={deletingUserId === listedUser.id || listedUser.id === currentUser?.uid}
                  >
                    {deletingUserId === listedUser.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">User ID</span>
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all text-right max-w-[60%]">
                    {listedUser.id}
                  </span>
                </div>
              </div>
            </ComponentCard>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
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
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
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
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      User ID
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map((listedUser) => (
                    <TableRow
                      key={listedUser.id}
                      className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                    >
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                        {listedUser.email}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {listedUser.displayName ?? 'N/A'}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          color={getRoleColor(listedUser.role)}
                          variant="light"
                          size="sm"
                        >
                          {getRoleLabel(listedUser.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start font-mono text-xs text-gray-600 dark:text-gray-400">
                        {listedUser.id}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={roleDrafts[listedUser.id] ?? listedUser.role}
                            onChange={(event) =>
                              handleRoleDraftChange(listedUser.id, event.target.value as User['role'])
                            }
                            disabled={updatingRoleUserId === listedUser.id}
                            className="h-9 min-w-[170px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          >
                            <option value="event-organizer">Event Organizer</option>
                            <option value="it">IT</option>
                            <option value="finance-manager">Finance Manager</option>
                            <option value="admin">Admin</option>
                            <option value="registrar">Registrar</option>
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            startIcon={<SaveOutlined fontSize="small" />}
                            onClick={() => handleRoleUpdate(listedUser)}
                            disabled={
                              (roleDrafts[listedUser.id] ?? listedUser.role) === listedUser.role ||
                              updatingRoleUserId === listedUser.id
                            }
                          >
                            {updatingRoleUserId === listedUser.id ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            startIcon={<DeleteOutline fontSize="small" />}
                            onClick={() => handleDeleteUser(listedUser)}
                            disabled={deletingUserId === listedUser.id || listedUser.id === currentUser?.uid}
                          >
                            {deletingUserId === listedUser.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
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
