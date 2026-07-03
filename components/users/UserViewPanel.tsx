'use client';
import {
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Avatar,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import type { User } from '@/store/services/usersApi';

interface UserViewPanelProps {
  opened: boolean;
  onClose: () => void;
  user?: User | null;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Group justify="space-between" py={6} style={{ borderBottom: '0.5px solid var(--mantine-color-gray-2)' }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value || '—'}</Text>
    </Group>
  );
}

function initials(u: User) {
  return ((u.firstName?.[0] ?? '') + (u.fatherName?.[0] ?? '')).toUpperCase();
}

export function UserViewPanel({ opened, onClose, user }: UserViewPanelProps) {
  if (!user || !opened) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        width: 440, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 1, background: 'var(--teal-primary)',
          color: 'white', padding: '12px 16px',
        }}>
          <Text fw={500} size="md" c="white">User Details</Text>
        </div>
        <div style={{ padding: 16 }}>
          <Stack gap="md">
            <Group>
              <Avatar size={48} radius="xl" color="violet">
                {initials(user)}
              </Avatar>
              <div>
                <Text fw={500}>
                  {user.firstName} {user.fatherName}
                </Text>
                <Text size="xs" c="dimmed">
                  @{user.username}
                </Text>
              </div>
              <Badge
                ml="auto"
                color={user.isActive ? 'teal' : 'red'}
                variant="light"
              >
                {user.isActive ? 'active' : 'inactive'}
              </Badge>
            </Group>

            <Divider label="Contact" labelPosition="left" />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />

            <Divider label="Personal" labelPosition="left" />
            <InfoRow label="Organization ID" value={user.organizationId} />

            <Divider label="Roles" labelPosition="left" />
            <SimpleGrid cols={2} spacing={6}>
              {(user.roles ?? []).length > 0 ? (
                user.roles.map((r) => (
                  <Badge key={r} variant="light" color="violet" style={{ textTransform: 'capitalize' }}>
                    {r.replace('_', ' ')}
                  </Badge>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  No roles assigned
                </Text>
              )}
            </SimpleGrid>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={onClose}>
                Close
              </Button>
            </Group>
          </Stack>
        </div>
      </div>
    </div>
  );
}
