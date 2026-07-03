'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete, MdClose, MdSave, MdVisibility, MdCheckCircle } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetInventoryRequestsQuery,
  useCreateInventoryRequestMutation,
  useUpdateInventoryRequestMutation,
  useDeleteInventoryRequestMutation,
  useGetDepartmentsQuery,
  useGetStoresQuery,
  useGetItemsQuery,
  useGetUserDetailQuery,
  type InventoryRequest,
} from '@/store/services/drugApi';
import {
  useCreateInventoryApprovalMutation,
  InventoryApprovalStatus,
} from '@/store/services/inventoryApprovalApi';
import styles from './InventoryRequests.module.css';

interface ItemRow {
  id: number;
  variantId: string;
  requestedQuantity: string;
  unitCost: string;
  totalCost: string;
  remarks: string;
}

interface FormData {
  departmentId: string;
  warehouseId: string;
  purpose: string;
  status: string;
  items: ItemRow[];
}

let nextItemId = 1;
const emptyItem = (): ItemRow => ({ id: nextItemId++, variantId: '', requestedQuantity: '0', unitCost: '', totalCost: '', remarks: '' });

const emptyForm = (): FormData => ({
  departmentId: '', warehouseId: '',
  purpose: '', status: 'PENDING', items: [emptyItem()],
});

const statusClass: Record<string, string> = {
  PENDING: styles.statusPending, APPROVED: styles.statusApproved,
  REJECTED: styles.statusRejected, ISSUED: styles.statusIssued,
};

export default function InventoryRequestsPage() {
  const { data: all = [], isLoading, refetch } = useGetInventoryRequestsQuery();
  const { data: deptRes } = useGetDepartmentsQuery();
  const { data: storeRes } = useGetStoresQuery();
  const { data: items } = useGetItemsQuery();
  const departments = deptRes ?? [];
  const stores = storeRes ?? [];
  const itemList = items ?? [];

  const itemOpts = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const item of itemList) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const itemVariants = (item.variants ?? []).filter(v => v.isActive !== false);
      const hasCustomVariants = itemVariants.some(v => v.variantName !== item.name);
      if (hasCustomVariants) {
        for (const v of itemVariants) {
          opts.push({ value: item.id, label: v.variantName });
        }
      } else {
        opts.push({ value: item.id, label: item.name || item.itemCode });
      }
    }
    return opts;
  }, [itemList]);

  const variantIdForItem = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of itemList) {
      const first = (item.variants ?? []).find(v => v.isActive !== false);
      if (first) map.set(item.id, first.id);
    }
    return map;
  }, [itemList]);

  const itemIdForVariant = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of itemList) {
      for (const v of (item.variants ?? [])) {
        map.set(v.id, item.id);
      }
    }
    return map;
  }, [itemList]);
  const [create] = useCreateInventoryRequestMutation();
  const [update] = useUpdateInventoryRequestMutation();
  const [remove] = useDeleteInventoryRequestMutation();
  const [createApproval] = useCreateInventoryApprovalMutation();
  const { data: currentUser } = useGetUserDetailQuery();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bulkComment, setBulkComment] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkSubmit = async () => {
    setBulkLoading(true);
    const pendingIds = selectedIds.filter(id => all.find(r => r.id === id)?.status === 'PENDING');
    let success = 0, fail = 0;
    for (const id of pendingIds) {
      try {
        await createApproval({
          requestId: id,
          approvedBy: currentUser?.id || id,
          status: InventoryApprovalStatus.PENDING,
          comment: bulkComment || undefined,
        }).unwrap();
        success++;
      } catch { fail++; }
    }
    if (success > 0) toast.success(`${success} request(s) submitted for approval`);
    if (fail > 0) toast.error(`${fail} request(s) failed`);
    setSubmitting(false);
    setSelectedIds([]);
    setBulkComment('');
    setBulkLoading(false);
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const pendings = all.filter(r => r.status === 'PENDING').map(r => r.id);
    setSelectedIds(prev => prev.length === pendings.length ? [] : pendings);
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryRequest | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<InventoryRequest | null>(null);

  const openAdd = () => {
    setEditing(null);
    const dept = (departments as any[]).find((d: any) => d.name === 'Pharmacy');
    const wh = (stores as any[]).find((s: any) => s.name === 'Pharmacy-Store');
    setForm({
      departmentId: dept?.id || '',
      warehouseId: wh?.id || '',
      purpose: '', status: 'PENDING', items: [emptyItem()],
    });
    setFormOpen(true);
    nextItemId = 1;
  };
  const openEdit = (r: InventoryRequest) => {
    setEditing(r);
    setForm({
      departmentId: r.departmentId || '',
      warehouseId: r.warehouseId || '',
      purpose: r.purpose || '',
      status: r.status,
      items: r.items.length > 0
        ? r.items.map((i) => ({ id: nextItemId++, variantId: itemIdForVariant.get(i.variantId) || i.variantId, requestedQuantity: String(i.requestedQuantity), unitCost: i.unitCost != null ? String(i.unitCost) : '', totalCost: i.totalCost != null ? String(i.totalCost) : '', remarks: i.remarks || '' }))
        : [emptyItem()],
    });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(emptyForm()); setSaving(false); };

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setForm(prev => {
      const items = prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
      if (field === 'requestedQuantity' || field === 'unitCost') {
        const qty = Number(items[idx].requestedQuantity) || 0;
        const cost = Number(items[idx].unitCost) || 0;
        items[idx] = { ...items[idx], totalCost: String((qty * cost).toFixed(2)) };
      }
      return { ...prev, items };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (idx: number) => {
    if (form.items.length <= 1) { toast.warning('At least one item is required'); return; }
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const grandTotal = useMemo(() => form.items.reduce((sum, it) => sum + (Number(it.totalCost) || 0), 0), [form.items]);

  const handleSave = async () => {
    if (!form.departmentId.trim()) { toast.error('Department is required'); return; }
    if (!form.warehouseId.trim()) { toast.error('Warehouse is required'); return; }
    if (!form.purpose.trim()) { toast.error('Purpose is required'); return; }
    if (!form.items.length || form.items.some(i => !i.variantId.trim())) { toast.error('Item is required for all items'); return; }
    if (form.items.some(i => !i.requestedQuantity || isNaN(Number(i.requestedQuantity)) || Number(i.requestedQuantity) < 0)) { toast.error('Quantity must be a valid number'); return; }

    const seen = new Set<string>();
    for (const it of form.items) {
      if (seen.has(it.variantId.trim())) { toast.error('Duplicate items detected'); return; }
      seen.add(it.variantId.trim());
    }

    setSaving(true);
    try {
      if (editing) {
        await update({ id: editing.id, status: form.status }).unwrap();
        toast.success('Request updated');
      } else {
        await create({
          departmentId: form.departmentId || undefined,
          warehouseId: form.warehouseId || undefined,
          purpose: form.purpose || undefined,
          items: form.items.map(i => ({
            variantId: variantIdForItem.get(i.variantId.trim()) || i.variantId.trim(),
            requestedQuantity: Number(i.requestedQuantity) || 1,
            unitCost: i.unitCost ? Number(i.unitCost) : undefined,
            totalCost: i.totalCost ? Number(i.totalCost) : undefined,
            remarks: i.remarks || undefined,
          })),
        } as any).unwrap();
        toast.success('Request created');
      }
      closeForm();
    } catch (err: any) {
      if (err?.data?.message) toast.error(err.data.message);
      else if (err?.error) toast.error(err.error);
      else toast.error(editing ? 'Failed to update' : 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await remove(id).unwrap(); toast.success('Request deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      await createApproval({
        requestId: id,
        approvedBy: currentUser?.id || id,
        status: InventoryApprovalStatus.PENDING,
      }).unwrap();
      toast.success('Request submitted for approval');
      refetch();
    } catch {
      toast.error('Failed to submit');
    }
  };

  const allPenging = all.filter(r => r.status === 'PENDING');
  const allSelected = allPenging.length > 0 && selectedIds.length === allPenging.length;

  const columns = useMemo<SmartColumn<InventoryRequest>[]>(
    () => [
      {
        header: (
          <input type="checkbox" checked={allSelected} onChange={selectAll}
            style={{ cursor: 'pointer', accentColor: 'var(--teal-primary)' }} />
        ),
        render: (row) =>
          row.status === 'PENDING' ? (
            <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)}
              style={{ cursor: 'pointer', accentColor: 'var(--teal-primary)' }} />
          ) : null,
      },
      { accessor: 'purpose', header: 'Purpose', sortable: true, render: (row) => row.purpose || '—' },
      {
        header: 'Department',
        render: (row) => {
          const d = departments.find((dep: any) => dep.id === row.departmentId);
          return d?.name || row.departmentId?.slice(0, 8) || '-';
        },
      },
      {
        header: 'Warehouse',
        render: (row) => {
          const w = stores.find((s: any) => s.id === row.warehouseId);
          return w?.name || row.warehouseId?.slice(0, 8) || '-';
        },
      },
      {
        header: 'Requested By',
        render: (row) => {
          const u = row.requestedByUser;
          return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-' : row.requestedBy?.slice(0, 8) || '-';
        },
      },
      {
        accessor: 'status', header: 'Status', sortable: true,
        render: (row) => (
          <span className={`${styles.statusBadge} ${statusClass[row.status] || ''}`}>{row.status}</span>
        ),
      },
      {
        header: 'Actions',
        render: (row) => (
          <span className={styles.actionBtns}>
            {row.status === 'PENDING' ? (
              <button className={styles.actionEdit} onClick={() => handleSubmitForApproval(row.id)} title="Submit for approval"><MdCheckCircle /></button>
            ) : null}
            {row.status === 'PENDING' && (
              <>
                <button className={styles.actionEdit} onClick={() => openEdit(row)} title="Edit"><MdEdit /></button>
                <button className={styles.actionDelete} onClick={() => handleDelete(row.id)} title="Delete"><MdDelete /></button>
              </>
            )}
          </span>
        ),
      },
    ],
    [selectedIds, allSelected, currentUser, departments, stores],
  );

  const pendingCount = all.filter(r => r.status === 'PENDING').length;

  return (
    <div className={styles.page}>
      {formOpen && (
        <div className={styles.inlineForm}>
          <div className={styles.inlineFormHeader}>
            <h3>{editing ? 'Edit Request' : 'New Inventory Request'}</h3>
            <button className={styles.formCloseBtn} onClick={closeForm}><MdClose /></button>
          </div>
          <div className={styles.inlineFormBody}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Department <span className={styles.required}>*</span></label>
                <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} aria-label="Department">
                  <option value="">Select department</option>
                  {departments.filter(d => d.isActive).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Warehouse <span className={styles.required}>*</span></label>
                <select value={form.warehouseId} onChange={e => setForm(p => ({ ...p, warehouseId: e.target.value }))} aria-label="Warehouse">
                  <option value="">Select warehouse</option>
                  {stores.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} disabled={!editing} aria-label="Status">
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ISSUED">Issued</option>
                </select>
              </div>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Purpose <span className={styles.required}>*</span></label>
                <textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Enter purpose of request" />
              </div>
            </div>

            {/* Requested Items */}
            <h4 className={styles.sectionTitle}>Requested Items</h4>
            <div className={styles.itemsSection}>
              <div className={styles.itemsHeader}>
                  <button className={styles.addItemBtn} onClick={addItem}><MdAdd /> Add Item</button>
              </div>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Item Name *</th>
                    <th style={{ width: '14%' }}>Qty</th>
                    <th style={{ width: 'auto' }}>Remarks</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={item.id}>
                      <td>
                        <select value={item.variantId} onChange={e => updateItem(i, 'variantId', e.target.value)} aria-label="Item">
                          <option value="">Select item</option>
                          {itemOpts.map((it, idx) => (
                            <option key={`${it.value}-${idx}`} value={it.value}>{it.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={0} value={item.requestedQuantity} onChange={e => updateItem(i, 'requestedQuantity', e.target.value)} placeholder="0" />
                      </td>
                      <td>
                        <input type="text" value={item.remarks} onChange={e => updateItem(i, 'remarks', e.target.value)} placeholder="Remarks" />
                      </td>
                      <td>
                        <button className={styles.deleteBtn} onClick={() => removeItem(i)} title="Remove"><MdClose /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.grandTotalRow}>
                Grand Total: <strong>{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
          <div className={styles.inlineFormActions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              <MdSave /> {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
            </button>
            <button className={styles.cancelBtn} onClick={closeForm}><MdClose /> Cancel</button>
          </div>
        </div>
      )}

      <SmartTable
        title="Inventory Requests"
        data={all}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25}
        emptyMessage="No inventory requests found."
        selectionBar={selectedIds.length > 0 ? (
          submitting ? (
            <div className={styles.selectionBarExpanded}>
              <div className={styles.expandedRow}>
                <span className={styles.expandedText}>Submit <strong>{selectedIds.length} request(s)</strong> for approval?</span>
              </div>
              <div className={styles.expandedRow}>
                <div className={styles.expandedCommentWrap}>
                  <label>Comment (optional)</label>
                  <textarea value={bulkComment} onChange={e => setBulkComment(e.target.value)}
                    placeholder="Add a comment" />
                </div>
              </div>
              <div className={styles.expandedActions}>
                <button className={styles.cancelBtn} onClick={() => { setSubmitting(false); setBulkComment(''); }}>Cancel</button>
                <button className={styles.saveBtn} onClick={handleBulkSubmit} disabled={bulkLoading}>
                  <MdCheckCircle /> {bulkLoading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.selectionBar}>
              <span className={styles.selectionCount}>{selectedIds.length} selected</span>
              <button className={styles.submitSelectedBtn} onClick={() => setSubmitting(true)}>
                <MdCheckCircle /> Submit for Approval
              </button>
              <button className={styles.clearBtn} onClick={() => setSelectedIds([])}>Clear</button>
            </div>
          )
        ) : undefined}
        headerAction={
          <button className={styles.addBtn} onClick={openAdd}><MdAdd /> New Request</button>
        }
        classNames={{
          pageHeader: styles.customPageHeader,
          headerAction: styles.customHeaderAction,
        }}
      />

      {viewing && (
        <div className="modalOverlay" onClick={() => setViewing(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Request Details</h3>
              <button className={styles.modalCloseBtn} onClick={() => setViewing(null)}><MdClose /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                {[
                  ['ID', viewing.id],
                  ['Purpose', viewing.purpose || '-'],
                  ['Requested By', viewing.requestedByUser ? `${viewing.requestedByUser.firstName || ''} ${viewing.requestedByUser.lastName || ''}`.trim() : viewing.requestedBy],
                  ['Department', viewing.departmentId || '-'],
                  ['Warehouse', viewing.warehouseId || '-'],
                  ['Status', viewing.status],
                  ['Items', `${viewing.items.length} item(s)`],
                  ['Created', viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : '-'],
                ].map(([label, value]) => (
                  <div key={String(label)} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{label}</span>
                    <span className={styles.detailValue}>{String(value)}</span>
                  </div>
                ))}
              </div>
              {viewing.items.length > 0 && (
                <SmartTable
                  columns={[
                    { header: 'Item', render: (r: any) => { const item = itemList.find(i => i.id === r.variantId || i.variants?.some(v => v.id === r.variantId)); const v = item?.variants?.find(x => x.id === r.variantId); return v?.variantName || item?.name || r.variantId?.slice(0, 8) || '-'; } },
                    { accessor: (r: any) => r.requestedQuantity, header: 'Qty' },
                    { header: 'Unit Cost', render: (r: any) => r.unitCost ?? '-' },
                    { header: 'Total', render: (r: any) => r.totalCost ?? '-' },
                    { header: 'Remarks', render: (r: any) => r.remarks || '-' },
                  ]}
                  data={viewing.items}
                  rowKey={(r: any) => r.id || r.variantId}
                />
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setViewing(null)}><MdClose /> Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
