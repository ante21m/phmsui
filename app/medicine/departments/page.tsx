'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { SmartTable, type SmartColumn, EntityForm, type FieldConfig } from '@/components';
import {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  type Department,
} from '@/store/services/drugApi';
import styles from './Departments.module.css';

const formFields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Department name', span: 6 },
  { name: 'code', label: 'Code', type: 'text', placeholder: 'e.g. PHARM', span: 6 },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Department description', span: 12 },
  { name: 'isActive', label: 'Active', type: 'checkbox', span: 12 },
];

export default function DepartmentsPage() {
  const { data: departments = [], isLoading } = useGetDepartmentsQuery();
  const [create] = useCreateDepartmentMutation();
  const [update] = useUpdateDepartmentMutation();
  const [remove] = useDeleteDepartmentMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (d: Department) => { setEditing(d); setFormOpen(true); };
  const closeForm = () => { setEditing(null); setFormOpen(false); };

  const handleSave = async (values: Record<string, any>) => {
    try {
      if (editing) {
        await update({ id: editing.id, ...values, isActive: values.isActive }).unwrap();
        toast.success('Department updated');
      } else {
        await create({ name: values.name, code: values.code, description: values.description, isActive: values.isActive }).unwrap();
        toast.success('Department created');
      }
      closeForm();
    } catch (err: any) {
      if (err?.data?.message) toast.error(err.data.message);
      else toast.error(editing ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleDelete = async (id: string) => {
    try { await remove(id).unwrap(); toast.success('Department deleted'); }
    catch (err: any) { toast.error(err?.data?.message || 'Failed to delete'); }
  };

  const handleToggleStatus = async (row: Department) => {
    try {
      await update({ id: row.id, isActive: !row.isActive }).unwrap();
      toast.success(`Department ${row.isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to update status'); }
  };

  const columns = useMemo<SmartColumn<Department>[]>(
    () => [
      { accessor: 'name', header: 'Name', sortable: true },
      { accessor: 'code', header: 'Code', sortable: true, render: (row) => row.code || '—' },
      { accessor: 'description', header: 'Description', render: (row) => row.description || '—' },
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
          entityName="Department"
          entity={editing}
          fields={formFields}
          onSubmit={handleSave}
          onCancel={closeForm}
          submitLabel={editing ? 'Update' : 'Save'}
        />
      )}

      <SmartTable
        title="Departments"
        data={departments}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25}
        emptyMessage="No departments found."
        headerAction={
          <button className={styles.addBtn} onClick={openAdd}><MdAdd /> Add Department</button>
        }
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
    </div>
  );
}
