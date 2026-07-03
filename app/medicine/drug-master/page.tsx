'use client';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete, MdClose, MdSave, MdCheck, MdBlock } from 'react-icons/md';
import { EntityForm, type FieldConfig, SmartTable, type SmartColumn } from '@/components';
import {
  useGetDrugsQuery,
  useAddDrugMutation,
  useUpdateDrugMutation,
  useDeleteDrugMutation,
  useGetDrugCategoriesQuery,
  useGetUnitOfMeasurementsQuery,
  useGetDrugFormsQuery,
  DrugMaster,
} from '@/store/services/drugApi';
import styles from './DrugMaster.module.css';

const routes = ['Oral', 'Intravenous', 'Intramuscular', 'Subcutaneous', 'Topical', 'Inhalation', 'Sublingual', 'Buccal', 'Rectal', 'Vaginal', 'Ophthalmic', 'Otic', 'Nasal', 'Transdermal', 'Intrathecal', 'Intraosseous'];

export default function DrugMasterPage() {
  const { data: drugs = [], isLoading } = useGetDrugsQuery();
  const { data: categories = [] } = useGetDrugCategoriesQuery();
  const { data: uoms = [] } = useGetUnitOfMeasurementsQuery();
  const { data: forms = [] } = useGetDrugFormsQuery();
  const [addDrug] = useAddDrugMutation();
  const [updateDrug] = useUpdateDrugMutation();
  const [deleteDrug] = useDeleteDrugMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DrugMaster | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formFields = useMemo<FieldConfig[]>(() => [
    { name: 'genericName', label: 'Generic Name', type: 'text', required: true, placeholder: 'e.g. Paracetamol', span: 6 },
    { name: 'strength', label: 'Strength', type: 'text', required: true, placeholder: 'e.g. 500 mg', span: 6 },
    { name: 'dosageForm', label: 'Dosage Form', type: 'select', placeholder: 'Select dosage form', options: forms.map(f => ({ value: f.value, label: f.label })), span: 6 },
    { name: 'route', label: 'Route', type: 'select', placeholder: 'Select route', options: routes.map(r => ({ value: r, label: r })), span: 6 },
    { name: 'unitOfMeasure', label: 'Unit of Measure', type: 'select', placeholder: 'Select unit', options: uoms.map(u => ({ value: u.value, label: u.label })), span: 6 },
    { name: 'reorderLevel', label: 'Reorder Level', type: 'number', placeholder: 'Enter reorder level', span: 6 },
    { name: 'categoryId', label: 'Category', type: 'select', placeholder: 'Select category', options: [{ value: '', label: '-- None --' }, ...categories.map(c => ({ value: c.id, label: c.name }))], span: 6 },
    { name: 'active', label: 'Active', type: 'select', placeholder: 'Select status', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], span: 12 },
  ], [forms, uoms, categories]);

  const toEntity = (drug: DrugMaster | null): Record<string, any> | null => {
    if (!drug) return null;
    return {
      genericName: drug.genericName,
      strength: drug.strength,
      dosageForm: drug.dosageForm,
      route: drug.route,
      unitOfMeasure: drug.unitOfMeasure,
      reorderLevel: drug.reorderLevel,
      categoryId: drug.categoryId ? String(drug.categoryId) : '',
      active: drug.active ? 'true' : 'false',
    };
  };

  const openAddForm = useCallback(() => { setEditing(null); setFormOpen(true); }, []);
  const openEditForm = useCallback((drug: DrugMaster) => { setEditing(drug); setFormOpen(true); }, []);
  const closeForm = useCallback(() => { setEditing(null); setFormOpen(false); }, []);

  const handleSave = async (values: Record<string, any>) => {
    try {
      const payload = {
        genericName: values.genericName.trim(),
        strength: values.strength.trim(),
        dosageForm: values.dosageForm,
        route: values.route,
        reorderLevel: values.reorderLevel ? Number(values.reorderLevel) : undefined,
        unitOfMeasure: values.unitOfMeasure,
        categoryId: values.categoryId || null,
        active: values.active === 'true',
      };
      if (editing) {
        await updateDrug({ id: editing.id, ...payload }).unwrap();
        toast.success('Drug updated');
      } else {
        await addDrug(payload).unwrap();
        toast.success('Drug added');
      }
      closeForm();
    } catch {
      toast.error(editing ? 'Failed to update drug' : 'Failed to add drug');
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDrug(id).unwrap(); toast.success('Drug deleted'); setDeletingId(null); }
    catch (err: any) { toast.error(err?.data?.message || 'Delete failed'); }
  };

  const columns = useMemo<SmartColumn<DrugMaster>[]>(
    () => [
      { accessor: 'genericName', header: 'Generic Name', sortable: true },
      { accessor: 'strength', header: 'Strength', sortable: true },
      { accessor: 'dosageForm', header: 'Dosage Form', sortable: true },
      { accessor: 'route', header: 'Route', sortable: true },
      { accessor: 'unitOfMeasure', header: 'Unit', sortable: true },
      { accessor: 'reorderLevel', header: 'Reorder Level', textAlign: 'right', sortable: true },
      {
        accessor: 'categoryId', header: 'Category', sortable: true,
        render: (row) => row.category?.name || '—',
      },
      {
        accessor: 'active', header: 'Active', textAlign: 'center', width: '80px',
        render: (row) => row.active ? <MdCheck color="green" /> : <MdBlock color="red" />,
      },
      {
        header: 'Actions', textAlign: 'center', width: '120px',
        render: (row) =>
          deletingId === row.id ? (
            <span className={styles.inlineConfirm}>
              <span className={styles.confirmText}>Delete?</span>
              <button className={styles.confirmYes} onClick={() => handleDelete(row.id)} title="Confirm"><MdSave /></button>
              <button className={styles.confirmNo} onClick={() => setDeletingId(null)} title="Cancel"><MdClose /></button>
            </span>
          ) : (
            <span className={styles.actionBtns}>
              <button className={styles.editBtn} onClick={() => openEditForm(row)} title="Edit"><MdEdit /></button>
              <button className={styles.deleteBtn} onClick={() => setDeletingId(row.id)} title="Delete"><MdDelete /></button>
            </span>
          ),
      },
    ],
    [deletingId, openEditForm]
  );

  return (
    <div className={styles.page}>
      {formOpen && (
        <EntityForm
          entityName="Drug Master"
          entity={editing ? toEntity(editing) : null}
          fields={formFields}
          onSubmit={handleSave}
          onCancel={closeForm}
          submitLabel={editing ? 'Update' : 'Save'}
        />
      )}

      <SmartTable
        title="Drug Master"
        data={drugs}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25} maxHeight={520}
        headerAction={
          <button className={styles.addBtn} onClick={openAddForm}><MdAdd /> Add Drug</button>
        }
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
    </div>
  );
}
