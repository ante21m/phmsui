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
import { useGetItemsQuery, useRejectInventoryRequestMutation, useApproveInventoryRequestMutation } from '@/store/services/drugApi';
import styles from './InventoryApprovals.module.css';

const statusLabel: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'statusPending' },
  APPROVED: { label: 'Approved', className: 'statusApproved' },
  REJECTED: { label: 'Rejected', className: 'statusRejected' },
};

export default function InventoryApprovalsPage() {
  const { data: res, isLoading, refetch } = useGetInventoryApprovalsQuery({});
  const approvals = res?.data ?? [];
  const { data: items } = useGetItemsQuery();
  const itemList = items ?? [];

  const variantNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of itemList) {
      for (const v of (item.variants ?? [])) {
        map.set(v.id, v.variantName || item.name || v.id);
      }
      map.set(item.id, item.name || item.id);
    }
    return map;
  }, [itemList]);

  const getVariantName = (variantId: string) => variantNameMap.get(variantId) || variantId.slice(0, 8);

  const [viewing, setViewing] = useState<InventoryApproval | null>(null);
  const [viewAction, setViewAction] = useState<'none' | 'approve' | 'reject'>('none');
  const [approveComment, setApproveComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [reject] = useRejectInventoryRequestMutation();
  const [approve] = useApproveInventoryRequestMutation();
  const [itemQty, setItemQty] = useState<Record<string, number>>({});

  const initApprove = () => {
    const qty: Record<string, number> = {};
    viewing?.request?.items?.forEach(it => { qty[it.variantId] = it.approvedQuantity || it.requestedQuantity; });
    setItemQty(qty);
    setApproveComment('');
    setViewAction('approve');
  };

  const handleApprove = async () => {
    if (!viewing) return;
    const reqId = viewing.requestId;
    if (!reqId) { toast.error('No request ID'); return; }
    setSaving(true);
    try {
      const modifiedItems = (viewing.request?.items ?? []).map(it => ({
        variantId: it.variantId,
        approvedQuantity: itemQty[it.variantId] ?? it.approvedQuantity ?? it.requestedQuantity,
      }));
      await approve({ id: reqId, comment: approveComment || undefined, modifiedItems }).unwrap();
      toast.success('Approval confirmed');
      setViewing(null);
      setViewAction('none');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to approve');
    } finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!viewing) return;
    if (!rejectComment.trim()) { toast.error('Reason is required'); return; }
    const reqId = viewing.requestId;
    if (!reqId) { toast.error('No request ID'); return; }
    setRejectSaving(true);
    try {
      await reject(reqId).unwrap();
      toast.success('Request rejected');
      setViewing(null);
      setViewAction('none');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to reject');
    } finally { setRejectSaving(false); }
  };

  const closeView = () => { setViewing(null); setViewAction('none'); setApproveComment(''); setRejectComment(''); };

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
        width: '60px',
        textAlign: 'right',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.actionView} onClick={() => { setViewing(row); setViewAction('none'); }} title="View"><MdVisibility size={14} /></button>
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
      />

      {viewing && (
        <div className={styles.modalOverlay} onClick={closeView}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Approval Details</h3>
              <button className={styles.modalCloseBtn} onClick={closeView}><MdClose /></button>
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
                  {viewAction === 'approve' ? (
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Requested</th>
                          <th>Approved Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewing.request?.items ?? []).map((it: any) => (
                          <tr key={it.id}>
                            <td>{getVariantName(it.variantId)}</td>
                            <td>{it.requestedQuantity ?? 0}</td>
                            <td>
                              <input type="number" min={0}
                                value={(itemQty[it.variantId] ?? it.approvedQuantity ?? it.requestedQuantity ?? 0).toString()}
                                onChange={e => setItemQty(prev => ({ ...prev, [it.variantId]: Number(e.target.value) || 0 }))}
                                className={styles.qtyInput} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Requested</th>
                          <th>Approved</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewing.request?.items ?? []).map((it: any) => (
                          <tr key={it.id}>
                            <td>{getVariantName(it.variantId)}</td>
                            <td>{it.requestedQuantity ?? 0}</td>
                            <td>{it.approvedQuantity ?? 0}</td>
                            <td>{it.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {viewAction === 'approve' && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Comment (optional)</label>
                  <textarea value={approveComment} onChange={e => setApproveComment(e.target.value)}
                    placeholder="Add a comment" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
              {viewAction === 'reject' && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Reason <span style={{ color: '#c62828' }}>*</span></label>
                  <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)}
                    placeholder="Reason for rejection (required)" style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              {viewAction === 'none' && viewing.status === 'PENDING' && (
                <>
                  <button className={styles.rejectBtn} onClick={() => { setViewAction('reject'); setRejectComment(''); }}><MdClose /> Reject</button>
                  <button className={styles.approveBtn} onClick={initApprove}><MdCheckCircle /> Approve</button>
                </>
              )}
              {viewAction === 'approve' && (
                <>
                  <button className={styles.cancelBtn} onClick={() => setViewAction('none')}>Back</button>
                  <button className={styles.approveBtn} onClick={handleApprove} disabled={saving}>
                    <MdCheckCircle /> {saving ? 'Approving...' : 'Confirm Approve'}
                  </button>
                </>
              )}
              {viewAction === 'reject' && (
                <>
                  <button className={styles.cancelBtn} onClick={() => setViewAction('none')}>Back</button>
                  <button className={styles.rejectBtn} onClick={handleReject} disabled={rejectSaving}>
                    <MdClose /> {rejectSaving ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </>
              )}
              {viewAction === 'none' && (
                <button className={styles.cancelBtn} onClick={closeView}><MdClose /> Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
