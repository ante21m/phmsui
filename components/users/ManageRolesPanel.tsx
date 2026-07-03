'use client';
import {
  Stack,
  Group,
  Button,
  Checkbox,
  Text,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { User } from '@/store/services/usersApi';

const AVAILABLE_ROLES = [
  'admin',
  'pharmacist',
  'cashier',
  'store_manager',
  'viewer',
  'pharmacy-inventory-officer',
];

interface ManageRolesPanelProps {
  opened: boolean;
  onClose: () => void;
  user?: User | null;
  onSubmit: (roles: string[]) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function ManageRolesPanel({
  opened,
  onClose,
  user,
  onSubmit,
  isLoading,
  error,
}: ManageRolesPanelProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (opened && user) {
      setSelectedRoles(user.roles ?? []);
    }
  }, [opened, user]);

  const handleSubmit = async () => {
    await onSubmit(selectedRoles);
  };

  if (!opened) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        width: 420, maxWidth: '90vw',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          background: 'var(--teal-primary)', color: 'white',
          padding: '12px 16px',
        }}>
          <Text fw={500} size="md" c="white">Manage Roles</Text>
        </div>
        <div style={{ padding: 16 }}>
          <Stack gap="md">
            {user && (
              <Text size="sm" c="dimmed">
                Assign roles for{' '}
                <Text span fw={500} c="dark">
                  {user.firstName} {user.fatherName}
                </Text>
              </Text>
            )}

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <Checkbox.Group value={selectedRoles} onChange={setSelectedRoles}>
              <Stack gap={10}>
                {AVAILABLE_ROLES.map((role) => (
                  <Checkbox
                    key={role}
                    value={role}
                    label={role.replace('_', ' ')}
                    styles={{ label: { textTransform: 'capitalize' } }}
                  />
                ))}
              </Stack>
            </Checkbox.Group>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={isLoading} color="teal">
                Save Roles
              </Button>
            </Group>
          </Stack>
        </div>
      </div>
    </div>
  );
}
