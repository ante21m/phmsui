'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdCheckCircle, MdCancel, MdClose } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetDrugLossesQuery, useGetDispatchedDrugsQuery, useGetDrugStocksQuery, useGetDrugsQuery, useApproveDrugLossMutation, useRejectDrugLossMutation, DrugLoss, DrugPurchaseItem, DrugDispatch } from '@/store/services/drugApi';
import styles from './DrugLossReview.module.css';

export default function DrugLossReviewPage() {
  const { data: losses = [], isLoading } = useGetDrugLossesQuery();
  const { data: dispatched = [] } = useGetDispatchedDrugsQuery();
  const { data: stocks = [] } = useGetDrugStocksQuery();
  const { data: drugs = [] } = useGetDrugsQuery();
  const drugMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of drugs as any[]) m[d.id] = d;
    return m;
  }, [drugs]);
  const stockMap = useMemo(() => {
    const m: Record<string, DrugPurchaseItem> = {};
    for (const s of stocks as DrugPurchaseItem[]) m[s.id] = s;
    return m;
  }, [stocks]);
  const [approveLoss] = useApproveDrugLossMutation();
  const [rejectLoss] = useRejectDrugLossMutation();

  const [tab, setTab] = useState<'review' | 'completed'>('review');

  const pending = (losses as DrugLoss[]).filter((d) => d.status === 'Submitted');
  const completed = (losses as DrugLoss[]).filter((d) => d.status === 'Approved' || d.status === 'Rejected');
  const activeData = tab === 'review' ? pending : completed;

  const [viewing, setViewing] = useState<DrugLoss | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);

  const drugFromDispatch = (dispatchDetailId: string | null | undefined): string => {
    if (!dispatchDetailId) return '—';
    for (const d of dispatched as any[]) {
      const item = d.items?.find((i: any) => i.id === dispatchDetailId);
      if (item) {
        const stock = stockMap[item.purchaseItemId];
        return stock?.drug?.genericName ? `${stock.drug.genericName} ${stock.drug.dosageForm} - ${stock.drug.strength}` : stock?.drugName || `Item #${item.purchaseItemId}`;
      }
    }
    return '—';
  };

  const stockLabel = (s: DrugPurchaseItem) => {
    const dm = drugMap[s.drugId ?? ''];
    return dm ? `${dm.genericName} ${dm.dosageForm} - ${dm.strength}` : s.drugName;
  };

  const dispatchForLoss = (loss: DrugLoss): DrugDispatch | null => {
    if (!loss.dispatchDetailId) return null;
    for (const d of dispatched as DrugDispatch[]) {
      if (d.items?.some((i: any) => i.id === loss.dispatchDetailId)) return d;
    }
    return null;
  };

  const dispatchedLabel = (d: DrugDispatch) => {
    const byName = d.dispatchedByUser ? `${d.dispatchedByUser.firstName} ${d.dispatchedByUser.fatherName}` : d.dispatchedBy || '';
    const toName = d.dispatchedToUser ? `${d.dispatchedToUser.firstName} ${d.dispatchedToUser.fatherName}` : d.dispatchedTo || '';
    return { byName, toName };
  };

  const handleApprove = async (id: string) => {
    try { await approveLoss(id).unwrap(); toast.success('Loss approved'); setViewing(null); }
    catch { toast.error('Approval failed'); }
  };

  const handleRejectClick = (id: string) => {
    if (rejecting !== id) { setRejecting(id); setRejectComment(''); return; }
    if (!rejectComment.trim()) { toast.error('Please provide a reason for rejection'); return; }
    handleReject(id);
  };

  const handleReject = async (id: string) => {
    try {
      await rejectLoss({ id, rejectionReason: rejectComment }).unwrap();
      toast.success('Loss rejected');
      setViewing(null);
      setRejecting(null);
      setRejectComment('');
    }
    catch { toast.error('Rejection failed'); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'Submitted': return styles.statusPending;
      case 'Approved': return styles.statusApproved;
      case 'Rejected': return styles.statusRejected;
      default: return '';
    }
  };

  const columns = useMemo<SmartColumn<DrugLoss>[]>(
    () => [
      {
        accessor: 'dispatchDetailId' as any,
        header: 'Dispatch Drug',
        sortable: true,
        render: (row) => drugFromDispatch(row.dispatchDetailId),
      },
      { accessor: 'quantity', header: 'Qty Lost', sortable: true },
      { accessor: 'reason', header: 'Reason', sortable: true },
      {
        accessor: 'lossDate',
        header: 'Loss Date',
        sortable: true,
        render: (row) => row.lossDate ? new Date(row.lossDate).toLocaleDateString() : '—',
      },
      {
        accessor: 'status',
        header: 'Status',
        sortable: true,
        render: (row) => <span className={`${styles.statusBadge} ${statusColor(row.status)}`}>{row.status}</span>,
      },
      {
        header: 'Actions',
        textAlign: 'center',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.actionView} onClick={() => setViewing(row)} title="View"><MdCheckCircle /></button>
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>
        <h2>Drug Loss Review</h2>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'review' ? styles.tabActive : ''}`} onClick={() => setTab('review')}>
          Pending Review
          <span className={styles.tabCount}>{pending.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : ''}`} onClick={() => setTab('completed')}>
          Completed Review
          <span className={styles.tabCount}>{completed.length}</span>
        </button>
      </div>

      <h2 className={styles.printTitle}>Drug Loss Review</h2>

      <SmartTable
        title="" data={activeData} columns={columns} isLoading={isLoading}
        rowKey={(row) => row.id} withSearch withPagination withRowNumbers defaultPageSize={25}
        emptyMessage={tab === 'review' ? 'No pending losses to review.' : 'No completed reviews.'}
      />

      {viewing && (() => {
        const dispatch = dispatchForLoss(viewing);
        const labels = dispatch ? dispatchedLabel(dispatch) : { byName: '', toName: '' };

        return (
          <div className={styles.modalOverlay} onClick={() => setViewing(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Loss Details</h3>
                <button className={styles.formCloseBtn} onClick={() => setViewing(null)}><MdClose /></button>
              </div>
              <div className={styles.modalBody}>
                <table className={styles.detailTable}>
                  <tbody>
                    <tr>
                      <td className={styles.detailLabel}>Drug</td>
                      <td className={styles.detailValue}>{drugFromDispatch(viewing.dispatchDetailId)}</td>
                      <td className={styles.detailLabel}>Dispatch Date</td>
                      <td className={styles.detailValue}>{dispatch ? (dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toLocaleDateString() : '—') : '—'}</td>
                    </tr>
                    <tr>
                      <td className={styles.detailLabel}>Quantity Lost</td>
                      <td className={styles.detailValue}>{viewing.quantity}</td>
                      <td className={styles.detailLabel}>Dispatched By</td>
                      <td className={styles.detailValue}>{dispatch ? (labels.byName || '—') : '—'}</td>
                    </tr>
                    <tr>
                      <td className={styles.detailLabel}>Reason</td>
                      <td className={styles.detailValue}>{viewing.reason}</td>
                      <td className={styles.detailLabel}>Dispatched To</td>
                      <td className={styles.detailValue}>{dispatch ? (labels.toName || '—') : '—'}</td>
                    </tr>
                    <tr>
                      <td className={styles.detailLabel}>Loss Date</td>
                      <td className={styles.detailValue}>{viewing.lossDate ? new Date(viewing.lossDate).toLocaleDateString() : '—'}</td>
                      <td className={styles.detailLabel}>Status</td>
                      <td className={styles.detailValue}>{viewing.status}</td>
                    </tr>
                    {viewing.rejectionReason && (
                      <tr>
                        <td className={styles.detailLabel}>Rejection Reason</td>
                        <td className={styles.detailValue} colSpan={3} style={{ color: '#d32f2f' }}>{viewing.rejectionReason}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {dispatch && (dispatch.items || []).length > 0 && (
                  <div className={styles.itemsTableWrap}>
                    <table className={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th className={styles.colDrugHeader}>Drug</th>
                          <th>Batch No</th>
                          <th>Expiry</th>
                          <th>Stock Qty</th>
                          <th>Dispatch Qty</th>
                          <th>Purchase Price</th>
                          <th>Sale Price</th>
                          <th>Qty Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatch.items.map((item: any) => {
                          const stock = (stocks as DrugPurchaseItem[]).find(s => s.id === item.purchaseItemId);
                          return (
                            <tr key={item.id}>
                              <td className={styles.colDrug}>{stock ? stockLabel(stock) : `Stock #${item.purchaseItemId}`}</td>
                              <td>{stock?.batchNo || '—'}</td>
                              <td>{stock?.expiryDate ? new Date(stock.expiryDate).toLocaleDateString() : '—'}</td>
                              <td>{stock?.quantity ?? '—'}</td>
                              <td>{item.quantity}</td>
                              <td>{stock?.purchasePrice != null ? Number(stock.purchasePrice).toLocaleString() : '—'}</td>
                              <td>{stock?.salePrice != null ? Number(stock.salePrice).toLocaleString() : '—'}</td>
                              <td>{item.currentQty ?? stock?.qtyRemaining ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'review' && viewing.status === 'Submitted' && rejecting === viewing.id && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontWeight: 500, fontSize: 12, display: 'block', marginBottom: 2 }}>Rejection Reason *</label>
                    <textarea
                      className={styles.richTextarea}
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                )}
              </div>

              {tab === 'review' && viewing.status === 'Submitted' && (
                <div className={styles.modalFooter}>
                  <button className={styles.btnReject} onClick={() => handleRejectClick(viewing.id)}>
                    <MdCancel /> Reject
                  </button>
                  <button className={styles.btnApprove} onClick={() => handleApprove(viewing.id)}>
                    <MdCheckCircle /> Approve
                  </button>
                </div>
              )}

              {(!(tab === 'review' && viewing.status === 'Submitted')) && (
                <div className={styles.modalFooter}>
                  <button className={styles.closeBtn} onClick={() => setViewing(null)}>Close</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
