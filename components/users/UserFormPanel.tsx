'use client';
import {
  TextInput,
  PasswordInput,
  Grid,
  Stack,
  Group,
  Button,
  Divider,
  Text,
  Checkbox,
  Alert,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect } from 'react';
import type { CreateUserPayload } from '@/store/services/usersApi';

const AVAILABLE_ROLES = [
  'admin',
  'pharmacist',
  'cashier',
  'store_manager',
  'viewer',
];

interface UserFormPanelProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: CreateUserPayload) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function UserFormPanel({
  opened,
  onClose,
  onSubmit,
  isLoading,
  error,
}: UserFormPanelProps) {
  const form = useForm<CreateUserPayload>({
    initialValues: {
      firstName: '',
      fatherName: '',
      grandFatherName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      username: '',
      password: '',
      companyId: '',
      roles: [],
    },
    validate: {
      firstName: (v) => (!v.trim() ? 'First name is required' : null),
      fatherName: (v) => (!v.trim() ? "Father's name is required" : null),
      email: (v) => (!/^\S+@\S+$/.test(v) ? 'Valid email is required' : null),
      username: (v) => (!v.trim() ? 'Username is required' : null),
      password: (v) => (!v ? 'Password is required' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
    }
  }, [opened]);

  const handleSubmit = form.onSubmit(async (values) => {
    await onSubmit(values);
  });

  if (!opened) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        width: 500, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 1, background: 'var(--teal-primary)',
          color: 'white', padding: '12px 16px',
        }}>
          <Text fw={500} size="md" c="white">New User</Text>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          <Stack gap="sm">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <Divider label="Personal information" labelPosition="left" />

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="First name"
                  placeholder="First name"
                  withAsterisk
                  {...form.getInputProps('firstName')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Father's name"
                  placeholder="Father's name"
                  withAsterisk
                  {...form.getInputProps('fatherName')}
                />
              </Grid.Col>
            </Grid>

            <TextInput
              label="Grandfather's name"
              placeholder="Grandfather's name"
              {...form.getInputProps('grandFatherName')}
            />

            <DatePickerInput
              label="Date of birth"
              placeholder="Pick a date"
              value={form.values.dateOfBirth ? new Date(form.values.dateOfBirth) : null}
              onChange={(date) =>
                form.setFieldValue('dateOfBirth', date ? date.toISOString() : '')
              }
              clearable
            />

            <Divider label="Contact" labelPosition="left" />

            <TextInput
              label="Email"
              placeholder="email@example.com"
              withAsterisk
              {...form.getInputProps('email')}
            />

            <TextInput
              label="Phone"
              placeholder="+251..."
              {...form.getInputProps('phone')}
            />

            <Divider label="Account" labelPosition="left" />

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <TextInput
                  label="Username"
                  placeholder="username"
                  withAsterisk
                  {...form.getInputProps('username')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Company ID"
                  placeholder="Company ID"
                  {...form.getInputProps('companyId')}
                />
              </Grid.Col>
            </Grid>

            <PasswordInput
              label="Password"
              placeholder="Password"
              withAsterisk
              {...form.getInputProps('password')}
            />

            <Divider label="Roles" labelPosition="left" />

            <Checkbox.Group
              value={form.values.roles}
              onChange={(val) => form.setFieldValue('roles', val)}
            >
              <Stack gap={8}>
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
              <Button type="submit" loading={isLoading} color="teal">
                Save User
              </Button>
            </Group>
          </Stack>
        </form>
      </div>
    </div>
  );
}
