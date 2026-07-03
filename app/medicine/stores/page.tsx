'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { SmartTable, type SmartColumn, EntityForm, type FieldConfig } from '@/components';
import {
  useGetStoresQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
  type Store,
} from '@/store/services/drugApi';
import styles from './Stores.module.css';

const formFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Store name', span: 6 },
  { name: 'code', label: 'Code', type: 'text', placeholder: 'e.g. MAIN-PH', span: 6 },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'Store location', span: 12 },
  { name: 'isActive', label: 'Active', type: 'checkbox', span: 12 },
];

export default function StoresPage() {
  const { data: stores = [], isLoading } = useGetStoresQuery();
  const [create] = useCreateStoreMutation();
  const [update] = useUpdateStoreMutation();
  const [remove] = useDeleteStoreMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: Store) => { setEditing(s); setFormOpen(true); };
  const closeForm = () => { setEditing(null); setFormOpen(false); };

  const handleSave = async (values: Record<string, any>) => {
    try {
      if (editing) {
        await update({ id: editing.id, ...values, isActive: values.isActive }).unwrap();
        toast.success('Store updated');
      } else {
        await create({ name: values.name, code: values.code, location: values.location, isActive: values.isActive }).unwrap();
        toast.success('Store created');
      }
      closeForm();
    } catch (err: any) {
      if (err?.data?.message) toast.error(err.data.message);
      else toast.error(editing ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleDelete = async (id: string) => {
    try { await remove(id).unwrap(); toast.success('Store deleted'); }
    catch (err: any) { toast.error(err?.data?.message || 'Failed to delete'); }
  };

  const handleToggleStatus = async (row: Store) => {
    try {
      await update({ id: row.id, isActive: !row.isActive }).unwrap();
      toast.success(`Store ${row.isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to update status'); }
  };

  const columns = useMemo<SmartColumn<Store>[]>(
    () => [
      { accessor: 'name', header: 'Name', sortable: true },
      { accessor: 'code', header: 'Code', sortable: true, render: (row) => row.code || '—' },
      { accessor: 'location', header: 'Location', render: (row) => row.location || '—' },
      {
        accessor: 'isActive',
        header: 'Status',
        sortable: true,
        render: (row) => (
          <button
            className={`${styles.statusBadge} ${styles.statusToggle} ${row.isActive ? styles.activeBadge : styles.inactiveBadge}`}
            onClick={() => handleToggleStatus(row)}
            title={row.isActive ? 'Click to deactivate' : 'Click to activate'}
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </button>
        ),
      },
      {
        header: 'Actions',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.actionEdit} onClick={() => openEdit(row)} title="Edit"><MdEdit /></button>
            <button className={styles.actionDelete} onClick={() => handleDelete(row.id)} title="Delete"><MdDelete /></button>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className={styles.page}>
      {formOpen && (
        <EntityForm
          entityName="Store"
          entity={editing}
          fields={formFields}
          onSubmit={handleSave}
          onCancel={closeForm}
          submitLabel={editing ? 'Update' : 'Save'}
        />
      )}

      <SmartTable
        title="Stores"
        data={stores}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25}
        emptyMessage="No stores found."
        headerAction={
          <button className={styles.addBtn} onClick={openAdd}><MdAdd /> Add Store</button>
        }
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
    </div>
  );
}
