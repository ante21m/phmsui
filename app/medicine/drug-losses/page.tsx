'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdSend, MdDelete, MdEdit, MdCheckCircle, MdBlock } from 'react-icons/md';
import { EntityForm, type FieldConfig, SmartTable, type SmartColumn, Modal } from '@/components';
import {
  useGetDrugLossesQuery,
  useGetDrugsQuery,
  useGetDispatchedDrugsQuery,
  useGetDrugStocksQuery,
  useCreateDrugLossMutation,
  useUpdateDrugLossMutation,
  useSubmitDrugLossMutation,
  useApproveDrugLossMutation,
  useRejectDrugLossMutation,
  useDeleteDrugLossMutation,
  DrugLoss,
  DrugPurchaseItem,
} from '@/store/services/drugApi';
import { formatServerDate } from '@/app/reports/reportUtils';
import styles from './DrugLosses.module.css';

const today = new Date().toISOString().split('T')[0];

export default function DrugLossesPage() {
  const { data: losses = [], isLoading } = useGetDrugLossesQuery();
  const { data: drugs = [] } = useGetDrugsQuery();
  const { data: dispatched = [] } = useGetDispatchedDrugsQuery();
  const { data: stocks = [] } = useGetDrugStocksQuery();
  const stockMap = useMemo(() => {
    const m: Record<string, DrugPurchaseItem> = {};
    for (const s of stocks as DrugPurchaseItem[]) m[s.id] = s;
    return m;
  }, [stocks]);
  const dispatchOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const d of dispatched as any[]) {
      for (const item of d.items || []) {
        const stock = stockMap[item.purchaseItemId];
        const label = stock?.drug?.genericName
          ? `${stock.drug.genericName} - ${stock.drug.strength} (${stock.drug.dosageForm})`
          : stock?.drugName || `Item #${item.purchaseItemId}`;
        opts.push({ value: String(item.id), label });
      }
    }
    return opts;
  }, [dispatched, stockMap]);
  const [createLoss] = useCreateDrugLossMutation();
  const [updateLoss] = useUpdateDrugLossMutation();
  const [submitLoss] = useSubmitDrugLossMutation();
  const [approveLoss] = useApproveDrugLossMutation();
  const [rejectLoss] = useRejectDrugLossMutation();
  const [deleteLoss] = useDeleteDrugLossMutation();

  const [tab, setTab] = useState<'draft' | 'submitted' | 'approved' | 'rejected'>('draft');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DrugLoss | null>(null);
  const [viewing, setViewing] = useState<DrugLoss | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const approved = (losses as DrugLoss[]).filter(l => l.status === 'Approved');
  const rejected = (losses as DrugLoss[]).filter(l => l.status === 'Rejected');
  const drafts = (losses as DrugLoss[]).filter(l => l.status === 'Draft');
  const forReview = (losses as DrugLoss[]).filter(l => l.status === 'Submitted');
  const activeData = tab === 'draft' ? drafts : tab === 'submitted' ? forReview : tab === 'approved' ? approved : rejected;

  const switchTab = (t: 'draft' | 'submitted' | 'approved' | 'rejected') => { setTab(t); setSelectedIds(new Set()); };

  const formFields = useMemo<FieldConfig[]>(() => [
    { name: 'dispatchDetailId', label: 'Dispatch Drug', type: 'select', searchable: true, required: true, placeholder: 'Select Dispatch drug', options: dispatchOptions, span: 6 },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '1', min: 1, span: 6 },
    { name: 'lossDate', label: 'Loss Date', type: 'date', span: 6 },
    { name: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'e.g. Broken during handling', span: 12 },
  ], [dispatchOptions]);

  const toEntity = (loss: DrugLoss | null): Record<string, any> | null => {
    if (!loss) return null;
    return {
      dispatchDetailId: loss.dispatchDetailId ? String(loss.dispatchDetailId) : '',
      quantity: Number(loss.quantity),
      reason: loss.reason,
      lossDate: loss.lossDate ? loss.lossDate.split('T')[0] : today,
    };
  };

  const openAddForm = () => { setEditing(null); setFormOpen(true); };
  const openEditForm = (loss: DrugLoss) => { setEditing(loss); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSave = async (values: Record<string, any>) => {
    try {
      const payload = {
        dispatchDetailId: values.dispatchDetailId || undefined,
        quantity: Number(values.quantity),
        reason: values.reason.trim(),
        lossDate: values.lossDate || undefined,
      };
      if (editing) {
        await updateLoss({ id: editing.id, ...payload }).unwrap();
        toast.success('Drug loss updated');
      } else {
        await createLoss(payload).unwrap();
        toast.success('Drug loss recorded');
      }
      closeForm();
    } catch { toast.error(editing ? 'Failed to update' : 'Failed to record'); }
  };

  const handleBulkSubmit = async () => {
    setBulkLoading(true);
    try {
      for (const id of Array.from(selectedIds)) await submitLoss(id).unwrap();
      toast.success(`${selectedIds.size} request(s) submitted for review`);
      setSelectedIds(new Set());
    } catch { toast.error('Failed to submit'); }
    finally { setBulkLoading(false); }
  };

  const handleDelete = async (id: string) => { try { await deleteLoss(id).unwrap(); toast.success('Loss deleted'); } catch { toast.error('Failed to delete'); } };
  const handleSubmit = async (id: string) => { try { await submitLoss(id).unwrap(); toast.success('Loss submitted for review'); } catch { toast.error('Failed to submit'); } };
  const handleApprove = async (id: string) => { try { await approveLoss(id).unwrap(); toast.success('Approved'); } catch { toast.error('Failed to approve'); } };
  const handleReject = async (id: string) => { try { await rejectLoss({ id }).unwrap(); toast.success('Rejected'); } catch { toast.error('Failed to reject'); } };

  const statusColor = (s: string) => {
    switch (s) {
      case 'Draft': return styles.statusDraft;
      case 'Submitted': return styles.statusSubmitted;
      case 'Approved': return styles.statusApproved;
      case 'Rejected': return styles.statusRejected;
      default: return '';
    }
  };

  const columns = useMemo<SmartColumn<DrugLoss>[]>(
    () => {
      const cols: SmartColumn<DrugLoss>[] = [];
      if (tab === 'draft') {
        cols.push({
          header: <input type="checkbox" checked={activeData.length > 0 && selectedIds.size === activeData.length}
            onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(activeData.map(r => r.id))); else setSelectedIds(new Set()); }}
          />,
          width: '36px', textAlign: 'center',
          render: (row) => (
            <input type="checkbox" checked={selectedIds.has(row.id)}
              onChange={(e) => { const next = new Set(selectedIds); e.target.checked ? next.add(row.id) : next.delete(row.id); setSelectedIds(next); }} />
          ),
        });
      }
      cols.push(
        { accessor: 'dispatchDetailId', header: 'Drug', sortable: true, render: (row) => {
          for (const d of dispatched as any[]) {
            const item = d.items?.find((i: any) => i.id === row.dispatchDetailId);
            if (item) {
              const stock = stockMap[item.purchaseItemId];
              return stock?.drug?.genericName ? `${stock.drug.genericName} - ${stock.drug.strength} (${stock.drug.dosageForm})` : stock?.drugName || `Item #${item.purchaseItemId}`;
            }
          }
          return row.drug?.genericName || '—';
        } },
        { accessor: 'quantity', header: 'Qty Lost', sortable: true },
        { accessor: 'reason', header: 'Reason', sortable: true },
        { accessor: 'status', header: 'Status', sortable: true, render: (row) => <span className={`${styles.statusBadge} ${statusColor(row.status)}`}>{row.status}</span> },
        { accessor: 'lossDate', header: 'Loss Date', sortable: true, textAlign: 'right', render: (row) => formatServerDate(row.lossDate) },
        {
          header: 'Actions', textAlign: 'center',
          render: (row) => {
            const btns: React.ReactNode[] = [];
            if (row.status === 'Draft') {
              btns.push(
                <button key="submit" className={styles.actionSubmit} onClick={() => handleSubmit(row.id)} title="Submit for Review"><MdSend /></button>,
                <button key="edit" className={styles.actionEdit} onClick={() => openEditForm(row)} title="Edit"><MdEdit /></button>,
                <button key="delete" className={styles.actionDelete} onClick={() => handleDelete(row.id)} title="Delete"><MdDelete /></button>,
              );
            } else if (row.status === 'Submitted') {
              // no actions — review happens in Drug Loss Review
            }
            return <span className={styles.actionBtns}>{btns}</span>;
          },
        },
      );
      return cols;
    },
    [tab, activeData, selectedIds]
  );

  return (
    <div className={styles.page}>
      {formOpen && (
        <EntityForm
          entityName="Drug Loss"
          entity={editing ? toEntity(editing) : null}
          fields={formFields}
          onSubmit={handleSave}
          onCancel={closeForm}
          submitLabel={editing ? 'Update' : 'Save'}
        />
      )}

      <div className={styles.pageTitle}>
        <h2>Drug Losses</h2>
        <button className={styles.addBtn} onClick={openAddForm}><MdAdd /> Add Loss</button>
      </div>

      <div className={styles.tabs}>
        {(['draft', 'submitted', 'approved', 'rejected'] as const).map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => switchTab(t)}>
            {t === 'submitted' ? 'Submit' : t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={styles.tabCount}>{t === 'draft' ? drafts.length : t === 'submitted' ? forReview.length : t === 'approved' ? approved.length : rejected.length}</span>
          </button>
        ))}
      </div>

      <h2 className={styles.printTitle}>Drug Losses</h2>

      <SmartTable
        title="" data={activeData} columns={columns} isLoading={isLoading}
        rowKey={(row) => row.id} withSearch withPagination withRowNumbers defaultPageSize={25}
        selectionBar={tab === 'draft' && selectedIds.size > 0 ? (
          <div className={styles.selectionBar}>
            <span>{selectedIds.size} selected</span>
            <button className={styles.submitSelectedBtn} onClick={handleBulkSubmit} disabled={bulkLoading}><MdSend /> {bulkLoading ? 'Submitting...' : 'Submit for Review'}</button>
            <button className={styles.clearBtn} onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        ) : undefined}
        emptyMessage={`No ${tab} drug losses.`}
        classNames={{ page: styles.smartRoot }}
      />

      <Modal open={!!viewing} title="Drug Loss Details" onClose={() => setViewing(null)} maxWidth="500px">
        {viewing && (
          <div className={styles.modalBody}>
            <div className={styles.detailGrid}>
              {[
                ['Drug', viewing.drug?.genericName || '—'],
                ['Quantity Lost', viewing.quantity],
                ['Reason', viewing.reason],
                ['Loss Date', formatServerDate(viewing.lossDate)],
                ['Status', viewing.status],
              ].map(([label, value]) => (
                <div key={String(label)} className={styles.detailRow}>
                  <span className={styles.detailLabel}>{label}</span>
                  <span className={styles.detailValue}>{value}</span>
                </div>
              ))}
              {viewing.rejectionReason && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Rejection Reason</span>
                  <span className={styles.detailValue} style={{ color: '#d32f2f' }}>{viewing.rejectionReason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
