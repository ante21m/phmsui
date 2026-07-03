'use client';
import {
  Box, TextInput, NumberInput, Textarea, Checkbox, Select, MultiSelect,
  PasswordInput, Grid, Group, Button, Text, Alert, Badge, Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useMemo, useRef } from 'react';

type FieldType =
  | 'text' | 'email' | 'url' | 'password' | 'number'
  | 'textarea' | 'checkbox' | 'select' | 'multiselect' | 'date';

interface SelectOption {
  value: string;
  label: string;
}

export interface FieldConfig<T extends Record<string, any> = Record<string, any>> {
  name: keyof T & string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  validate?: (value: any, values: T) => string | null;
  options?: SelectOption[];
  span?: number;
  showWhen?: (values: T) => boolean;
  min?: number;
  max?: number;
  rows?: number;
  hint?: string;
  disabled?: boolean | ((values: T) => boolean);
  searchable?: boolean;
  render?: (form: ReturnType<typeof useForm<T>>) => React.ReactNode;
}

export interface FieldSection<T extends Record<string, any> = Record<string, any>> {
  title?: string;
  fields: FieldConfig<T>[];
}

interface EntityFormProps<T extends Record<string, any> = Record<string, any>> {
  entityName: string;
  entity?: T | null;
  fields: FieldConfig<T>[] | FieldSection<T>[];
  onSubmit: (values: T) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  accentColor?: string;
  submitLabel?: string;
  columns?: number;
  children?: React.ReactNode;
  formRef?: React.MutableRefObject<any>;
}

function isSectionArray<T extends Record<string, any>>(
  fields: FieldConfig<T>[] | FieldSection<T>[],
): fields is FieldSection<T>[] {
  return fields.length > 0 && 'fields' in fields[0];
}

function normalizeToSections<T extends Record<string, any>>(
  fields: FieldConfig<T>[] | FieldSection<T>[],
): FieldSection<T>[] {
  if (isSectionArray(fields)) return fields;
  return [{ fields: fields as FieldConfig<T>[] }];
}

function buildInitialValues<T extends Record<string, any>>(
  sections: FieldSection<T>[],
  entity: T | null | undefined,
): T {
  const defaults: Record<string, unknown> = {};
  for (const section of sections) {
    for (const f of section.fields) {
      if (entity && f.name in entity) {
        defaults[f.name] = entity[f.name];
      } else {
        switch (f.type) {
          case 'checkbox': defaults[f.name] = false; break;
          case 'number': defaults[f.name] = null; break;
          case 'multiselect': defaults[f.name] = []; break;
          default: defaults[f.name] = '';
        }
      }
    }
  }
  return defaults as T;
}

function buildValidators<T extends Record<string, any>>(sections: FieldSection<T>[]) {
  const validators: Record<string, (v: any, vals: T) => string | null> = {};
  for (const section of sections) {
    for (const f of section.fields) {
      validators[f.name] = (value, values) => {
        if (f.required) {
          const isEmpty =
            value === null || value === undefined || value === '' ||
            (Array.isArray(value) && value.length === 0);
          if (isEmpty) return `${f.label} is required`;
        }
        if (f.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          return 'Enter a valid email address';
        }
        if (f.type === 'url' && value) {
          try { new URL(String(value)); } catch { return 'Enter a valid URL'; }
        }
        if (f.validate) return f.validate(value, values);
        return null;
      };
    }
  }
  return validators;
}

function RenderField<T extends Record<string, any> = Record<string, any>>({
  field,
  form,
  accentColor,
}: {
  field: FieldConfig<T>;
  form: ReturnType<typeof useForm<T>>;
  accentColor: string;
}) {
  const values = form.values;
  const isDisabled =
    typeof field.disabled === 'function' ? field.disabled(values) : (field.disabled ?? false);

  if (field.showWhen && !field.showWhen(values)) return null;

  const labelNode = (
    <Text size="sm" fw={500} component="span">
      {field.label}
      {field.required && <Text span c="red" ml={2}>*</Text>}
    </Text>
  );

  const description = field.hint ? (
    <Text size="xs" c="dimmed" mt={2}>{field.hint}</Text>
  ) : undefined;

  const inputProps = { styles: { input: { paddingLeft: 12, paddingRight: 12 } } };

  if (field.render) return field.render(form);

  switch (field.type) {
    case 'text':
    case 'email':
    case 'url':
      return (
        <TextInput
          label={labelNode} placeholder={field.placeholder} description={description}
          disabled={isDisabled} {...inputProps} {...form.getInputProps(field.name)}
        />
      );

    case 'password':
      return (
        <PasswordInput
          label={labelNode} placeholder={field.placeholder} description={description}
          disabled={isDisabled} {...inputProps} {...form.getInputProps(field.name)}
        />
      );

    case 'number':
      return (
        <NumberInput
          label={labelNode} placeholder={field.placeholder} description={description}
          min={field.min} max={field.max} allowDecimal={false}
          disabled={isDisabled}
          value={(form.values[field.name] as number | null) ?? ''}
          onChange={(val) => form.setFieldValue(field.name, (val === '' ? null : Number(val)) as T[keyof T])}
          error={form.errors[field.name]}
        />
      );

    case 'textarea':
      return (
        <Textarea
          label={labelNode} placeholder={field.placeholder} description={description}
          minRows={field.rows ?? 3} autosize
          disabled={isDisabled} {...inputProps} {...form.getInputProps(field.name)}
        />
      );

    case 'checkbox':
      return (
        <Checkbox
          label={labelNode} description={description} mt="sm"
          disabled={isDisabled}
          checked={Boolean(form.values[field.name])}
          onChange={(e) => form.setFieldValue(field.name, e.currentTarget.checked as T[keyof T])}
          error={form.errors[field.name]}
        />
      );

    case 'select':
      return (
        <Select
          label={labelNode} placeholder={field.placeholder ?? 'Pick one'} description={description}
          data={field.options ?? []} disabled={isDisabled} clearable
          searchable={field.searchable}
          {...form.getInputProps(field.name)}
        />
      );

    case 'multiselect':
      return (
        <MultiSelect
          label={labelNode} placeholder={field.placeholder ?? 'Pick one or more'} description={description}
          data={field.options ?? []} disabled={isDisabled} searchable clearable
          {...form.getInputProps(field.name)}
        />
      );

    case 'date':
      return (
        <TextInput
          label={labelNode} placeholder={field.placeholder} description={description}
          type="date" disabled={isDisabled} {...inputProps} {...form.getInputProps(field.name)}
        />
      );

    default:
      return null;
  }
}

export function EntityForm<T extends Record<string, any>>({
  entityName,
  entity,
  fields,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
  accentColor = '#00897b',
  submitLabel = 'Save',
  children,
  formRef,
}: EntityFormProps<T>) {
  const isEdit = !!entity;
  const sections = useMemo(() => normalizeToSections(fields), [fields]);
  const initialValues = useMemo(() => buildInitialValues(sections, entity), [sections, entity]);
  const validators = useMemo(() => buildValidators(sections), [sections]);

  const form = useForm<T>({
    initialValues,
    validate: validators as any,
  });

  useEffect(() => {
    if (entity) {
      form.setValues(buildInitialValues(sections, entity));
    } else {
      form.reset();
    }
  }, [entity]);

  useEffect(() => {
    if (formRef) formRef.current = form;
  }, [form]);

  const handleSubmit = form.onSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Box style={{
      border: '1px solid var(--mantine-color-gray-3)',
      borderRadius: 'var(--mantine-radius-md)',
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      <Box px="lg" py="sm" style={{ background: accentColor }}>
        <Group justify="space-between">
          <Text c="white" fw={500} size="sm">{isEdit ? `Edit ${entityName}` : `Add ${entityName}`}</Text>
          {isEdit && <Badge variant="light" color="gray" size="xs">Editing</Badge>}
        </Group>
      </Box>

      <form onSubmit={handleSubmit}>
        <Box px="lg" pt="lg" pb="md">
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="md">
              {error}
            </Alert>
          )}

          {sections.map((section, si) => (
            <Box key={si}>
              {si > 0 && <Divider my="md" />}
              {section.title && (
                <Text size="sm" fw={600} mb="sm" c="dimmed" tt="uppercase" fz="xs">
                  {section.title}
                </Text>
              )}
              <Grid gutter="md" align="flex-start">
                {section.fields.map((field) => {
                  const visible = !field.showWhen || field.showWhen(form.values);
                  if (!visible) return null;
                  const span = field.type === 'checkbox' ? (field.span ?? 12) : (field.span ?? 6);
                  return (
                    <Grid.Col key={String(field.name)} span={span}>
                      <RenderField field={field} form={form} accentColor={accentColor} />
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Box>
          ))}

          {children && (
            <Box mt="md">
              {children}
            </Box>
          )}
        </Box>

        <Box px="lg" py="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onCancel} disabled={isLoading} style={{ minWidth: 88 }}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} style={{ minWidth: 88, background: accentColor }}>
              {submitLabel}
            </Button>
          </Group>
        </Box>
      </form>
    </Box>
  );
}
