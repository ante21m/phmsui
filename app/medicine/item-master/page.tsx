'use client';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete, MdClose, MdSave } from 'react-icons/md';
import { EntityForm, type FieldConfig, SmartTable, type SmartColumn, TextField } from '@/components';
import {
  useGetItemsQuery,
  useAddItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetItemCategoriesQuery,
  useGetUnitOfMeasuresQuery,
  ItemMaster,
} from '@/store/services/drugApi';
import styles from './ItemMaster.module.css';

const assetTypes = ['fixed', 'consumable'];

export default function ItemMasterPage() {
  const { data: items = [], isLoading } = useGetItemsQuery();
  const { data: categories = [] } = useGetItemCategoriesQuery();
  const { data: uoms = [] } = useGetUnitOfMeasuresQuery();
  const [addItem] = useAddItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemMaster | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formFields = useMemo<FieldConfig[]>(() => [
    { name: 'itemCode', label: 'Item Code', type: 'text', required: true, placeholder: 'e.g. ITM-001', span: 6 },
    { name: 'name', label: 'Name *', type: 'text', required: true, placeholder: 'e.g. Widget', span: 6 },
    { name: 'unitOfMeasureId', label: 'Unit of Measure', type: 'select', options: [{ value: '', label: '-- None --' }, ...uoms.map(u => ({ value: u.id, label: `${u.name} (${u.symbol})` }))], span: 6 },
    //{ name: 'assetType', label: 'Asset Type', type: 'select', options: [{ value: '', label: '-- Select --' }, ...assetTypes.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))], span: 6 },
    { name: 'specification', label: 'Specification', type: 'text', span: 6 },
    { name: 'reorderQuantity', label: 'Reorder Quantity', type: 'number', span: 6 },
    { name: 'hasVariants', label: 'Has Variants', type: 'select', options: [{ value: '', label: '-- Select --' }, { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }], span: 6 },
    { name: 'requiresSerialNumber', label: 'Requires Serial No.', type: 'select', options: [{ value: '', label: '-- Select --' }, { value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }], span: 6 },
    { name: 'categoryId', label: 'Category', type: 'select', options: [{ value: '', label: '-- None --' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))], span: 6 },
    { name: 'description', label: 'Description', type: 'text', span: 12 },
    {
      name: 'variants', label: 'Variants', type: 'text', span: 12,
      showWhen: (values) => values.hasVariants === 'true',
      render: (form) => {
        const variants: Array<{ variantName: string; attributes: Array<{ key: string; value: string }> }> = Array.isArray(form.values.variants)
          ? form.values.variants
          : [];
        const addVariant = () => {
          const itemName = form.values.name || '';
          form.setFieldValue('variants', [...variants, { variantName: itemName, attributes: [{ key: '', value: '' }] }]);
        };
        const removeVariant = (idx: number) => {
          const next = variants.filter((_, i) => i !== idx);
          form.setFieldValue('variants', next);
        };
        const updateVariantField = (idx: number, val: string) => {
          const next = variants.map((v, i) => i === idx ? { ...v, variantName: val } : v);
          form.setFieldValue('variants', next);
        };
        const computeVariantName = (itemName: string, attrs: Array<{ key: string; value: string }>) => {
          const attrStr = attrs.filter(a => a.key || a.value).map(a => `${a.key}: ${a.value}`).join(', ');
          return attrStr ? `${itemName} - ${attrStr}` : itemName;
        };
        const addAttribute = (vIdx: number) => {
          const next = variants.map((v, i) => i === vIdx ? { ...v, attributes: [...v.attributes, { key: '', value: '' }] } : v);
          form.setFieldValue('variants', next);
        };
        const removeAttribute = (vIdx: number, aIdx: number) => {
          const itemName = form.values.name || '';
          const next = variants.map((v, i) => {
            if (i !== vIdx) return v;
            const remaining = v.attributes.filter((_, ai) => ai !== aIdx);
            return { ...v, attributes: remaining, variantName: computeVariantName(itemName, remaining) };
          });
          form.setFieldValue('variants', next);
        };
        const updateAttribute = (vIdx: number, aIdx: number, field: 'key' | 'value', val: string) => {
          const itemName = form.values.name || '';
          const next = variants.map((v, i) => {
            if (i !== vIdx) return v;
            const updatedAttrs = v.attributes.map((a, ai) => ai === aIdx ? { ...a, [field]: val } : a);
            return { ...v, attributes: updatedAttrs, variantName: computeVariantName(itemName, updatedAttrs) };
          });
          form.setFieldValue('variants', next);
        };
        return (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Variants</span>
              <button type="button" onClick={addVariant} className={styles.variantAddBtn}><MdAdd /> Add Variant</button>
            </div>
            {variants.map((v, vi) => (
              <div key={vi} style={{ marginBottom: 12, border: '1px solid var(--gray-200)', borderRadius: 6, padding: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4 }}>Properties</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid var(--gray-200)', width: '45%' }}>Property Name</th>
                      <th style={{ textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid var(--gray-200)', width: '45%' }}>Value</th>
                      <th style={{ width: 30, borderBottom: '1px solid var(--gray-200)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.attributes.map((a, ai) => (
                      <tr key={ai}>
                        <td style={{ padding: '2px 4px' }}>
                          <TextField value={a.key} onChange={e => updateAttribute(vi, ai, 'key', e.target.value)} placeholder="e.g. color" />
                        </td>
                        <td style={{ padding: '2px 4px' }}>
                          <TextField value={a.value} onChange={e => updateAttribute(vi, ai, 'value', e.target.value)} placeholder="e.g. red" />
                        </td>
                        <td style={{ padding: '2px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeAttribute(vi, ai)} title="Remove property" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-btn, #e74c3c)', fontSize: 14 }}><MdDelete /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => addAttribute(vi)} className={styles.propAddBtn}><MdAdd /> Add Property</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>Variant Name</span>
                    <TextField value={v.variantName} onChange={e => updateVariantField(vi, e.target.value)} placeholder="Auto-generated from item name + properties" />
                  <button type="button" onClick={() => removeVariant(vi)} title="Remove variant" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-btn, #e74c3c)', fontSize: 16 }}><MdDelete /></button>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
  ], [categories, uoms]);

  const toEntity = (item: ItemMaster | null): Record<string, any> | null => {
    if (!item) return null;
    return {
      itemCode: item.itemCode,
      name: item.name,
      categoryId: item.categoryId ? String(item.categoryId) : '',
      unitOfMeasureId: item.unitOfMeasureId || '',
      assetType: 'consumable',
      description: item.description || '',
      specification: item.specification || '',
      reorderQuantity: item.reorderQuantity ?? '',
      hasVariants: item.hasVariants ? 'true' : 'false',
      requiresSerialNumber: item.requiresSerialNumber ? 'true' : 'false',
      variants: item.variants?.map(v => ({
        variantName: v.variantName,
        attributes: Object.entries(v.attributes || {}).map(([key, value]) => ({ key, value: String(value) })),
      })) || [],
    };
  };

  const openAddForm = useCallback(() => { setEditing(null); setFormOpen(true); }, []);
  const openEditForm = useCallback((item: ItemMaster) => { setEditing(item); setFormOpen(true); }, []);
  const closeForm = useCallback(() => { setEditing(null); setFormOpen(false); }, []);

  const handleSave = async (values: Record<string, any>) => {
    try {
      const payload = {
        itemCode: values.itemCode.trim(),
        name: values.name.trim(),
        categoryId: values.categoryId || null,
        unitOfMeasureId: values.unitOfMeasureId || null,
        assetType: 'consumable',
        description: values.description || null,
        specification: values.specification || null,
        reorderQuantity: values.reorderQuantity ? Number(values.reorderQuantity) : null,
        hasVariants: values.hasVariants === 'true',
        requiresSerialNumber: values.requiresSerialNumber === 'true',
        ...(values.hasVariants === 'true' && Array.isArray(values.variants)
          ? { variants: values.variants.map((v: { variantName: string; attributes: Array<{ key: string; value: string }> }) => ({
              variantName: v.variantName,
              attributes: v.attributes
                .filter((a: { key: string }) => a.key.trim())
                .reduce((acc: Record<string, string>, a: { key: string; value: string }) => {
                  acc[a.key.trim()] = a.value;
                  return acc;
                }, {}),
            })) }
          : {}),
      };
      if (editing) {
        await updateItem({ id: editing.id, ...payload }).unwrap();
        toast.success('Item updated');
      } else {
        await addItem(payload).unwrap();
        toast.success('Item added');
      }
      closeForm();
    } catch {
      toast.error(editing ? 'Failed to update item' : 'Failed to add item');
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteItem(id).unwrap(); toast.success('Item deleted'); setDeletingId(null); }
    catch { toast.error('Delete failed'); }
  };

  const columns = useMemo<SmartColumn<ItemMaster>[]>(
    () => [
      { accessor: 'itemCode', header: 'Item Code', sortable: true },
      {
        accessor: 'name', header: 'Name', sortable: true,
        render: (row) => row.name,
      },
      {
        accessor: 'unitOfMeasure', header: 'UOM',
        render: (row) => row.unitOfMeasure?.symbol || '—',
      },
      { accessor: 'reorderQuantity', header: 'Reorder Qty', sortable: true, render: (row) => row.reorderQuantity ?? '—' },
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
          entityName="Item Master"
          entity={editing ? toEntity(editing) : null}
          fields={formFields}
          onSubmit={handleSave}
          onCancel={closeForm}
          submitLabel={editing ? 'Update' : 'Save'}
        />
      )}

      <SmartTable
        title="Item Master"
        data={items}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25} maxHeight={520}
        headerAction={
          <button className={styles.addBtn} onClick={openAddForm}><MdAdd /> Add Item Master</button>
        }
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
    </div>
  );
}
