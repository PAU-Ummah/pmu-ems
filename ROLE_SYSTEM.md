# Role-Based Access Control System

This document describes the role-based access control (RBAC) system implemented in the PMU EMS application.

## User Roles

The system supports five distinct user roles:

### 1. Event Organizer (`event-organizer`)
**Permissions:**
- Create new events
- Edit existing events (only if not ended)
- End events
- View events and attendees

**Access:**
- Events page (full access)
- Can create, edit, and end events
- Cannot manage event attendance (removed from this role)

### 2. IT (`it`)
**Permissions:**
- Add new people to the system
- Edit existing people records
- Delete people from the system
- Upload Excel files to bulk import people
- Register new users with specific roles
- Manage user accounts and role assignments

**Access:**
- People page (full access)
- User Management page (full access)
- Can manage all people-related operations
- Can register new users and assign roles

### 3. Finance Manager (`finance-manager`)
**Permissions:**
- Add invoices to events
- Edit existing invoices
- Delete invoices
- Attach spending amounts to events
- View financial data

**Access:**
- Finance page (full access)
- Can manage all financial operations

### 4. Admin (`admin`)
**Permissions:**
- View comprehensive reports
- Access to all event data including:
  - Event name
  - Number of attendees
  - Amount spent
  - Start and end times
  - Detailed attendee lists

**Access:**
- Reports page (full access)
- Can view all system data

### 5. Registrar (`registrar`)
**Permissions:**
- Mark attendance for events
- View events starting within 1 hour
- Access to people data for attendance marking

**Access:**
- Attendance page (full access)
- Can only see events that start within 1 hour
- Can mark attendance for people attending events
- Time-based visibility: Events appear 1 hour before start time

**Concurrent Access Features:**
- Multiple registrars can mark attendance simultaneously for different people
- Real-time updates when other registrars make changes
- Safe array operations using Firestore's arrayUnion/arrayRemove
- Error handling and user feedback

## Implementation Details

### Authentication Context
- Extended to include user role data from Firestore
- Automatically fetches user role on authentication
- Provides role information throughout the application

### Role Guard Component
- Wraps components that require specific roles
- Shows access denied message for unauthorized users
- Supports single role or multiple roles

### Navigation
- Dynamic navigation based on user role
- Only shows menu items the user has access to
- Role-based menu filtering

### Database Structure

#### Users Collection
```typescript
{
  id: string;
  email: string;
  role: 'event-organizer' | 'it' | 'finance-manager' | 'admin' | 'registrar';
  displayName?: string;
}
```

#### Events Collection (Updated)
```typescript
{
  id: string;
  name: string;
  date: string;
  startTime?: string;
  endTime?: string;
  isEnded?: boolean;
  attendees: string[];
  amountSpent?: number; // New field for financial tracking
}
```

#### Invoices Collection (New)
```typescript
{
  id?: string;
  eventId: string;
  amount: number;
  description: string;
  date: string;
  attachmentUrl?: string;
  createdBy: string;
}
```

## Usage Examples

### Using Role Guard
```tsx
<RoleGuard allowedRoles="event-organizer">
  <Button>Create Event</Button>
</RoleGuard>

<RoleGuard allowedRoles={["admin", "finance-manager"]}>
  <FinancialReport />
</RoleGuard>
```

### Using Role Hook
```tsx
const { canCreateEvents, canManagePeople, userRole } = useRole();

if (canCreateEvents()) {
  // Show create event button
}
```

## Setting Up User Roles

### Manual Setup
1. Create a user document in Firestore under the `users` collection
2. Set the `role` field to one of the supported roles
3. The user will automatically have the appropriate permissions

### Using Utility Functions
```typescript
import { createUserDocument, updateUserRole } from '@/utils/userManagement';

// Create user with specific role
await createUserDocument(userId, {
  email: 'user@example.com',
  role: 'admin',
  displayName: 'Admin User'
});

// Update existing user role
await updateUserRole(userId, 'finance-manager');
```

## Security Considerations

1. **Client-side Protection**: Role checks are implemented on the client side for UI/UX purposes
2. **Server-side Validation**: For production, implement server-side role validation
3. **Firestore Rules**: Configure Firestore security rules to enforce role-based access
4. **Default Role**: New users default to `event-organizer` role

## Technical Improvements

### Attendance System Enhancements
The attendance marking system has been optimized for concurrent access:

1. **Safe Array Operations**: Uses `arrayUnion()` and `arrayRemove()` for concurrent-safe modifications
2. **Real-time Listeners**: Implements `onSnapshot()` for live updates when other users make changes
3. **Error Handling**: Comprehensive error handling with user feedback
4. **Loading States**: UI feedback during database operations
5. **Mobile Responsive**: Optimized for both desktop and mobile devices

### Benefits
- **Concurrent Safety**: Multiple registrars can mark attendance simultaneously for different people
- **Real-time Updates**: Changes made by other registrars are immediately visible
- **Efficient Operations**: Simple array operations are fast and reliable
- **User Experience**: Clear feedback and loading states improve usability

## Future Enhancements

1. **Super Admin Role**: Add a super admin role with all permissions
2. **Custom Permissions**: Allow custom permission combinations
3. **Role Hierarchy**: Implement role inheritance
4. **Audit Logging**: Track role changes and access attempts
5. **Bulk Role Management**: Admin interface for managing user roles

## Testing Roles

To test different roles:
1. Create user documents in Firestore with different roles
2. Log in with different user accounts
3. Verify that only appropriate features are accessible
4. Check that navigation shows only relevant menu items
