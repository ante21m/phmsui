'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdClose, MdSave, MdDelete, MdEdit } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetItemVariantsQuery,
  useGetItemsQuery,
  useCreateItemVariantMutation,
  useUpdateItemVariantMutation,
  useDeleteItemVariantMutation,
  ItemVariant,
  CreateItemVariantDto,
} from '@/store/services/drugApi';

const emptyForm = (): CreateItemVariantDto => ({
  itemId: '',
  sku: '',
  sellingPrice: 0,
  buyingPrice: 0,
  barcode: '',
  attributes: {},
  isActive: true,
});

export default function ItemVariantsPage() {
  const { data, isLoading } = useGetItemVariantsQuery();
  const { data: items } = useGetItemsQuery();
  const [create] = useCreateItemVariantMutation();
  const [update] = useUpdateItemVariantMutation();
  const [remove] = useDeleteItemVariantMutation();

  const variants = data?.data || [];

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateItemVariantDto>(emptyForm());

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (v: ItemVariant) => {
    setEditingId(v.id);
    setForm({
      itemId: v.itemId,
      sku: v.sku,
      sellingPrice: Number(v.sellingPrice),
      buyingPrice: Number(v.buyingPrice),
      barcode: v.barcode || '',
      attributes: v.attributes || {},
      isActive: v.isActive,
    });
    setFormOpen(true);
  };
  const close = () => { setFormOpen(false); setEditingId(null); setForm(emptyForm()); };

  const handleSave = async () => {
    if (!form.sku) { toast.error('SKU is required'); return; }
    if (!form.itemId) { toast.error('Please select an item'); return; }
    try {
      if (editingId) {
        await update({ id: editingId, ...form }).unwrap();
        toast.success('Variant updated');
      } else {
        await create(form).unwrap();
        toast.success('Variant created');
      }
      close();
    } catch {
      toast.error('Failed to save variant');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id).unwrap();
      toast.success('Variant deleted');
    } catch {
      toast.error('Failed to delete variant');
    }
  };

  const columns: SmartColumn<ItemVariant>[] = [
    { accessor: 'sku', header: 'SKU', sortable: true },
    {
      accessor: 'item',
      header: 'Item Name',
      render: (row) => row.item?.name || '—',
    },
    { accessor: 'sellingPrice', header: 'Selling Price', sortable: true, render: (row) => Number(row.sellingPrice).toFixed(2) },
    { accessor: 'buyingPrice', header: 'Buying Price', sortable: true, render: (row) => Number(row.buyingPrice).toFixed(2) },
    { accessor: 'barcode', header: 'Barcode' },
    {
      accessor: 'isActive',
      header: 'Active',
      render: (row) => row.isActive ? <span style={{ color: 'green' }}>Yes</span> : <span style={{ color: 'red' }}>No</span>,
    },
    {
      header: 'Action',
      textAlign: 'center',
      render: (row) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 15, cursor: 'pointer', background: '#e3f2fd', color: '#1565c0' }} onClick={() => openEdit(row)} title="Edit"><MdEdit /></button>
          <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 15, cursor: 'pointer', background: '#ffebee', color: '#c62828' }} onClick={() => handleDelete(row.id)} title="Delete"><MdDelete /></button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      {formOpen && (
        <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--gray-200)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--teal-primary)', color: 'white' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{editingId ? 'Edit' : 'Add'} Item Variant</h3>
            <button onClick={close} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 18, cursor: 'pointer' }}><MdClose /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Item <span style={{ color: 'var(--red-btn)' }}>*</span></label>
              <select value={form.itemId} onChange={e => setForm(p => ({ ...p, itemId: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', background: 'white' }}>
                <option value="">Select item...</option>
                {items?.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.itemCode})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>SKU <span style={{ color: 'var(--red-btn)' }}>*</span></label>
              <input type="text" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="SKU-001" style={{ padding: '8px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', background: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Selling Price</label>
              <input type="number" step="0.01" value={form.sellingPrice || ''} onChange={e => setForm(p => ({ ...p, sellingPrice: Number(e.target.value) }))} placeholder="0.00" style={{ padding: '8px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', background: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Buying Price</label>
              <input type="number" step="0.01" value={form.buyingPrice || ''} onChange={e => setForm(p => ({ ...p, buyingPrice: Number(e.target.value) }))} placeholder="0.00" style={{ padding: '8px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', background: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Barcode</label>
              <input type="text" value={form.barcode || ''} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} placeholder="barcode" style={{ padding: '8px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', background: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-600)', textTransform: 'uppercase' }}>Active</label>
              <select value={form.isActive ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))} style={{ padding: '8px 10px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', fontSize: 13.5, outline: 'none', background: 'white' }}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
            <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: 'var(--teal-primary)', color: 'white' }}><MdSave /> {editingId ? 'Update' : 'Save'}</button>
            <button onClick={close} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', background: 'var(--gray-200)', color: 'var(--gray-700)' }}><MdClose /> Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--teal-primary)', color: 'white', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Item Variants</h2>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', color: 'var(--teal-dark)', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}><MdAdd /> New Variant</button>
      </div>

      <SmartTable
        data={variants}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch
        withPagination
        withRowNumbers
        defaultPageSize={25}
        emptyMessage="No item variants found."
      />
    </div>
  );
}
