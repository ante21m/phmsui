'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { MdCheckCircle, MdCancel, MdArrowBack } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetDispatchedItemsQuery, useGetItemStocksQuery, useConfirmItemDispatchMutation, useRejectItemDispatchMutation, ItemDispatch, ItemDispatchItem, ItemPurchaseItem } from '@/store/services/drugApi';
import styles from './Detail.module.css';

export default function ItemDispatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: dispatched = [], isLoading } = useGetDispatchedItemsQuery();
  const { data: stocks = [] } = useGetItemStocksQuery();
  const stockMap = useMemo(() => {
    const m: Record<string, ItemPurchaseItem> = {};
    for (const s of stocks as ItemPurchaseItem[]) m[s.id] = s;
    return m;
  }, [stocks]);
  const [confirmDispatch] = useConfirmItemDispatchMutation();
  const [rejectDispatch] = useRejectItemDispatchMutation();
  const [rejectComment, setRejectComment] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const dispatch = (dispatched as ItemDispatch[]).find(d => d.id === id);

  const enrichedItems = useMemo(() => (dispatch?.items || []).map((item: ItemDispatchItem) => {
    const si = stockMap[item.purchaseItemId];
    return { ...item, _item: si?.item?.name ? (si.itemName && si.itemName !== si.item.name ? si.itemName : `${si.item.name} (${si.item.itemCode})`) : si?.itemName || `Item #${item.purchaseItemId}`, _batch: si?.batchNo || '—', _stock: si };
  }), [dispatch, stockMap]);

  const handleConfirm = async () => {
    try {
      await confirmDispatch(id).unwrap();
      toast.success('Dispatch confirmed');
      router.push('/medicine/item-dispatch-confirmation');
    } catch {
      toast.error('Confirmation failed');
    }
  };

  const handleReject = async () => {
    try {
      await rejectDispatch({ id, comment: rejectComment || undefined }).unwrap();
      toast.success('Dispatch rejected');
      router.push('/medicine/item-dispatch-confirmation');
    } catch {
      toast.error('Rejection failed');
    }
  };

  if (isLoading) return <div className={styles.page}><p>Loading...</p></div>;
  if (!dispatch) return <div className={styles.page}><p>Dispatch not found.</p></div>;

  return (
    <div className={styles.page}>
      <a className={styles.backLink} onClick={() => router.push('/medicine/item-dispatch-confirmation')} style={{ cursor: 'pointer' }}>
        <MdArrowBack /> Back to Dispatch Confirmation
      </a>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Dispatch Details</h3>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.detailGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Dispatch Date:</span>
              <span className={styles.detailValue}>{dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toLocaleDateString() : '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Dispatched By:</span>
              <span className={styles.detailValue}>{dispatch.dispatchedByUser ? `${dispatch.dispatchedByUser.firstName} ${dispatch.dispatchedByUser.fatherName}` : dispatch.dispatchedBy || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Dispatched To:</span>
              <span className={styles.detailValue}>{dispatch.dispatchedToUser ? `${dispatch.dispatchedToUser.firstName} ${dispatch.dispatchedToUser.fatherName}` : dispatch.dispatchedTo || '—'}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={`${styles.statusBadge} ${dispatch.dispatchStatus === 'Confirmed' ? styles.statusConfirmed : dispatch.dispatchStatus === 'Rejected' ? styles.statusRejected : styles.statusPending}`}>
                {dispatch.dispatchStatus}
              </span>
            </div>
          </div>

          <SmartTable
            data={enrichedItems}
            columns={[
              { header: 'Item Name', accessor: '_item' as any, sortable: true },
              { header: 'Batch', accessor: '_batch' as any, sortable: true },
              { header: 'Expiry', render: (r: any) => r._stock?.expiryDate ? new Date(r._stock.expiryDate).toLocaleDateString() : '—', sortable: true },
              { header: 'Stock Qty', render: (r: any) => r._stock?.quantity ?? '—', textAlign: 'center' },
              { header: 'Dispatch Qty', accessor: 'quantity' as any, textAlign: 'center', sortable: true },
              { header: 'Purchase Price', render: (r: any) => r._stock?.purchasePrice != null ? Number(r._stock.purchasePrice).toLocaleString() : '—' },
              { header: 'Sale Price', render: (r: any) => r._stock?.salePrice != null ? Number(r._stock.salePrice).toLocaleString() : '—' },
              { header: 'Qty Remaining', render: (r: any) => r._stock?.qtyRemaining ?? '—', textAlign: 'center', sortable: true },
            ]}
            rowKey={(r: any) => r.id}
            withSearch={false}
            withPagination={enrichedItems.length > 10}
            hideEntries
            withRowNumbers
            classNames={{ pagination: styles.miniPagination, paginationInfo: styles.miniInfo }}
          />

          {dispatch.dispatchStatus === 'Pending' && (
            <>
              {rejecting && (
                <div className={styles.rejectCommentWrap}>
                  <label className={styles.rejectLabel}>Rejection reason: <span style={{color: 'red'}}>*</span></label>
                  <textarea className={styles.rejectTextarea} value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)} placeholder="Enter reason for rejection..." rows={2} />
                </div>
              )}
              <div className={styles.actions}>
                {!rejecting && (
                  <button className={styles.confirmBtn} onClick={handleConfirm}><MdCheckCircle /> Confirm</button>
                )}
                {rejecting ? (
                  <button className={styles.submitBtn} onClick={handleReject}><MdCancel /> Submit</button>
                ) : (
                  <button className={styles.rejectBtn} onClick={() => setRejecting(true)}><MdCancel /> Reject</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
