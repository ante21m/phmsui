'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdCheckCircle, MdClose, MdVisibility } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetInventoryApprovalsQuery,
  useUpdateInventoryApprovalMutation,
  InventoryApprovalStatus,
  type InventoryApproval,
  type InventoryApprovalItem,
} from '@/store/services/inventoryApprovalApi';
import styles from './InventoryApprovals.module.css';

const statusLabel: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'statusPending' },
  APPROVED: { label: 'Approved', className: 'statusApproved' },
  REJECTED: { label: 'Rejected', className: 'statusRejected' },
};

const fmt = (n: any) => { const v = Number(n ?? 0); return isNaN(v) ? '0.00' : v.toFixed(2); };

export default function InventoryApprovalsPage() {
  const { data: res, isLoading, refetch } = useGetInventoryApprovalsQuery({});
  const approvals = res?.data ?? [];
  const [updateApproval] = useUpdateInventoryApprovalMutation();

  const [approvingRow, setApprovingRow] = useState<InventoryApproval | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<InventoryApproval | null>(null);
  const [itemQty, setItemQty] = useState<Record<string, { approvedQuantity: number; issuedQuantity: number; confirmedQuantity: number }>>({});

  const openApprove = (row: InventoryApproval) => {
    setApprovingRow(row);
    setApproveComment('');
    const qty: Record<string, { approvedQuantity: number; issuedQuantity: number; confirmedQuantity: number }> = {};
    row.request?.items?.forEach(it => {
      qty[it.id] = {
        approvedQuantity: it.approvedQuantity || 0,
        issuedQuantity: it.issuedQuantity || 0,
        confirmedQuantity: it.confirmedQuantity || 0,
      };
    });
    setItemQty(qty);
  };

  const closeApprove = () => { setApprovingRow(null); setApproveComment(''); setItemQty({}); };

  const handleApprove = async () => {
    if (!approvingRow) return;
    setSaving(true);
    try {
      await updateApproval({ id: approvingRow.id, status: InventoryApprovalStatus.APPROVED, comment: approveComment || undefined }).unwrap();
      toast.success('Approval confirmed');
      closeApprove();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to approve');
    } finally { setSaving(false); }
  };

  const columns = useMemo<SmartColumn<InventoryApproval>[]>(
    () => [
      {
        header: 'Requester',
        render: (row) => {
          const u = row.request?.requestedByUser;
          return u ? `${u.firstName || ''} ${u.fatherName || ''}`.trim() || '-' : row.requestId?.slice(0, 8) || '-';
        },
      },
      {
        header: 'Approved By',
        render: (row) => {
          const u = row.approvedByUser;
          return u ? `${u.firstName || ''} ${u.fatherName || ''}`.trim() || '-' : row.approvedBy?.slice(0, 8) || '-';
        },
      },
      {
        accessor: 'status', header: 'Status', sortable: true,
        render: (row) => {
          const s = statusLabel[row.status] || { label: row.status, className: '' };
          return <span className={`${styles.statusBadge} ${styles[s.className] || ''}`}>{s.label}</span>;
        },
      },
      {
        header: 'Comment',
        render: (row) => row.comment || '—',
      },
      {
        header: 'Actions',
        width: '80px',
        textAlign: 'right',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.actionView} onClick={() => setViewing(row)} title="View"><MdVisibility size={14} /></button>
            {row.status === 'PENDING' && (
              <button className={styles.actionApprove} onClick={() => openApprove(row)} title="Approve">
                <MdCheckCircle size={14} />
              </button>
            )}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className={styles.page}>
      <SmartTable
        title="Inventory Approvals"
        data={approvals}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25}
        emptyMessage="No approvals found."
        selectionBar={approvingRow ? (
          <div className={styles.approvalBar}>
            <div className={styles.approvalBarHeader}>
              <span className={styles.approvalBarTitle}>Approve request from <strong>{(approvingRow.request?.requestedByUser
  ? `${approvingRow.request.requestedByUser.firstName || ''} ${approvingRow.request.requestedByUser.fatherName || ''}`.trim()
  : approvingRow.requestId?.slice(0, 8) || '')}</strong></span>
              <button className={styles.approvalBarClose} onClick={closeApprove}><MdClose /></button>
            </div>

            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Requested</th>
                  <th>Approved</th>
                  <th>Issued</th>
                  <th>Confirmed</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(approvingRow.request?.items ?? []).map((it: InventoryApprovalItem) => (
                  <tr key={it.id}>
                    <td>{it.variantId?.slice(0, 8) || '-'}</td>
                    <td>{it.requestedQuantity ?? 0}</td>
                    <td>
                      <input type="number" min={0}
                        value={(itemQty[it.id]?.approvedQuantity ?? it.approvedQuantity ?? 0).toString()}
                        onChange={e => setItemQty(prev => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], approvedQuantity: Number(e.target.value) || 0 },
                        }))}
                        className={styles.qtyInput} />
                    </td>
                    <td>
                      <input type="number" min={0}
                        value={(itemQty[it.id]?.issuedQuantity ?? it.issuedQuantity ?? 0).toString()}
                        onChange={e => setItemQty(prev => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], issuedQuantity: Number(e.target.value) || 0 },
                        }))}
                        className={styles.qtyInput} />
                    </td>
                    <td>
                      <input type="number" min={0}
                        value={(itemQty[it.id]?.confirmedQuantity ?? it.confirmedQuantity ?? 0).toString()}
                        onChange={e => setItemQty(prev => ({
                          ...prev,
                          [it.id]: { ...prev[it.id], confirmedQuantity: Number(e.target.value) || 0 },
                        }))}
                        className={styles.qtyInput} />
                    </td>
                    <td>{fmt(it.unitCost)}</td>
                    <td>{fmt(it.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.inlineField} style={{ marginTop: 10 }}>
              <label>Comment (optional)</label>
              <textarea value={approveComment} onChange={e => setApproveComment(e.target.value)}
                placeholder="Add a comment" />
            </div>
            <div className={styles.inlineActions} style={{ marginTop: 8 }}>
              <button className={styles.cancelBtn} onClick={closeApprove}>Cancel</button>
              <button className={styles.approveBtn} onClick={handleApprove} disabled={saving}>
                <MdCheckCircle /> {saving ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        ) : undefined}
      />

      {viewing && (
        <div className="modalOverlay" onClick={() => setViewing(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Approval Details</h3>
              <button className={styles.modalCloseBtn} onClick={() => setViewing(null)}><MdClose /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                {[
                  ['Requested By', viewing.request?.requestedByUser
                    ? `${viewing.request.requestedByUser.firstName || ''} ${viewing.request.requestedByUser.fatherName || ''}`.trim()
                    : viewing.requestId?.slice(0, 8) || '-'],
                  ['Approved By', viewing.approvedByUser
                    ? `${viewing.approvedByUser.firstName || ''} ${viewing.approvedByUser.fatherName || ''}`.trim()
                    : viewing.approvedBy?.slice(0, 8) || '-'],
                  ['Status', viewing.status],
                  ['Comment', viewing.comment || '-'],
                  ['Approval Date', viewing.approvalDate ? new Date(viewing.approvalDate).toLocaleString() : '-'],
                ].map(([label, value]) => (
                  <div key={String(label)} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{label}</span>
                    <span className={styles.detailValue}>{String(value)}</span>
                  </div>
                ))}
              </div>
              {(viewing.request?.items ?? []).length > 0 && (
                <>
                  <h4 style={{ margin: '12px 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--teal-dark)' }}>Items</h4>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th>Requested</th>
                        <th>Approved</th>
                        <th>Issued</th>
                        <th>Confirmed</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewing.request?.items ?? []).map((it: any) => (
                        <tr key={it.id}>
                    <td>{it.variant?.item?.name || it.variantId?.slice(0, 8) || '-'}</td>
                          <td>{it.requestedQuantity ?? 0}</td>
                          <td>{it.approvedQuantity ?? 0}</td>
                          <td>{it.issuedQuantity ?? 0}</td>
                          <td>{it.confirmedQuantity ?? 0}</td>
                          <td>{fmt(it.unitCost)}</td>
                          <td>{fmt(it.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
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
