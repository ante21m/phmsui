'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { MdClose, MdSave, MdOutbound, MdDownload } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useCreatePharmacyRequestMutation,
  useSubmitPharmacyRequestMutation,
  useIssuePharmacyRequestMutation,
  useReceivePharmacyRequestMutation,
  useGetDrugStocksQuery,
  useGetStoresQuery,
  type PharmacyRequest,
  type DrugPurchaseItem,
} from '@/store/services/drugApi';
import { addItem, removeItem, updateQty, clearCart, setStore } from '@/store/pharmacyRequestCartSlice';
import type { RootState } from '@/store/store';
import styles from './PharmacyRequests.module.css';

type SubTab = 'available' | 'selected';

export default function PharmacyRequestsPage() {
  const dispatch = useDispatch();
  const cart = useSelector((state: RootState) => state.pharmacyRequestCart);

  const { data: stockItems = [], isLoading } = useGetDrugStocksQuery();
  const { data: stores = [] } = useGetStoresQuery();
  const [create] = useCreatePharmacyRequestMutation();
  const [submit] = useSubmitPharmacyRequestMutation();
  const [issue] = useIssuePharmacyRequestMutation();
  const [receive] = useReceivePharmacyRequestMutation();

  const [subTab, setSubTab] = useState<SubTab>('available');
  const [saving, setSaving] = useState(false);
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedAvailable(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedAvailable.size === positiveStock.length) setSelectedAvailable(new Set());
    else setSelectedAvailable(new Set(positiveStock.map(s => s.id)));
  };
  const addSelected = () => {
    const toAdd = positiveStock.filter(s => selectedAvailable.has(s.id) && !selectedIds.has(s.drugId || ''));
    if (!toAdd.length) { toast.info('No new items selected'); return; }
    toAdd.forEach(s => dispatch(addItem({ drugMasterId: s.drugId || '', drugName: s.drug?.genericName || s.drugName, requestedQty: 0 })));
    setSelectedAvailable(new Set()); setSubTab('selected'); toast.success(`${toAdd.length} item(s) added`);
  };

  const [viewing, setViewing] = useState<PharmacyRequest | null>(null);
  const [issuing, setIssuing] = useState<PharmacyRequest | null>(null);
  const [issueItems, setIssueItems] = useState<Record<number, string>>({});
  const [issuingLoading, setIssuingLoading] = useState(false);
  const [receiving, setReceiving] = useState<PharmacyRequest | null>(null);
  const [receiveItems, setReceiveItems] = useState<Record<number, string>>({});
  const [receivingLoading, setReceivingLoading] = useState(false);

  const selectedIds = useMemo(() => new Set(cart.items.map(i => i.drugMasterId)), [cart.items]);
  const positiveStock = useMemo(() => stockItems.filter(s => s.qtyRemaining > 0), [stockItems]);

  const handleSave = async () => {
    if (!cart.storeId.trim()) { toast.error('Store is required'); return; }
    if (!cart.items.length) { toast.error('At least one item is required'); return; }
    setSaving(true);
    try {
      const validItems = cart.items.filter(i => i.drugMasterId && (Number(i.requestedQty) || 0) > 0).map(i => ({ drugMasterId: i.drugMasterId, requestedQty: Number(i.requestedQty) || 1 }));
      if (!validItems.length) { toast.error('No valid items to submit'); setSaving(false); return; }
      const created = await create({ departmentId: cart.departmentId.trim() || undefined, storeId: cart.storeId.trim(), items: validItems }).unwrap();
      await submit(created.id).unwrap();
      toast.success('Request created and submitted for approval'); dispatch(clearCart());
    } catch (err: any) { if (err?.data?.message) toast.error(err.data.message); else toast.error('Failed to create'); }
    finally { setSaving(false); }
  };

  const openIssue = (row: PharmacyRequest) => {
    setIssuing(row); const map: Record<number, string> = {};
    for (const item of row.items) { if (item.id != null) map[item.id] = String(item.approvedQty ?? item.requestedQty); }
    setIssueItems(map);
  };
  const closeIssue = () => { setIssuing(null); setIssueItems({}); setIssuingLoading(false); };
  const handleIssue = async () => {
    if (!issuing) return; setIssuingLoading(true);
    try { const items = issuing.items.filter(i => i.id != null).map(i => ({ id: i.id!, issuedQty: Number(issueItems[i.id!]) || (i.approvedQty ?? i.requestedQty) })); await issue({ id: issuing.id, body: { items } }).unwrap(); toast.success('Request issued'); closeIssue(); }
    catch (err: any) { if (err?.data?.message) toast.error(err.data.message); else toast.error('Failed to issue'); } finally { setIssuingLoading(false); }
  };
  const openReceive = (row: PharmacyRequest) => {
    setReceiving(row); const map: Record<number, string> = {};
    for (const item of row.items) { if (item.id != null) map[item.id] = String(item.issuedQty ?? item.approvedQty ?? item.requestedQty); }
    setReceiveItems(map);
  };
  const closeReceive = () => { setReceiving(null); setReceiveItems({}); setReceivingLoading(false); };
  const handleReceive = async () => {
    if (!receiving) return; setReceivingLoading(true);
    try { const items = receiving.items.filter(i => i.id != null).map(i => ({ id: i.id!, receivedQty: Number(receiveItems[i.id!]) || (i.issuedQty ?? i.approvedQty ?? i.requestedQty) })); await receive({ id: receiving.id, body: { items } }).unwrap(); toast.success('Request received'); closeReceive(); }
    catch (err: any) { if (err?.data?.message) toast.error(err.data.message); else toast.error('Failed to receive'); } finally { setReceivingLoading(false); }
  };

  const availColumns = useMemo<SmartColumn<DrugPurchaseItem>[]>(() => [
    { header: <input type="checkbox" checked={selectedAvailable.size === positiveStock.length && positiveStock.length > 0} ref={el => { if (el) el.indeterminate = selectedAvailable.size > 0 && selectedAvailable.size < positiveStock.length; }} onChange={toggleSelectAll} />, width: '40px', textAlign: 'center', render: (row) => <input type="checkbox" checked={selectedAvailable.has(row.id)} onChange={() => toggleSelect(row.id)} /> },
    { header: 'Item', sortable: true, render: (row) => row.drug?.genericName || row.drugName },
    { header: 'Unit', sortable: true, render: (row) => row.drug?.unitOfMeasure || '-' },
    { header: 'In stock', sortable: true, textAlign: 'center', render: (row) => <span className={row.qtyRemaining <= 0 ? styles.stockZero : row.qtyRemaining < 10 ? styles.stockLow : styles.stockOk}>{row.qtyRemaining}</span> },
    { header: 'Expiry date', sortable: true, render: (row) => row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('en-GB') : '-' },
    { header: 'Action', textAlign: 'center', width: '100px', render: (row) => { const id = row.drugId || ''; return (<button className={styles.requestBtn} onClick={() => { dispatch(addItem({ drugMasterId: id, drugName: row.drug?.genericName || row.drugName, requestedQty: 0 })); setSubTab('selected'); }} disabled={row.qtyRemaining <= 0 || selectedIds.has(id)}>{selectedIds.has(id) ? 'Added' : 'Request'}</button>); } },
  ], [selectedIds, selectedAvailable, positiveStock.length]);

  const stockLookup = useMemo(() => { const m = new Map<string, DrugPurchaseItem>(); for (const s of stockItems) { if (s.drugId) m.set(s.drugId, s); } return m; }, [stockItems]);
  const selectedColumns = useMemo<SmartColumn<any>[]>(() => [
    { accessor: 'drugName', header: 'Item', sortable: true },
    { header: 'Unit', sortable: true, render: (r: any) => stockLookup.get(r.drugMasterId)?.drug?.unitOfMeasure || '-' },
    { header: 'In stock', sortable: true, textAlign: 'center', render: (r: any) => { const q = stockLookup.get(r.drugMasterId)?.qtyRemaining ?? 0; return <span className={q <= 0 ? styles.stockZero : q < 10 ? styles.stockLow : styles.stockOk}>{q}</span>; } },
    { header: 'Qty to request', textAlign: 'center', width: '110px', render: (r: any) => <input className={styles.qtyInput} type="text" placeholder="0" value={r.requestedQty === 0 ? '' : r.requestedQty} onChange={e => { const v = e.target.value; if (v === '') dispatch(updateQty({ drugMasterId: r.drugMasterId, qty: 0 })); else if (/^\d+$/.test(v)) dispatch(updateQty({ drugMasterId: r.drugMasterId, qty: Number(v) })); }} /> },
    { header: 'Action', textAlign: 'center', width: '60px', render: (r: any) => <button className={styles.removeBtnSm} onClick={() => dispatch(removeItem(r.drugMasterId))}>✕</button> },
  ], [stockLookup]);

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Drug Request</h2>

      <div className={styles.formBar}>
        <div className={styles.formGroup}>
          <label>Store <span className={styles.required}>*</span></label>
          <select value={cart.storeId} onChange={e => dispatch(setStore(e.target.value))}>
            <option value="">Select Store</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.subTabs}>
        <button className={`${styles.subTab} ${subTab === 'available' ? styles.subTabActive : ''}`} onClick={() => setSubTab('available')}>Available items <span className={styles.tabCount}>{positiveStock.length}</span></button>
        <button className={`${styles.subTab} ${subTab === 'selected' ? styles.subTabActive : ''}`} onClick={() => setSubTab('selected')}>Selected items <span className={styles.tabCount}>{cart.items.length}</span></button>
      </div>

      {subTab === 'available' ? (
        <>{selectedAvailable.size > 0 && (<div className={styles.selectionBar}><span className={styles.selectionCount}>{selectedAvailable.size} selected</span><button className={styles.addSelectedBtn} onClick={addSelected}>Add Selected</button></div>)}
          <SmartTable title="" data={positiveStock} columns={availColumns} isLoading={isLoading} rowKey={(row) => row.id} withSearch withPagination withRowNumbers defaultPageSize={10} maxHeight={520} searchPlaceholder="Search..." classNames={{ pageHeader: styles.pageHeader }} emptyMessage="No items available." /></>
      ) : cart.items.length === 0 ? (
        <div className={styles.emptyState}>No items selected. Switch to the Available items tab to add items.</div>
      ) : (
        <><SmartTable title="" data={cart.items} columns={selectedColumns} rowKey={(row) => row.drugMasterId} withPagination withRowNumbers defaultPageSize={10} classNames={{ pageHeader: styles.pageHeader }} /><div className={styles.saveBar}><button className={styles.cancelBtn} onClick={() => dispatch(clearCart())}><MdClose /> Clear</button><button className={styles.saveBtn} onClick={handleSave} disabled={saving}><MdSave /> {saving ? 'Saving...' : 'Save Request'}</button></div></>
      )}

      {viewing && (
        <div className={styles.modalOverlay} onClick={() => setViewing(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h3>Request Details</h3><button className={styles.modalCloseBtn} onClick={() => setViewing(null)}><MdClose /></button></div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>{[['Request No', viewing.requestNo], ['Status', viewing.status], ['Department', viewing.department?.name || viewing.departmentId || '-'], ['Store', viewing.store?.name || viewing.storeId || '-'], ['Created', viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : '-'], ['Items', `${viewing.items.length} item(s)`]].map(([l, v]) => (<div key={String(l)} className={styles.detailRow}><span className={styles.detailLabel}>{l}</span><span className={styles.detailValue}>{String(v)}</span></div>))}</div>
              {viewing.items.length > 0 && (<SmartTable columns={[{ header: 'Drug', render: (r: any) => r.drug?.genericName || r.drugMasterId }, { accessor: (r: any) => r.requestedQty, header: 'Requested Qty' }, { header: 'Approved', render: (r: any) => r.approvedQty ?? '-' }, { header: 'Issued', render: (r: any) => r.issuedQty ?? '-' }, { header: 'Received', render: (r: any) => r.receivedQty ?? '-' }]} data={viewing.items} rowKey={(r: any) => r.id || r.drugMasterId} />)}
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={() => setViewing(null)}><MdClose /> Close</button></div>
          </div>
        </div>
      )}

      {issuing && (
        <div className={styles.modalOverlay} onClick={closeIssue}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h3>Issue Request</h3><button className={styles.modalCloseBtn} onClick={closeIssue}><MdClose /></button></div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>{[['Department', issuing.department?.name || issuing.departmentId || '-'], ['Store', issuing.store?.name || issuing.storeId || '-'], ['Current Status', issuing.status]].map(([l, v]) => (<div key={String(l)} className={styles.detailRow}><span className={styles.detailLabel}>{l}</span><span className={styles.detailValue}>{String(v)}</span></div>))}</div>
              <div style={{ marginTop: 14 }}><label className={styles.approveLabel}>Items — Issued Quantity</label>
                <table className={styles.itemsTable}><thead><tr><th>Drug</th><th style={{ width: 80 }}>Requested</th><th style={{ width: 80 }}>Approved</th><th style={{ width: 100 }}>Issued Qty</th></tr></thead><tbody>{issuing.items.map(item => (<tr key={item.id || item.drugMasterId}><td>{item.drug?.genericName || item.drugMasterId}</td><td style={{ textAlign: 'center' }}>{item.requestedQty}</td><td style={{ textAlign: 'center' }}>{item.approvedQty ?? '-'}</td><td><input className={styles.approveQtyInput} type="number" min={0} value={item.id != null ? issueItems[item.id] ?? item.approvedQty ?? item.requestedQty : item.requestedQty} onChange={e => { if (item.id == null) return; setIssueItems(prev => ({ ...prev, [item.id!]: e.target.value })); }} disabled={item.id == null} /></td></tr>))}</tbody></table>
              </div>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={closeIssue}><MdClose /> Cancel</button><button className={styles.saveBtn} onClick={handleIssue} disabled={issuingLoading}><MdOutbound /> {issuingLoading ? 'Issuing...' : 'Issue'}</button></div>
          </div>
        </div>
      )}

      {receiving && (
        <div className={styles.modalOverlay} onClick={closeReceive}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}><h3>Receive Request</h3><button className={styles.modalCloseBtn} onClick={closeReceive}><MdClose /></button></div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>{[['Department', receiving.department?.name || receiving.departmentId || '-'], ['Store', receiving.store?.name || receiving.storeId || '-'], ['Current Status', receiving.status]].map(([l, v]) => (<div key={String(l)} className={styles.detailRow}><span className={styles.detailLabel}>{l}</span><span className={styles.detailValue}>{String(v)}</span></div>))}</div>
              <div style={{ marginTop: 14 }}><label className={styles.approveLabel}>Items — Received Quantity</label>
                <table className={styles.itemsTable}><thead><tr><th>Drug</th><th style={{ width: 80 }}>Requested</th><th style={{ width: 80 }}>Approved</th><th style={{ width: 80 }}>Issued</th><th style={{ width: 100 }}>Received Qty</th></tr></thead><tbody>{receiving.items.map(item => (<tr key={item.id || item.drugMasterId}><td>{item.drug?.genericName || item.drugMasterId}</td><td style={{ textAlign: 'center' }}>{item.requestedQty}</td><td style={{ textAlign: 'center' }}>{item.approvedQty ?? '-'}</td><td style={{ textAlign: 'center' }}>{item.issuedQty ?? '-'}</td><td><input className={styles.approveQtyInput} type="number" min={0} value={item.id != null ? receiveItems[item.id] ?? item.issuedQty ?? item.approvedQty ?? item.requestedQty : item.requestedQty} onChange={e => { if (item.id == null) return; setReceiveItems(prev => ({ ...prev, [item.id!]: e.target.value })); }} disabled={item.id == null} /></td></tr>))}</tbody></table>
              </div>
            </div>
            <div className={styles.modalFooter}><button className={styles.cancelBtn} onClick={closeReceive}><MdClose /> Cancel</button><button className={styles.saveBtn} onClick={handleReceive} disabled={receivingLoading}><MdDownload /> {receivingLoading ? 'Receiving...' : 'Receive'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}