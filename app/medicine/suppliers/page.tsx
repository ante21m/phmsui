'use client';
import { useState, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import { Text } from '@mantine/core';
import { EntityForm, type FieldConfig, SmartTable, type SmartColumn, TextField } from '@/components';
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  Supplier,
} from '@/store/services/drugApi';
import styles from './Suppliers.module.css';

interface PhoneEntry { phoneNumber: string; label: string; }

const formFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Supplier name', span: 6 },
  { name: 'contactPhone', label: 'Contact Phone', type: 'text', placeholder: 'e.g. 011-123456', span: 6 },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com', span: 6 },
  { name: 'address', label: 'Address', type: 'text', placeholder: 'Full address', span: 6 },
  { name: 'active', label: 'Status', type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }], span: 12 },
];

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useGetSuppliersQuery();
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const formRef = useRef<any>(null);

  const inputStyle = {
    padding: '8px 10px', border: '1px solid var(--gray-300)',
    borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  };

  const openAddForm = () => { setEditing(null); setPhones([]); setFormOpen(true); };
  const openEditForm = (s: Supplier) => {
    setEditing(s);
    setPhones(s.phones.map(p => ({ phoneNumber: p.phoneNumber, label: p.label || '' })));
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setPhones([]); };

  const updatePhone = (idx: number, field: keyof PhoneEntry, value: string) => {
    setPhones(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; });
  };
  const addPhone = () => setPhones(prev => [...prev, { phoneNumber: '', label: '' }]);
  const removePhone = (idx: number) => setPhones(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async (values: Record<string, any>) => {
    if (phones.some(p => !p.phoneNumber.trim())) { toast.error('Phone number is required for all phone entries'); return; }
    try {
      const payload = {
        name: values.name.trim(),
        contactPhone: values.contactPhone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        active: values.active === 'true',
        phones: phones.filter(p => p.phoneNumber.trim()).map(p => ({ phoneNumber: p.phoneNumber.trim(), label: p.label.trim() || undefined })),
      };
      if (editing) {
        await updateSupplier({ id: editing.id, ...payload }).unwrap();
        toast.success('Supplier updated');
      } else {
        await createSupplier(payload).unwrap();
        toast.success('Supplier created');
      }
      closeForm();
    } catch { toast.error(editing ? 'Failed to update' : 'Failed to create'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteSupplier(id).unwrap(); toast.success('Supplier deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleToggleStatus = async (row: Supplier) => {
    try {
      await updateSupplier({ id: row.id, active: !row.active }).unwrap();
      toast.success(`Supplier ${row.active ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to update status'); }
  };

  const columns = useMemo<SmartColumn<Supplier>[]>(
    () => [
      { accessor: 'name', header: 'Name', sortable: true },
      { accessor: 'contactPhone', header: 'Phone', sortable: true, render: (row) => row.contactPhone || '—' },
      { accessor: 'email', header: 'Email', sortable: true, render: (row) => row.email || '—' },
      {
        accessor: 'active',
        header: 'Status',
        sortable: true,
        render: (row) => (
          <button
            className={`${styles.statusBadge} ${styles.statusToggle} ${row.active ? styles.activeBadge : styles.inactiveBadge}`}
            onClick={() => handleToggleStatus(row)}
            title={row.active ? 'Click to deactivate' : 'Click to activate'}
          >
            {row.active ? 'Active' : 'Inactive'}
          </button>
        ),
      },
      {
        header: 'Actions',
        textAlign: 'right',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.actionEdit} onClick={() => openEditForm(row)} title="Edit"><MdEdit /></button>
            <button className={styles.actionDelete} onClick={() => handleDelete(row.id)} title="Delete"><MdDelete /></button>
          </span>
        ),
      },
    ],
    []
  );

  const toEntity = (s: Supplier | null): Record<string, any> | null => {
    if (!s) return null;
    return {
      name: s.name,
      contactPhone: s.contactPhone || '',
      email: s.email || '',
      address: s.address || '',
      active: s.active ? 'true' : 'false',
    };
  };

  return (
    <div className={styles.page}>
      {formOpen && (
        <EntityForm
          entityName="Supplier"
          entity={editing ? toEntity(editing) : null}
          fields={formFields}
          onSubmit={handleSave}
          onCancel={closeForm}
          submitLabel={editing ? 'Update' : 'Save'}
          formRef={formRef}
        >
          <div>
            <Text size="sm" fw={500} mb="xs">Phone Numbers</Text>
            {phones.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ flex: 2 }}><TextField value={p.phoneNumber} onChange={(e) => updatePhone(i, 'phoneNumber', e.target.value)} placeholder="Phone number" /></div>
                <div style={{ flex: 1 }}><TextField value={p.label} onChange={(e) => updatePhone(i, 'label', e.target.value)} placeholder="Label (e.g. Mobile)" /></div>
                <button onClick={() => removePhone(i)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, border: 'none', borderRadius: 'var(--radius-sm)',
                  background: 'var(--red-btn)', color: 'white', fontSize: 14, cursor: 'pointer', flexShrink: 0,
                }}><MdClose /></button>
              </div>
            ))}
            <button onClick={addPhone} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              background: 'white', border: '1px dashed var(--teal-primary)', color: 'var(--teal-primary)',
              borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 4,
            }}><MdAdd /> Add Phone</button>
          </div>
        </EntityForm>
      )}

      <SmartTable
        title="Suppliers"
        data={suppliers}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25}
        emptyMessage="No suppliers found."
        headerAction={
          <button className={styles.addBtn} onClick={openAddForm}><MdAdd /> Add Supplier</button>
        }
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
    </div>
  );
}
