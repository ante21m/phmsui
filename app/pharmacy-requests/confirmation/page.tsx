'use client';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdCheckCircle, MdOutbound, MdDownload, MdBlock, MdVisibility, MdClose, MdSearch } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetPharmacyRequestsQuery,
  useApprovePharmacyRequestMutation,
  useIssuePharmacyRequestMutation,
  useRejectPharmacyRequestMutation,
  useReceivePharmacyRequestMutation,
  useGetDrugStocksQuery,
  type PharmacyRequest,
} from '@/store/services/drugApi';
import styles from './Confirmation.module.css';

export default function PharmacyRequestConfirmationPage() {
  const [tab, setTab] = useState<'pending' | 'approved' | 'issued' | 'completed'>('pending');
  const [viewing, setViewing] = useState<PharmacyRequest | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<number, string>>({});
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'available' | 'selected'>('available');
  const [availSearch, setAvailSearch] = useState('');

  const { data: all = [], isLoading } = useGetPharmacyRequestsQuery();
  const { data: stockItems = [] } = useGetDrugStocksQuery();
  const [approve] = useApprovePharmacyRequestMutation();
  const [issue] = useIssuePharmacyRequestMutation();
  const [reject] = useRejectPharmacyRequestMutation();
  const [receive] = useReceivePharmacyRequestMutation();

  const pending = useMemo(() => all.filter(r => r.status === 'Pending'), [all]);
  const approved = useMemo(() => all.filter(r => r.status === 'Approved'), [all]);
  const issued = useMemo(() => all.filter(r => r.status === 'Issued'), [all]);
  const completed = useMemo(() => all.filter(r => r.status === 'Received' || r.status === 'Rejected'), [all]);

  const availableDrugs = useMemo(() => {
    const map = new Map<string, { drugMasterId: string; drugName: string; totalStock: number }>();
    for (const s of stockItems) {
      if (!s.drugId) continue;
      const existing = map.get(s.drugId);
      if (existing) { existing.totalStock += s.qtyRemaining; }
      else { map.set(s.drugId, { drugMasterId: s.drugId, drugName: s.drug?.genericName || s.drugName, totalStock: s.qtyRemaining }); }
    }
    return Array.from(map.values());
  }, [stockItems]);

  const filteredAvailable = useMemo(() => {
    const q = availSearch.toLowerCase().trim();
    if (!q) return availableDrugs;
    return availableDrugs.filter(d => d.drugName.toLowerCase().includes(q));
  }, [availableDrugs, availSearch]);

  const openView = (row: PharmacyRequest) => {
    setViewing(row);
    setComment('');
    setDetailTab('available');
    setAvailSearch('');
    const map: Record<number, string> = {};
    for (const item of row.items) {
      if (item.id != null) {
        if (row.status === 'Pending') map[item.id] = String(item.requestedQty);
        else if (row.status === 'Approved') map[item.id] = String(item.approvedQty ?? item.requestedQty);
        else if (row.status === 'Issued') map[item.id] = String(item.issuedQty ?? item.approvedQty ?? item.requestedQty);
      }
    }
    setItemsMap(map);
  };

  const closeView = () => {
    setViewing(null); setItemsMap({}); setComment(''); setActionLoading(false);
  };

  const handleApprove = async () => {
    if (!viewing) return;
    setActionLoading(true);
    try {
      const items = viewing.items.filter(i => i.id != null).map(i => ({ id: i.id!, approvedQty: Number(itemsMap[i.id!]) }));
      await approve({ id: viewing.id, body: { comment: comment || undefined, items } }).unwrap();
      toast.success('Request approved');
      closeView();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to approve'); }
    finally { setActionLoading(false); }
  };

  const handleIssue = async () => {
    if (!viewing) return;
    setActionLoading(true);
    try {
      const items = viewing.items.filter(i => i.id != null).map(i => ({ id: i.id!, issuedQty: Number(itemsMap[i.id!]) }));
      await issue({ id: viewing.id, body: { items } }).unwrap();
      toast.success('Request issued');
      closeView();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to issue'); }
    finally { setActionLoading(false); }
  };

  const handleReceive = async () => {
    if (!viewing) return;
    setActionLoading(true);
    try {
      const items = viewing.items.filter(i => i.id != null).map(i => ({ id: i.id!, receivedQty: Number(itemsMap[i.id!]) }));
      await receive({ id: viewing.id, body: { items } }).unwrap();
      toast.success('Request received');
      closeView();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to receive'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!viewing) return;
    setActionLoading(true);
    try {
      await reject(viewing.id).unwrap();
      toast.success('Request rejected');
      closeView();
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to reject'); }
    finally { setActionLoading(false); }
  };

  const columns = useMemo<SmartColumn<PharmacyRequest>[]>(
    () => [
      {
        header: 'Request No',
        render: (row) => row.requestNo || row.id.slice(0, 8) + '...',
      },
      {
        header: 'Department',
        render: (row) => row.department?.name || row.departmentId?.slice(0, 8) || '—',
      },
      {
        header: 'Store',
        render: (row) => row.store?.name || row.storeId?.slice(0, 8) || '—',
      },
      {
        header: 'Items',
        render: (row) => `${row.items.length} item(s)`,
      },
      {
        header: 'Status',
        accessor: 'status',
        sortable: true,
        render: (row) => {
          const cls = row.status === 'Pending' ? styles.statusPending
            : row.status === 'Approved' ? styles.statusApproved
            : row.status === 'Issued' ? styles.statusIssued
            : row.status === 'Received' ? styles.statusReceived
            : styles.statusRejected;
          return <span className={cls}>{row.status}</span>;
        },
      },
      {
        header: 'Action',
        textAlign: 'right',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.viewBtn} onClick={() => openView(row)}>
              <MdVisibility /> View Details
            </button>
          </span>
        ),
      },
    ],
    [],
  );

  const tabData = tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'issued' ? issued : completed;

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>
        {tab === 'pending' ? 'Pending Approval' : tab === 'approved' ? 'Approved - Awaiting Issue' : tab === 'issued' ? 'Issued - Awaiting Receive' : 'Completed'}
      </h2>

      <div className={styles.mainLayout}>
        <div className={styles.formColumn}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`} onClick={() => setTab('pending')}>
              Pending <span className={styles.tabCount}>{pending.length}</span>
            </button>
            <button className={`${styles.tab} ${tab === 'approved' ? styles.tabActive : ''}`} onClick={() => setTab('approved')}>
              Approved <span className={styles.tabCount}>{approved.length}</span>
            </button>
            <button className={`${styles.tab} ${tab === 'issued' ? styles.tabActive : ''}`} onClick={() => setTab('issued')}>
              Issued <span className={styles.tabCount}>{issued.length}</span>
            </button>
            <button className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : ''}`} onClick={() => setTab('completed')}>
              Completed <span className={styles.tabCount}>{completed.length}</span>
            </button>
          </div>

      {/* ─── Inline approval form for Pending requests ─── */}
      {viewing && viewing.status === 'Pending' && (
        <div className={styles.inlineForm}>
          <div className={styles.inlineFormHeader}>
            <h3>Approve Request — {viewing.requestNo || viewing.id.slice(0, 8)}</h3>
            <button className={styles.formCloseBtn} onClick={closeView}><MdClose /></button>
          </div>
          <div className={styles.inlineFormBody}>
            <div className={styles.detailMiniGrid}>
              {[
                ['Request No', viewing.requestNo],
                ['Department', viewing.department?.name || viewing.departmentId || '-'],
                ['Store', viewing.store?.name || viewing.storeId || '-'],
                ['Requested By', viewing.requestedByUser ? `${viewing.requestedByUser.firstName || ''} ${viewing.requestedByUser.lastName || ''}`.trim() : viewing.requestedBy],
                ['Created', viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : '-'],
              ].map(([l, v]) => (
                <div key={String(l)} className={styles.detailMiniRow}>
                  <span className={styles.detailMiniLabel}>{l}</span>
                  <span className={styles.detailMiniValue}>{String(v)}</span>
                </div>
              ))}
            </div>

            <div className={styles.subtabs}>
              <button className={`${styles.subtab} ${detailTab === 'available' ? styles.subtabActive : ''}`} onClick={() => setDetailTab('available')}>
                Available Drugs <span className={styles.subtabCount}>{availableDrugs.length}</span>
              </button>
              <button className={`${styles.subtab} ${detailTab === 'selected' ? styles.subtabActive : ''}`} onClick={() => setDetailTab('selected')}>
                Selected Drugs <span className={styles.subtabCount}>{viewing.items.length}</span>
              </button>
            </div>

            {detailTab === 'available' && (
              <>
                <div className={styles.availSearch}>
                  <input className={styles.availSearchInput} type="text" placeholder="Search available drugs..." value={availSearch} onChange={e => setAvailSearch(e.target.value)} />
                </div>
                {filteredAvailable.length === 0 ? (
                  <div className={styles.availEmpty}>{availSearch ? 'No drugs match your search.' : 'No drug stock available.'}</div>
                ) : (
                  <table className={styles.availTable}>
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th style={{ width: 120, textAlign: 'center' }}>Available Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAvailable.map(d => (
                        <tr key={d.drugMasterId}>
                          <td>{d.drugName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={d.totalStock <= 0 ? styles.outOfStock : d.totalStock < 10 ? styles.lowStock : styles.inStock}>
                              {d.totalStock}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {detailTab === 'selected' && (
              <>
                <div style={{ marginTop: 0 }}>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th style={{ width: 80, textAlign: 'center' }}>Requested</th>
                        <th style={{ width: 90, textAlign: 'center' }}>Approved Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewing.items.map(item => (
                        <tr key={item.id || item.drugMasterId}>
                          <td>{item.drug?.genericName || item.drugMasterId}</td>
                          <td style={{ textAlign: 'center' }}>{item.requestedQty}</td>
                          <td style={{ textAlign: 'center' }}>
                            <input className={styles.approveQtyField} type="number" min={0}
                              value={item.id != null ? itemsMap[item.id] ?? item.requestedQty : item.requestedQty}
                              onChange={e => { if (item.id == null) return; setItemsMap(prev => ({ ...prev, [item.id!]: e.target.value })); }}
                              disabled={item.id == null} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className={styles.approveLabel}>Comment</label>
                  <textarea className={styles.approveComment} value={comment}
                    onChange={e => setComment(e.target.value)} placeholder="Optional approval comment" />
                </div>
              </>
            )}
          </div>
          <div className={styles.inlineFormActions}>
            <button className={styles.rejectBtn} onClick={handleReject} disabled={actionLoading}>
              <MdBlock /> {actionLoading ? 'Processing...' : 'Reject'}
            </button>
            <button className={styles.saveBtn} onClick={handleApprove} disabled={actionLoading}>
              <MdCheckCircle /> {actionLoading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>
      )}

        <SmartTable
          title=""
          data={tabData}
          columns={columns}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          withSearch withPagination withRowNumbers
          defaultPageSize={25} hideEntries
          emptyMessage="No requests found."
          classNames={{
            page: styles.customPageHeader,
            pageHeader: styles.customPageHeader,
            headerAction: styles.customHeaderAction,
          }}
        />
      </div>
      </div>

      {/* ─── Modal for non-Pending requests ─── */}
      {viewing && viewing.status !== 'Pending' && (
        <div className={styles.modalOverlay} onClick={closeView}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Request Details — {viewing.requestNo || viewing.id.slice(0, 8)}</h3>
              <button className={styles.modalCloseBtn} onClick={closeView}><MdClose /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                {[
                  ['Request No', viewing.requestNo],
                  ['Status', viewing.status],
                  ['Department', viewing.department?.name || viewing.departmentId || '-'],
                  ['Store', viewing.store?.name || viewing.storeId || '-'],
                  ['Requested By', viewing.requestedByUser ? `${viewing.requestedByUser.firstName || ''} ${viewing.requestedByUser.lastName || ''}`.trim() : viewing.requestedBy],
                  ['Created', viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : '-'],
                ].map(([label, value]) => (
                  <div key={String(label)} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{label}</span>
                    <span className={styles.detailValue}>{String(value)}</span>
                  </div>
                ))}
              </div>

              {viewing.items.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label className={styles.approveLabel}>Items</label>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Drug</th>
                        <th style={{ width: 80 }}>Requested</th>
                        <th style={{ width: 80 }}>Approved</th>
                        <th style={{ width: 80 }}>Issued</th>
                        <th style={{ width: 80 }}>Received</th>
                        {(viewing.status === 'Approved' || viewing.status === 'Issued') && (
                          <th style={{ width: 90 }}>Action Qty</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {viewing.items.map(item => {
                        const qtyField = viewing.status === 'Approved' ? 'issuedQty' : viewing.status === 'Issued' ? 'receivedQty' : null;
                        const defaultVal = viewing.status === 'Approved' ? (item.approvedQty ?? item.requestedQty)
                          : viewing.status === 'Issued' ? (item.issuedQty ?? item.approvedQty ?? item.requestedQty) : 0;
                        return (
                          <tr key={item.id || item.drugMasterId}>
                            <td>{item.drug?.genericName || item.drugMasterId}</td>
                            <td style={{ textAlign: 'center' }}>{item.requestedQty}</td>
                            <td style={{ textAlign: 'center' }}>{item.approvedQty ?? '-'}</td>
                            <td style={{ textAlign: 'center' }}>{item.issuedQty ?? '-'}</td>
                            <td style={{ textAlign: 'center' }}>{item.receivedQty ?? '-'}</td>
                            {qtyField && (
                              <td style={{ textAlign: 'center' }}>
                                <input className={styles.approveQtyInput} type="number" min={0}
                                  value={item.id != null ? itemsMap[item.id] ?? defaultVal : defaultVal}
                                  onChange={e => { if (item.id == null) return; setItemsMap(prev => ({ ...prev, [item.id!]: e.target.value })); }}
                                  disabled={item.id == null} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              {viewing.status === 'Approved' && (
                <button className={styles.saveBtn} onClick={handleIssue} disabled={actionLoading}>
                  <MdOutbound /> {actionLoading ? 'Issuing...' : 'Issue'}
                </button>
              )}
              {viewing.status === 'Issued' && (
                <button className={styles.saveBtn} onClick={handleReceive} disabled={actionLoading}>
                  <MdDownload /> {actionLoading ? 'Receiving...' : 'Receive'}
                </button>
              )}
              {(viewing.status === 'Received' || viewing.status === 'Rejected') && (
                <button className={styles.cancelBtn} onClick={closeView}><MdClose /> Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
