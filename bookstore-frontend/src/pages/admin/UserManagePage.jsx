import React, { useState, useEffect } from 'react';
import {
  Button,
  DataTable,
  SearchInput,
  Select,
  EmptyState,
  ErrorState,
  ConfirmModal,
  StatusBadge,
  Modal,
  PageHeader,
  Badge,
} from '../../components/ui';
import { userApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

/**
 * UserManagePage Component
 * Manage system users: view, change role, lock/unlock
 */
const UserManagePage = () => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = {
          ...(searchTerm && { search: searchTerm }),
          ...(roleFilter !== 'all' && { role: roleFilter }),
          limit: 50,
        };
        const data = await userApi.getUsers(params);
        setUsers(Array.isArray(data) ? data : data?.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter]);

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;

    // Prevent self-demotion
    if (selectedUser.id === currentUser?.id && newRole !== 'ADMIN') {
      showToast('error', 'You cannot change your own role');
      return;
    }

    try {
      setUpdatingId(selectedUser.id);
      await userApi.updateUserRole(selectedUser.id, newRole);
      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ));
      showToast('success', 'User role updated');
      setRoleModalOpen(false);
    } catch (err) {
      showToast('error', err.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleLock = async (userId) => {
    // Prevent self-lock
    if (userId === currentUser?.id) {
      showToast('error', 'You cannot lock your own account');
      return;
    }

    try {
      setUpdatingId(userId);
      const user = users.find(u => u.id === userId);
      const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

      await userApi.updateUserStatus(userId, newStatus);
      setUsers(users.map(u =>
        u.id === userId ? { ...u, status: newStatus } : u
      ));
      showToast('success', user.status === 'ACTIVE' ? 'User locked' : 'User unlocked');
    } catch (err) {
      showToast('error', err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'full_name',
      render: (row) => (
        <div>
          <p className="font-medium text-body-sm text-ink dark:text-ink">
            {row.full_name}
          </p>
          <p className="text-label text-ink-muted dark:text-ink-muted">
            @{row.username}
          </p>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row) => (
        <p className="text-body-sm text-ink dark:text-ink">{row.email}</p>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => (
        <Badge variant={row.role === 'ADMIN' ? 'primary' : 'secondary'}>
          {row.role}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge type="user" value={row.status} />
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex gap-2">
          {row.id !== currentUser?.id && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedUser(row);
                  setNewRole(row.role);
                  setRoleModalOpen(true);
                }}
                disabled={updatingId === row.id}
              >
                Change Role
              </Button>
              <Button
                variant={row.status === 'ACTIVE' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleToggleLock(row.id)}
                loading={updatingId === row.id}
              >
                {row.status === 'ACTIVE' ? 'Lock' : 'Unlock'}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Users"
        subtitle="Manage system users and permissions"
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchInput
          placeholder="Search users..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Select
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'STAFF', label: 'Staff' },
            { value: 'CUSTOMER', label: 'Customer' },
          ]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <DataTable columns={columns} data={users} loading={loading} />
      )}

      {/* Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={`Change Role: ${selectedUser?.full_name}`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setRoleModalOpen(false)}
              disabled={updatingId === selectedUser?.id}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleChangeRole}
              loading={updatingId === selectedUser?.id}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {['ADMIN', 'STAFF', 'CUSTOMER'].map((role) => (
            <label
              key={role}
              className="flex items-start p-4 border-2 border-border rounded-button cursor-pointer hover:border-primary transition-colors dark:border-border"
              style={{ borderColor: newRole === role ? 'var(--color-primary)' : undefined }}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={newRole === role}
                onChange={(e) => setNewRole(e.target.value)}
                className="mt-1 accent-primary dark:accent-primary-light"
              />
              <div className="ml-3">
                <p className="font-semibold text-body-md text-ink dark:text-ink">
                  {role}
                </p>
                <p className="text-body-sm text-ink-muted dark:text-ink-muted mt-1">
                  {role === 'ADMIN' && 'Full access to all features'}
                  {role === 'STAFF' && 'Access to books, inventory, and orders'}
                  {role === 'CUSTOMER' && 'Standard customer access'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagePage;
