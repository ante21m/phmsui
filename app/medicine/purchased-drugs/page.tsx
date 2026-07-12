'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdDelete, MdSave, MdLocalShipping, MdCheckCircle, MdInventory, MdEdit, MdClose, MdSearch, MdPersonAdd, MdArrowUpward, MdArrowDownward, MdUnfoldMore, MdChevronLeft, MdChevronRight, MdVisibility, MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { SmartTable, type SmartColumn, TextField } from '@/components';
import smartStyles from '@/components/SmartTable.module.css';
import {
  useGetDrugsQuery,
  useSavePurchaseMutation,
  useUpdateDrugPurchaseItemMutation,
  useDeleteDrugPurchaseItemMutation,
  useGetDrugStocksQuery,
  useDispatchDrugMutation,
  useGetDispatchedDrugsQuery,
  useGetUserDetailQuery,
  useGetUsersQuery,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  CreateDrugPurchaseItem,
  DrugMaster,
  DrugPurchaseItem,
  DrugDispatch,
  UserDetail,
  Supplier,
  CreateSupplierDto,
} from '@/store/services/drugApi';
import { formatServerDate } from '@/app/reports/reportUtils';
import styles from './PurchasedDrugs.module.css';

type Tab = 'register' | 'stocks' | 'dispatch' | 'dispatched';

const today = new Date().toISOString().split('T')[0];
const oneYearFromNow = new Date();
oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
const defaultExpiry = oneYearFromNow.toISOString().split('T')[0];

interface PurchaseFormItem {
  drugId: string;
  drugName: string;
  uom: string;
  quantity: number;
  purchasePrice: number | string;
  salePrice: number | string;
  batchNo: string;
  expiryDate: string;
}

const emptyItem = (): PurchaseFormItem => ({
  drugId: '',
  drugName: '',
  uom: '',
  batchNo: '',
  expiryDate: defaultExpiry,
  quantity: 0,
  purchasePrice: 0,
  salePrice: 0,
});

interface DispatchFormItem {
  purchaseItemId: string;
  purchaseItemLabel: string;
  quantity: number;
  currentQty: number;
}

export default function PurchasedDrugsPage() {
  const [tab, setTab] = useState<Tab>('register');

  const { data: drugs = [] } = useGetDrugsQuery();
  const { data: stocks = [] } = useGetDrugStocksQuery();
  const visibleStocks = (stocks as DrugPurchaseItem[]).filter(s => s.qtyRemaining > 0);
  const { data: dispatched = [], isLoading: dispatchedLoading, error: dispatchedError } = useGetDispatchedDrugsQuery();
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  const { data: user } = useGetUserDetailQuery(undefined, { skip: !hasToken });
  const { data: users = [] } = useGetUsersQuery();
  const [savePurchase] = useSavePurchaseMutation();
  const [updateDrugPurchaseItem] = useUpdateDrugPurchaseItemMutation();
  const [deleteDrugPurchaseItem] = useDeleteDrugPurchaseItemMutation();
  const [dispatchDrug] = useDispatchDrugMutation();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createSupplier] = useCreateSupplierMutation();

  const pendingDispatches = (dispatched as DrugDispatch[]).filter(d => d.dispatchStatus === 'Pending').length;

  const drugMap = useMemo(() => {
    const m: Record<string, DrugMaster> = {};
    for (const d of drugs) m[d.id] = d;
    return m;
  }, [drugs]);

  const userMap = useMemo(() => {
    const m: Record<string, UserDetail> = {};
    const list: UserDetail[] = Array.isArray(users) ? users : (users && typeof users === 'object' && 'data' in users ? (users as any).data : []);
    for (const u of list) m[u.id] = u;
    return m;
  }, [users]);

  const usersList = useMemo<UserDetail[]>(() => Array.isArray(users) ? users as UserDetail[] : (users && typeof users === 'object' && 'data' in users ? (users as any).data as UserDetail[] : []), [users]);

  const stockLabel = (s: DrugPurchaseItem) => {
    const dm = drugMap[s.drugId ?? ''];
    return dm ? `${dm.genericName} ${dm.dosageForm} - ${dm.strength}` : s.drugName;
  };

  const [editStockId, setEditStockId] = useState<string | null>(null);
  const [editStockForm, setEditStockForm] = useState({ batchNo: '', expiryDate: '', quantity: '' as string | number, purchasePrice: 0 as string | number, salePrice: 0 as string | number });
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set());
  const [viewingDispatch, setViewingDispatch] = useState<any | null>(null);
  const [drugSearch, setDrugSearch] = useState('');
  const [drugSearchActive, setDrugSearchActive] = useState(-1);
  const [modalMaximized, setModalMaximized] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const toggleStockSelect = (id: string) => {
    setSelectedStockIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStockIds.size === visibleStocks.length) {
      setSelectedStockIds(new Set());
    } else {
      setSelectedStockIds(new Set(visibleStocks.map((s: DrugPurchaseItem) => s.id)));
    }
  };

  const dispatchSelected = () => {
    const selected = visibleStocks.filter((s: DrugPurchaseItem) => selectedStockIds.has(s.id));
    if (selected.length === 0) { toast.error('No stock items selected'); return; }
    setDispatchItems(selected.map(s => ({ purchaseItemId: s.id, purchaseItemLabel: `${s.drugName} (${s.batchNo || 'N/A'})`, quantity: 0, currentQty: s.qtyRemaining })));
    setSelectedStockIds(new Set());
    setTab('dispatch');
  };

  const stockDispatch = (s: DrugPurchaseItem) => {
    setDispatchItems([{ purchaseItemId: s.id, purchaseItemLabel: `${s.drugName} (${s.batchNo || 'N/A'})`, quantity: 0, currentQty: s.qtyRemaining }]);
    setTab('dispatch');
  };

  const openEditStock = (s: DrugPurchaseItem) => {
    setEditStockId(s.id);
    setEditStockForm({ batchNo: s.batchNo || '', expiryDate: s.expiryDate || '', quantity: s.quantity, purchasePrice: Number(s.purchasePrice ?? 0), salePrice: Number(s.salePrice ?? 0) });
  };

  const saveEditStock = async (s: DrugPurchaseItem) => {
    try {
      const body: Partial<CreateDrugPurchaseItem> & { id: string } = { id: s.id };
      if (editStockForm.batchNo !== (s.batchNo || '')) body.batchNo = editStockForm.batchNo || undefined;
      if (editStockForm.expiryDate !== (s.expiryDate || '')) body.expiryDate = editStockForm.expiryDate || undefined;
      if (Number(editStockForm.quantity) !== s.quantity) body.quantity = Number(editStockForm.quantity);
      if (Number(editStockForm.purchasePrice) !== Number(s.purchasePrice ?? 0)) body.purchasePrice = Number(editStockForm.purchasePrice);
      if (Number(editStockForm.salePrice) !== Number(s.salePrice ?? 0)) body.salePrice = Number(editStockForm.salePrice);
      await updateDrugPurchaseItem(body).unwrap();
      toast.success('Stock updated successfully');
      setEditStockId(null);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Failed to update stock';
      toast.error(msg);
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      await deleteDrugPurchaseItem(id).unwrap();
      toast.success('Stock item deleted');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Failed to delete stock item';
      toast.error(msg);
    }
  };

  // Register form state
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [items, setItems] = useState<PurchaseFormItem[]>([emptyItem()]);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPhone: '', email: '', address: '' });
  const [dispatchedToUserId, setDispatchedToUserId] = useState<string>('');

  const updateItem = (index: number, field: keyof PurchaseFormItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      if (field === 'drugId') {
        const drug = drugs.find((d) => d.id === value);
        updated[index] = {
          ...updated[index],
          drugId: drug?.id ?? '',
          drugName: drug?.genericName ?? '',
          uom: drug?.unitOfMeasure ?? '',
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const lastRow = items[items.length - 1];
  useEffect(() => {
    if (lastRow && lastRow.drugId && Number(lastRow.quantity) > 0 && Number(lastRow.purchasePrice ?? 0) > 0 && Number(lastRow.salePrice ?? 0) > 0) {
      setItems(prev => [...prev, emptyItem()]);
    }
  }, [lastRow]);

  const totalQty = items.reduce((s, it) => s + Number(it.quantity ?? 0), 0);
  const totalAmt = items.reduce((s, it) => s + Number(it.purchasePrice ?? 0) * Number(it.quantity ?? 0), 0);

  const dispatchedEnriched = useMemo(() => (dispatched as DrugDispatch[]).map(d => {
    const by = userMap[d.dispatchedBy ?? ''];
    const toUser = d.dispatchedToUser;
    const drugName = d.items?.length ? (() => {
      const first = d.items[0];
      const stock = (stocks as DrugPurchaseItem[]).find(s => s.id === first.purchaseItemId);
      return stock ? stockLabel(stock) : first.purchaseItemId;
    })() : '';
    return {
      ...d,
      _dispatchedBy: by ? `${by.firstName} ${by.fatherName}` : 'Unknown',
      _dispatchedTo: toUser ? `${toUser.firstName} ${toUser.fatherName}` : 'Unknown',
      _drugName: drugName,
      _qtyDispatched: d.items?.reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0) || 0,
    };
  }), [dispatched, userMap, stocks]);

  const dispatchedColumns = useMemo<SmartColumn<any>[]>(() => [
    { header: 'Drug Name', accessor: '_drugName' as any, sortable: true },
    { header: 'Dispatched By', accessor: '_dispatchedBy' as any, sortable: true },
    { header: 'Dispatched To', accessor: '_dispatchedTo' as any, sortable: true },
    { header: 'Qty Dispatched', accessor: '_qtyDispatched' as any, sortable: true, textAlign: 'right' },
    { header: 'Items', render: (r: any) => r.items?.length ?? '—', textAlign: 'right' },
    {
      header: 'Status',
      accessor: 'dispatchStatus' as any,
      sortable: true,
      render: (r: any) => {
        const cls = r.dispatchStatus === 'Confirmed' ? styles.statusConfirmed : r.dispatchStatus === 'Pending' ? styles.statusPending : styles.statusRejected;
        return <span className={`${styles.statusBadge} ${cls}`}>{r.dispatchStatus || '—'}</span>;
      },
    },
    { header: 'Dispatch Date', accessor: 'dispatchDate' as any, sortable: true, render: (r: any) => formatServerDate(r.dispatchDate) },
    {
      header: 'Actions',
      render: (r: any) => <button className={styles.actionEdit} onClick={() => setViewingDispatch(r)} title="View Details"><MdVisibility /></button>,
    },
  ], []);

  const handleSavePurchase = async () => {
    if (!invoiceNo) { toast.error('Invoice number is required'); return; }
    const filled = items.filter(it => it.drugId);
    if (filled.length === 0) { toast.error('Add at least one item'); return; }
    if (filled.some((it) => it.quantity < 1)) { toast.error('Quantity must be at least 1 for all rows'); return; }
    if (filled.some((it) => Number(it.purchasePrice ?? 0) <= 0)) { toast.error('Purchase price must be greater than 0'); return; }
    if (filled.some((it) => Number(it.salePrice ?? 0) <= 0)) { toast.error('Sale price must be greater than 0'); return; }
    try {
      await savePurchase({
        invoiceNo,
        supplierId,
        purchaseDate,
        items: filled.map(it => ({
          drugId: it.drugId || undefined,
          drugName: it.drugName,
          uom: it.uom,
          quantity: it.quantity,
          purchasePrice: Number(it.purchasePrice ?? 0),
          salePrice: Number(it.salePrice ?? 0),
          batchNo: it.batchNo || undefined,
          expiryDate: it.expiryDate || undefined,
          qtyRemaining: it.quantity,
        })),
      }).unwrap();

      toast.success('Purchase saved successfully!');

      setInvoiceNo('');
      setSupplierId(undefined);
      setPurchaseDate(today);
      setItems([emptyItem()]);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Failed to save purchase';
      toast.error(msg);
    }
  };

  const handleAddSupplier = async () => {
    if (!supplierForm.name.trim()) { toast.error('Supplier name is required'); return; }
    try {
      const created = await createSupplier({
        name: supplierForm.name.trim(),
        contactPhone: supplierForm.contactPhone || undefined,
        email: supplierForm.email || undefined,
        address: supplierForm.address || undefined,
      }).unwrap();
      setSupplierId(created.id);
      setSupplierFormOpen(false);
      setSupplierForm({ name: '', contactPhone: '', email: '', address: '' });
      toast.success(`Supplier "${created.name}" added`);
    } catch { toast.error('Failed to add supplier'); }
  };

  // Dispatch form
  const [dispatchItems, setDispatchItems] = useState<DispatchFormItem[]>([]);

  const addDispatchRow = () => setDispatchItems(prev => [...prev, { purchaseItemId: '', purchaseItemLabel: '', quantity: 0, currentQty: 0 }]);

  const updateDispatchItem = (index: number, field: keyof DispatchFormItem, value: string | number) => {
    setDispatchItems(prev => {
      const updated = [...prev];
      if (field === 'purchaseItemId') {
        const stockItem = stocks.find(s => s.id === value);
        updated[index] = {
          purchaseItemId: String(value),
          purchaseItemLabel: stockItem ? `${stockItem.drugName} (${stockItem.batchNo || 'N/A'})` : '',
          quantity: 0,
          currentQty: stockItem?.qtyRemaining ?? 0,
        };
      } else {
        updated[index] = { ...updated[index], [field]: Number(value) };
      }
      return updated;
    });
  };

  const removeDispatchRow = (i: number) => setDispatchItems(prev => prev.filter((_, idx) => idx !== i));

  const handleDispatch = async () => {
    if (dispatchItems.length === 0 || dispatchItems.some(it => !it.purchaseItemId)) {
      toast.error('Add at least one dispatch item with a stock selection');
      return;
    }
    if (dispatchItems.some(it => it.quantity < 1)) {
      toast.error('Dispatch quantity must be at least 1');
      return;
    }
    if (dispatchItems.some(it => it.quantity > it.currentQty)) {
      toast.error('Dispatch quantity cannot exceed available stock');
      return;
    }
    if (!dispatchedToUserId) {
      toast.error('Receiving user is required');
      return;
    }
    try {
      await dispatchDrug({
        dispatchDate: today,
        ...(user?.id ? { dispatchedBy: user.id } : {}),
        dispatchedTo: dispatchedToUserId,
        items: dispatchItems.map(it => ({
          purchaseItemId: it.purchaseItemId,
          quantity: it.quantity,
          currentQty: it.quantity,
        })),
      }).unwrap();
      toast.success('Drugs dispatched successfully!');
      setDispatchItems([]);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Dispatch failed';
      toast.error(msg);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageTitleRow}>
        <h1 className={styles.pageTitle}>Purchased Drug Registration</h1>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`} onClick={() => setTab('register')}>
          <MdAdd className={styles.tabIcon} /> Register Drugs
        </button>
        <button className={`${styles.tab} ${tab === 'stocks' ? styles.tabActive : ''}`} onClick={() => setTab('stocks')}>
          <MdInventory className={styles.tabIcon} /> Drug Stocks
        </button>
        <button className={`${styles.tab} ${tab === 'dispatch' ? styles.tabActive : ''}`} onClick={() => setTab('dispatch')}>
          <MdLocalShipping className={styles.tabIcon} />
          Dispatch Drugs
          {pendingDispatches > 0 && <span className={styles.tabBadge}>{pendingDispatches}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'dispatched' ? styles.tabActive : ''}`} onClick={() => setTab('dispatched')}>
          <MdCheckCircle className={styles.tabIcon} /> Dispatched Drugs
        </button>
      </div>

      {/* ─── REGISTER TAB ─── */}
      {tab === 'register' && (
        <div className={styles.tabContent}>
          <div className={styles.formHeader}>
            <div className={styles.formField}>
              <TextField label="Invoice No" required value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice number" />
            </div>
            <div className={styles.formField}>
              <label>Supplier</label>
              <div className={styles.supplierRow}>
                <select value={supplierId ?? ''} onChange={(e) => setSupplierId(e.target.value || undefined)} aria-label="Supplier">
                  <option value="">-- Select Supplier --</option>
                  {(suppliers as Supplier[]).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button className={styles.addSupplierBtn} onClick={() => setSupplierFormOpen(true)} title="Add new supplier"><MdPersonAdd /></button>
              </div>
            </div>
            <div className={styles.formField}>
              <TextField label="Purchase Date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
          </div>

          <div className={smartStyles.tableWrap}>
            <table className={`${smartStyles.table} ${styles.registerTable}`}>
              <thead>
                <tr>
                  <th className={smartStyles.th}>Drug <span className={styles.req}>*</span></th>
                  <th className={smartStyles.th}>UOM</th>
                  <th className={smartStyles.th}>Batch No</th>
                  <th className={smartStyles.th}>Expiry</th>
                  <th className={smartStyles.th}>Qty <span className={styles.req}>*</span></th>
                  <th className={smartStyles.th}>Purchase Price <span className={styles.req}>*</span></th>
                  <th className={smartStyles.th}>Sale Price <span className={styles.req}>*</span></th>
                  <th className={smartStyles.th}>Total</th>
                  <th className={smartStyles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className={styles.drugCell}>
                      <div className={styles.searchSelectWrap}>
                        <TextField
                          ref={el => { inputRefs.current[i] = el; }}
                          value={drugSearchActive === i ? drugSearch : (() => { const d = drugs.find(x => x.id === item.drugId); return d ? `${d.genericName} ${d.dosageForm} - ${d.strength}` : ''; })()}
                          onChange={(e) => { setDrugSearch(e.target.value); setDrugSearchActive(i); }}
                          onFocus={(e) => {
                            setDrugSearch(''); setDrugSearchActive(i);
                            const r = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - r.bottom;
                            setDropdownPos({ top: r.bottom, left: r.left, width: r.width, maxH: Math.min(320, spaceBelow - 8) });
                          }}
                          placeholder="Search drug..." />
                        {item.drugId && drugSearchActive !== i && (
                          <button type="button" className={styles.clearSearchBtn} onClick={() => { updateItem(i, 'drugId', ''); inputRefs.current[i]?.focus(); }} title="Clear">✕</button>
                        )}
                        {drugSearchActive === i && dropdownPos && (
                          <>
                            <div className={styles.searchOverlay} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDrugSearchActive(-1); setDropdownPos(null); }} />
                            <div className={styles.searchDropdownFixed} style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: dropdownPos.maxH }} onClick={(e) => e.stopPropagation()}>
                              {drugs.filter(d => !drugSearch || d.genericName.toLowerCase().includes(drugSearch.toLowerCase()) || d.strength.toLowerCase().includes(drugSearch.toLowerCase()))
                                .map(d => (
                                  <div key={d.id} className={`${styles.searchOption} ${item.drugId === d.id ? styles.searchOptionActive : ''}`}
                                    onClick={() => { updateItem(i, 'drugId', d.id); setDrugSearchActive(-1); setDropdownPos(null); setDrugSearch(''); }}>
                                    {d.genericName} {d.dosageForm} - {d.strength}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td><TextField w={120} value={item.uom} onChange={(e) => updateItem(i, 'uom', e.target.value)} placeholder="Tablet" readOnly={!!item.drugId && !!drugs.find(d => d.id === item.drugId)?.unitOfMeasure} /></td>
                    <td><TextField value={item.batchNo} onChange={(e) => updateItem(i, 'batchNo', e.target.value)} placeholder="Batch" /></td>
                    <td><TextField type="date" value={item.expiryDate} onChange={(e) => updateItem(i, 'expiryDate', e.target.value)} /></td>
                    <td><TextField value={item.quantity || ''} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value) || 0)} placeholder="1" /></td>
                    <td><TextField value={item.purchasePrice === 0 ? '' : String(item.purchasePrice)} onChange={(e) => updateItem(i, 'purchasePrice', e.target.value)} placeholder="0.00" /></td>
                    <td><TextField value={item.salePrice === 0 ? '' : String(item.salePrice)} onChange={(e) => updateItem(i, 'salePrice', e.target.value)} placeholder="0.00" /></td>
                    <td className={styles.totalCell}>{(Number(item.quantity ?? 0) * Number(item.purchasePrice ?? 0)).toFixed(2)}</td>
                    <td>
                      <button className={styles.rowDeleteBtn} onClick={() => removeRow(i)} disabled={items.length === 1} title="Remove row">
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td colSpan={4} className={styles.totalLabel}>TOTAL</td>
                  <td className={styles.totalQty}>{totalQty}</td>
                  <td colSpan={3} />
                  <td className={styles.totalAmt}>{totalAmt.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className={styles.tableActions}>
            <button className={styles.addRowBtn} onClick={addRow}><MdAdd /> Add Row</button>
          </div>

          <div className={styles.saveWrap}>
            <button className={styles.saveBtn} onClick={() => {
              const hasLossItem = items.some(it => it.drugId && Number(it.purchasePrice ?? 0) > 0 && Number(it.salePrice ?? 0) > 0 && Number(it.purchasePrice ?? 0) > Number(it.salePrice ?? 0));
              if (hasLossItem) {
                setConfirmSaveOpen(true);
              } else {
                handleSavePurchase();
              }
            }}>
              <MdSave /> Save Purchase
            </button>
          </div>

          {supplierFormOpen && (
            <div className={styles.modalOverlay} onClick={() => setSupplierFormOpen(false)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={modalMaximized ? { width: '90vw', maxWidth: 600 } : {}}>
                <div className={styles.modalHeader}>
                  <h3>Add New Supplier</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.formCloseBtn} onClick={() => setModalMaximized(v => !v)} title={modalMaximized ? 'Minimize' : 'Maximize'}>{modalMaximized ? <MdFullscreenExit /> : <MdFullscreen />}</button>
                    <button className={styles.formCloseBtn} onClick={() => setSupplierFormOpen(false)}><MdClose /></button>
                  </div>
                </div>
                <div className={styles.modalBody}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <TextField label="Name" required value={supplierForm.name} onChange={(e) => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="Supplier name" />
                    <TextField label="Phone" value={supplierForm.contactPhone} onChange={(e) => setSupplierForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="Contact phone" />
                    <TextField label="Email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                    <TextField label="Address" value={supplierForm.address} onChange={(e) => setSupplierForm(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
                  </div>
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => setSupplierFormOpen(false)}>Cancel</button>
                  <button className={styles.saveBtn} onClick={handleAddSupplier}><MdSave /> Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STOCKS TAB ─── */}
      {tab === 'stocks' && (
        <div className={styles.tabContent}>
          {visibleStocks.length === 0 ? (
            <p className={smartStyles.emptyCell}>No stock records found. Register a purchase first.</p>
          ) : (
            <>
              {selectedStockIds.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{selectedStockIds.size} selected</span>
                  <button className={styles.dispatchSelectedBtn} onClick={dispatchSelected}>
                    <MdLocalShipping /> Dispatch Selected ({selectedStockIds.size})
                  </button>
                </div>
              )}
              <SmartTable
                data={visibleStocks}
                columns={[
                  {
                    header: <input type="checkbox" checked={selectedStockIds.size === visibleStocks.length && visibleStocks.length > 0}
                      onClick={(e) => e.stopPropagation()} onChange={toggleSelectAll} />,
                    render: (row) => <input type="checkbox" checked={selectedStockIds.has(row.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleStockSelect(row.id)} />,
                  },
                  {
                    accessor: 'drugName' as keyof DrugPurchaseItem,
                    header: 'Drug Name',
                    sortable: true,
                    render: (row) => { const dm = drugMap[row.drugId ?? '']; return dm ? `${dm.genericName} ${dm.dosageForm} - ${dm.strength}` : row.drugName; },
                  },
                  {
                    accessor: 'batchNo' as keyof DrugPurchaseItem,
                    header: 'Batch No',
                    sortable: true,
                    render: (row) => editStockId === row.id
                      ? <TextField value={editStockForm.batchNo} onChange={(e) => setEditStockForm(p => ({ ...p, batchNo: e.target.value }))} />
                      : (row.batchNo || '—'),
                  },
                  {
                    accessor: 'expiryDate' as keyof DrugPurchaseItem,
                    header: 'Expiry',
                    sortable: true,
                    render: (row) => editStockId === row.id
                      ? <TextField type="date" value={editStockForm.expiryDate} onChange={(e) => setEditStockForm(p => ({ ...p, expiryDate: e.target.value }))} />
                      : (row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—'),
                  },
                  {
                    accessor: 'quantity' as keyof DrugPurchaseItem,
                    header: 'Qty',
                    sortable: true,
                    textAlign: 'right',
                    render: (row) => editStockId === row.id
                      ? <TextField type="number" value={String(editStockForm.quantity)} onChange={(e) => setEditStockForm(p => ({ ...p, quantity: e.target.value }))} />
                      : row.quantity,
                  },
                  {
                    accessor: 'purchasePrice' as keyof DrugPurchaseItem,
                    header: 'Purchase Price',
                    sortable: true,
                    textAlign: 'right',
                    render: (row) => editStockId === row.id
                      ? <TextField type="number" step="0.01" value={String(editStockForm.purchasePrice)} onChange={(e) => setEditStockForm(p => ({ ...p, purchasePrice: e.target.value }))} />
                      : Number(row.purchasePrice ?? 0).toFixed(2),
                  },
                  {
                    accessor: 'salePrice' as keyof DrugPurchaseItem,
                    header: 'Sale Price',
                    sortable: true,
                    textAlign: 'right',
                    render: (row) => editStockId === row.id
                      ? <TextField type="number" step="0.01" value={String(editStockForm.salePrice)} onChange={(e) => setEditStockForm(p => ({ ...p, salePrice: e.target.value }))} />
                      : Number(row.salePrice ?? 0).toFixed(2),
                  },
                  {
                    header: 'Total Price',
                    textAlign: 'right',
                    render: (row) => editStockId === row.id
                      ? (Number(editStockForm.purchasePrice) * Number(editStockForm.quantity)).toFixed(2)
                      : (Number(row.purchasePrice ?? 0) * Number(row.quantity ?? 0)).toFixed(2),
                  },
                  {
                    header: 'Actions',
                    textAlign: 'center',
                    render: (row) => editStockId === row.id ? (
                      <span className={styles.actionBtns}>
                        <button className={styles.editSaveBtn} onClick={(e) => { e.stopPropagation(); saveEditStock(row); }} title="Save"><MdSave /></button>
                        <button className={styles.editCancelBtn} onClick={(e) => { e.stopPropagation(); setEditStockId(null); }} title="Cancel"><MdClose /></button>
                      </span>
                    ) : (
                      <span className={styles.actionBtns}>
                        <button className={styles.actionEdit} onClick={(e) => { e.stopPropagation(); openEditStock(row); }} title="Edit"><MdEdit /></button>
                        <button className={styles.actionDispatch} onClick={(e) => { e.stopPropagation(); stockDispatch(row); }} title="Dispatch"><MdLocalShipping /></button>
                        <button className={styles.rowDeleteBtn} onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this stock item?')) handleDeleteStock(row.id); }} title="Delete"><MdDelete /></button>
                      </span>
                    ),
                  },
                ]}
                rowKey={(row) => row.id}
                withSearch
                withPagination
                withRowNumbers
                defaultPageSize={25}
                onRowClick={(row) => toggleStockSelect(row.id)}
                searchFilter={(row, q) => {
                  const dm = drugMap[row.drugId ?? ''];
                  const label = dm ? `${dm.genericName} ${dm.dosageForm} - ${dm.strength}` : row.drugName;
                  return label.toLowerCase().includes(q) || (row.batchNo || '').toLowerCase().includes(q);
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <div style={{ background: '#1a73e8', color: '#fff', padding: '8px 24px', borderRadius: 6, fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
                  Grand Total Purchased: {stocks.reduce((s, it) => s + Number(it.quantity ?? 0), 0)} items | {stocks.reduce((s, it) => s + Number(it.purchasePrice ?? 0) * Number(it.quantity ?? 0), 0).toFixed(2)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── DISPATCH TAB ─── */}
      {tab === 'dispatch' && (
        <div className={styles.tabContent}>
          <h2 className={styles.subTitle}>Dispatch Drugs from Stock</h2>
          {dispatchItems.length === 0 ? (
            <p className={smartStyles.emptyCell}>Select stock items from the Stocks tab to dispatch.</p>
          ) : (
            <>
              <div className={smartStyles.tableWrap}>
            <table className={smartStyles.table}>
                  <thead>
                    <tr>
                      <th className={smartStyles.th}>Drug Name</th>
                      <th className={smartStyles.th}>Available Qty</th>
                      <th className={smartStyles.th}>Dispatch Qty <span className={styles.req}>*</span></th>
                      <th className={smartStyles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchItems.map((item, i) => {
                      const stock = (stocks as DrugPurchaseItem[]).find(s => s.id === item.purchaseItemId);
                      return (
                        <tr key={i}>
                          <td>
                            {item.purchaseItemId && stock ? (
                              <span className={styles.drugLabel}>{stockLabel(stock)} <span className={styles.batchLabel}>({stock.batchNo || 'N/A'})</span></span>
                            ) : (
                              <select value={item.purchaseItemId || ''} onChange={(e) => updateDispatchItem(i, 'purchaseItemId', e.target.value)} aria-label="Stock item">
                                <option value="">Select stock...</option>
                                {visibleStocks.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {stockLabel(s)} | Batch: {s.batchNo || 'N/A'} | Remaining: {s.qtyRemaining}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className={styles.totalCell}>{Math.max(0, item.currentQty - (item.quantity || 0))}</td>
                          <td>
                            <TextField value={item.quantity || ''} inputMode="numeric"
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9]/g, '');
                                updateDispatchItem(i, 'quantity', v ? Number(v) : 0);
                              }} placeholder="1" />
                          </td>
                          <td>
                            <button className={styles.rowDeleteBtn} onClick={() => removeDispatchRow(i)} disabled={dispatchItems.length === 1} title="Remove row">
                              <MdDelete />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.addRowBtn} onClick={addDispatchRow}><MdAdd /> Add Item</button>
              </div>
              <div className={styles.dispatchDetails}>
                <div className={styles.formField}>
                  <label>Dispatched To <span className={styles.req}>*</span></label>
                  <select
                    value={dispatchedToUserId}
                    onChange={(e) => setDispatchedToUserId(e.target.value)}
                    aria-label="Dispatched To"
                  >
                    <option value="">Select receiving user...</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.fatherName} ({u.username})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.saveWrap}>
                <button className={styles.saveBtn} onClick={handleDispatch}><MdLocalShipping /> Submit Dispatch</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── DISPATCHED TAB ─── */}
      {tab === 'dispatched' && (
        <div className={styles.tabContent}>
          {dispatchedError && (
            <p style={{ color: 'red', background: '#fff0f0', padding: '8px', borderRadius: '4px' }}>
              Error loading dispatches: {JSON.stringify(dispatchedError)}
            </p>
          )}
          <SmartTable
            data={dispatchedEnriched}
            columns={dispatchedColumns}
            isLoading={dispatchedLoading}
            rowKey={(r: any) => r.id}
            withSearch withPagination withRowNumbers
            defaultPageSize={25}
            emptyMessage="No dispatched drugs yet."
            searchFilter={(row: any, q: string) =>
              (row._dispatchedBy || '').toLowerCase().includes(q) ||
              (row._dispatchedTo || '').toLowerCase().includes(q) ||
              (row.dispatchDate || '').toLowerCase().includes(q) ||
              (row.dispatchStatus || '').toLowerCase().includes(q)
            }
          />

          {viewingDispatch && (
            <div className={styles.modalOverlay} onClick={() => setViewingDispatch(null)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={modalMaximized ? { width: '90vw', maxWidth: 1200 } : {}}>
                <div className={styles.modalHeader}>
                  <h3>Dispatch Details</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.formCloseBtn} onClick={() => setModalMaximized(v => !v)} title={modalMaximized ? 'Minimize' : 'Maximize'}>{modalMaximized ? <MdFullscreenExit /> : <MdFullscreen />}</button>
                    <button className={styles.formCloseBtn} onClick={() => setViewingDispatch(null)}><MdClose /></button>
                  </div>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.detailGrid}>
                    {[
                      ['Drug Name', viewingDispatch._drugName || '—'],
                      ['Dispatch Date', formatServerDate(viewingDispatch.dispatchDate)],
                      ['Dispatched By', viewingDispatch._dispatchedBy || '—'],
                      ['Dispatched To', viewingDispatch._dispatchedTo || '—'],
                      ['Qty Dispatched', viewingDispatch._qtyDispatched != null ? String(Number(viewingDispatch._qtyDispatched)) : '—'],
                      ['Status', viewingDispatch.dispatchStatus],
                    ].map(([label, value]) => (
                      <div key={String(label)} className={styles.detailRow}>
                        <span className={styles.detailLabel}>{label}</span>
                        <span className={styles.detailValue}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                  {(viewingDispatch.items || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <label className={styles.detailSectionLabel}>Items</label>
                      <SmartTable
                        data={viewingDispatch.items.map((item: any) => {
                          const stock = (stocks as DrugPurchaseItem[]).find(s => s.id === item.purchaseItemId);
                          return { ...item, _stock: stock };
                        })}
                        columns={[
                          { header: 'Drug', render: (r: any) => r._stock ? stockLabel(r._stock) : `Stock #${r.purchaseItemId}`, sortable: true },
                          { header: 'Batch No', accessor: '_stock.batchNo' as any, render: (r: any) => r._stock?.batchNo || '—', sortable: true },
                          { header: 'Expiry', render: (r: any) => r._stock?.expiryDate ? new Date(r._stock.expiryDate).toLocaleDateString() : '—', sortable: true },
                          { header: 'Stock Qty', accessor: '_stock.quantity' as any, render: (r: any) => r._stock?.quantity ?? '—', textAlign: 'right' },
                          { header: 'Dispatch Qty', accessor: 'quantity' as any, render: (r: any) => Number(r.quantity ?? 0), textAlign: 'right' },
                          { header: 'Purchase Price', render: (r: any) => r._stock?.purchasePrice != null ? Number(r._stock.purchasePrice).toLocaleString() : '—' },
                          { header: 'Sale Price', render: (r: any) => r._stock?.salePrice != null ? Number(r._stock.salePrice).toLocaleString() : '—' },
                          { header: 'Qty Remaining', render: (r: any) => r.currentQty ?? '—', textAlign: 'right', sortable: true },
                        ]}
                        rowKey={(r: any) => r.id}
                        withSearch={false}
                        withPagination={false}
                        withRowNumbers={false}
                      />
                    </div>
                  )}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => setViewingDispatch(null)}><MdClose /> Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmSaveOpen && (
        <div className={styles.modalOverlay} onClick={() => setConfirmSaveOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={modalMaximized ? { width: '90vw', maxWidth: 600 } : { width: 400, maxWidth: '90vw' }}>
            <div className={styles.modalHeader}>
              <h3>Confirm Save</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={styles.formCloseBtn} onClick={() => setModalMaximized(v => !v)} title={modalMaximized ? 'Minimize' : 'Maximize'}>{modalMaximized ? <MdFullscreenExit /> : <MdFullscreen />}</button>
                <button className={styles.formCloseBtn} onClick={() => setConfirmSaveOpen(false)}><MdClose /></button>
              </div>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 14, color: 'var(--gray-700)', margin: 0 }}>Are you sure you want to save this purchase?</p>
              {items.some(it => it.drugId && Number(it.purchasePrice ?? 0) > 0 && Number(it.salePrice ?? 0) > 0 && Number(it.purchasePrice ?? 0) > Number(it.salePrice ?? 0)) && (
                <p style={{ fontSize: 13, color: '#d97706', margin: '8px 0 0', padding: '8px 12px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                  ⚠ The sale price is lower than the purchase price. Selling this item at the current price will result in a loss.
                </p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setConfirmSaveOpen(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={() => { setConfirmSaveOpen(false); handleSavePurchase(); }}>Proceed</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
