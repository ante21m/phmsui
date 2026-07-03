'use client';
import { useState, useMemo } from 'react';
import { Badge, Avatar } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconShield, IconBan, IconCheck } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { EntityForm, type FieldConfig, EntityTable, type Column } from '@/components';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserRolesMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
  type User,
  type CreateUserPayload,
} from '@/store/services/usersApi';
import { ManageRolesPanel } from '@/components/users/ManageRolesPanel';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'pharmacy-inventory-officer', label: 'Pharmacy Inventory Officer' },
];

const formFields: FieldConfig[] = [
  { name: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'First name', span: 6 },
  { name: 'fatherName', label: "Father's Name", type: 'text', required: true, placeholder: "Father's name", span: 6 },
  { name: 'grandFatherName', label: "Grandfather's Name", type: 'text', placeholder: "Grandfather's name", span: 6 },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', span: 6 },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'email@example.com', span: 6 },
  { name: 'phone', label: 'Phone', type: 'text', placeholder: '+251...', span: 6 },
  { name: 'username', label: 'Username', type: 'text', required: true, placeholder: 'username', span: 6 },
  { name: 'companyId', label: 'Company ID', type: 'text', placeholder: 'Company ID', span: 6 },
  { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Password', span: 6 },
  { name: 'roles', label: 'Roles', type: 'multiselect', options: roleOptions, span: 12 },
];

function initials(u: User) {
  return ((u.firstName?.[0] ?? '') + (u.fatherName?.[0] ?? '')).toUpperCase();
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [rolesPanelUser, setRolesPanelUser] = useState<User | null>(null);

  const { data, isLoading, isError } = useGetUsersQuery({ page, perPage, search: debouncedSearch });

  const [createUser] = useCreateUserMutation();
  const [updateRoles, { isLoading: updatingRoles }] = useUpdateUserRolesMutation();
  const [deactivateUser] = useDeactivateUserMutation();
  const [activateUser] = useActivateUserMutation();

  const handleSave = async (values: Record<string, any>) => {
    try {
      const payload: CreateUserPayload = {
        firstName: values.firstName.trim(),
        fatherName: values.fatherName.trim(),
        grandFatherName: values.grandFatherName || undefined,
        email: values.email.trim(),
        phone: values.phone || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        username: values.username.trim(),
        password: values.password,
        companyId: values.companyId || undefined,
        roles: values.roles,
      };
      await createUser(payload).unwrap();
      toast.success('User created successfully');
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Something went wrong';
      toast.error(msg);
    }
  };

  const handleRolesSave = async (roles: string[]) => {
    if (!rolesPanelUser) return;
    try {
      await updateRoles({ id: rolesPanelUser.id, body: { roles } }).unwrap();
      toast.success('Roles updated successfully');
      setRolesPanelUser(null);
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message ?? 'Failed to update roles');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      if (user.isActive) { await deactivateUser(user.id).unwrap(); toast.success(`${user.firstName} deactivated`); }
      else { await activateUser(user.id).unwrap(); toast.success(`${user.firstName} activated`); }
    } catch { toast.error('Status update failed'); }
  };

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns = useMemo<Column<User>[]>(() => [
    {
      key: 'name', label: 'Name', sortable: true,
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={28} radius="xl" color="violet">{initials(u)}</Avatar>
          <span>{u.firstName} {u.fatherName}</span>
        </div>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'username', label: 'Username', sortable: true },
    { key: 'roles', label: 'Roles', render: (u) => <span style={{ textTransform: 'capitalize' }}>{(u.roles ?? []).join(', ') || '—'}</span> },
    { key: 'isActive', label: 'Status', sortable: true, render: (u) => <Badge color={u.isActive ? 'teal' : 'red'} variant="light" size="sm">{u.isActive ? 'active' : 'inactive'}</Badge> },
    {
      key: 'actions', label: '', align: 'center',
      render: (u) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          <button title="Manage Roles" onClick={() => setRolesPanelUser(u)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: 'var(--radius-sm, 4px)', background: 'var(--teal-primary, #00897b)', color: 'white', cursor: 'pointer', fontSize: 15 }}>
            <IconShield size={15} />
          </button>
          <button title={u.isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(u)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: 'var(--radius-sm, 4px)', background: u.isActive ? 'var(--red-btn, #e53935)' : 'var(--teal-primary, #00897b)', color: 'white', cursor: 'pointer', fontSize: 15 }}>
            {u.isActive ? <IconBan size={15} /> : <IconCheck size={15} />}
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div>
      {formOpen && (
        <EntityForm
          entityName="User"
          fields={formFields}
          onSubmit={handleSave}
          onCancel={() => setFormOpen(false)}
          submitLabel="Save User"
        />
      )}

      <EntityTable
        title="Users" columns={columns} data={users} loading={isLoading}
        page={page} total={total} pageSize={perPage} searchValue={search}
        onPageChange={setPage} onPageSizeChange={(s) => { setPerPage(s); setPage(1); }}
        onSearchChange={(s) => { setSearch(s); setPage(1); }}
        onAdd={() => setFormOpen(true)} addLabel="New"
        rowKey={(u) => u.id}
        emptyMessage={isError ? 'Failed to load users.' : 'No users found.'}
      />

      <ManageRolesPanel
        opened={!!rolesPanelUser} onClose={() => setRolesPanelUser(null)}
        user={rolesPanelUser} onSubmit={handleRolesSave} isLoading={updatingRoles} error={null}
      />
    </div>
  );
}
