'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdDelete, MdSave, MdLocalShipping, MdCheckCircle, MdInventory, MdEdit, MdClose, MdSearch, MdPersonAdd, MdArrowUpward, MdArrowDownward, MdUnfoldMore, MdChevronLeft, MdChevronRight, MdVisibility } from 'react-icons/md';
import { SmartTable, type SmartColumn, TextField } from '@/components';
import { formatServerDate } from '@/app/reports/reportUtils';
import {
  useGetItemsQuery,
  useSaveItemPurchaseMutation,
  useGetItemStocksQuery,
  useDispatchItemMutation,
  useGetDispatchedItemsQuery,
  useGetUserDetailQuery,
  useGetUsersQuery,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  ItemMaster,
  ItemPurchaseItem,
  ItemDispatch,
  UserDetail,
  Supplier,
  CreateSupplierDto,
} from '@/store/services/drugApi';
import styles from './PurchasedItems.module.css';

type Tab = 'register' | 'stocks' | 'dispatch' | 'dispatched';

const today = new Date().toISOString().split('T')[0];
const oneYearFromNow = new Date();
oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
const defaultExpiry = oneYearFromNow.toISOString().split('T')[0];

interface PurchaseFormItem {
  itemId: string;
  variantId: string;
  itemName: string;
  uom: string;
  quantity: number;
  purchasePrice: number | string;
  salePrice: number | string;
  batchNo: string;
  expiryDate: string;
}

const emptyItem = (): PurchaseFormItem => ({
  itemId: '',
  variantId: '',
  itemName: '',
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

export default function PurchasedItemsPage() {
  const [tab, setTab] = useState<Tab>('register');

  const { data: items = [] } = useGetItemsQuery();
  const { data: stocks = [] } = useGetItemStocksQuery();
  const visibleStocks = (stocks as ItemPurchaseItem[]).filter(s => s.qtyRemaining > 0);
  const { data: dispatched = [], isLoading: dispatchedLoading, error: dispatchedError } = useGetDispatchedItemsQuery();
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  const { data: user } = useGetUserDetailQuery(undefined, { skip: !hasToken });
  const { data: users = [] } = useGetUsersQuery();
  const [savePurchase] = useSaveItemPurchaseMutation();
  const [dispatchItem] = useDispatchItemMutation();
  const { data: suppliers = [] } = useGetSuppliersQuery();
  const [createSupplier] = useCreateSupplierMutation();

  const pendingDispatches = (dispatched as ItemDispatch[]).filter(d => d.dispatchStatus === 'Pending').length;

  const itemMap = useMemo(() => {
    const m: Record<string, ItemMaster> = {};
    for (const d of items) m[d.id] = d;
    return m;
  }, [items]);

  const userMap = useMemo(() => {
    const m: Record<string, UserDetail> = {};
    const list: UserDetail[] = Array.isArray(users) ? users : (users && typeof users === 'object' && 'data' in users ? (users as any).data : []);
    for (const u of list) m[u.id] = u;
    return m;
  }, [users]);

  const usersList = useMemo<UserDetail[]>(() => Array.isArray(users) ? users as UserDetail[] : (users && typeof users === 'object' && 'data' in users ? (users as any).data as UserDetail[] : []), [users]);

  const stockLabel = (s: ItemPurchaseItem) => {
    if (s.itemName) return s.itemName;
    const im = itemMap[s.itemId ?? ''];
    return im ? `${im.name} (${im.itemCode})` : '—';
  };

  const [editStockId, setEditStockId] = useState<string | null>(null);
  const [editStockForm, setEditStockForm] = useState({ batchNo: '', expiryDate: '', qtyRemaining: 0, purchasePrice: 0, salePrice: 0 });
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set());
  const [viewingDispatch, setViewingDispatch] = useState<any | null>(null);
  const [stockSearch, setStockSearch] = useState('');
  const [stockPerPage, setStockPerPage] = useState(25);
  const [stockPage, setStockPage] = useState(1);
  const [stockSortKey, setStockSortKey] = useState<string | null>('batchNo');
  const [stockSortDir, setStockSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleStockSort = (key: string) => {
    if (stockSortKey === key) {
      setStockSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setStockSortKey(key);
      setStockSortDir('asc');
    }
  };

  const filteredStocks = useMemo(() => {
    if (!stockSearch) return visibleStocks;
    const q = stockSearch.toLowerCase();
    return visibleStocks.filter(s => {
      const label = stockLabel(s).toLowerCase();
      const batch = (s.batchNo || '').toLowerCase();
      return label.includes(q) || batch.includes(q);
    });
  }, [visibleStocks, stockSearch]);

  const sortedFilteredStocks = useMemo(() => {
    if (!stockSortKey) return filteredStocks;
    return [...filteredStocks].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;
      if (stockSortKey === 'label') {
        aVal = stockLabel(a);
        bVal = stockLabel(b);
      } else {
        aVal = (a as any)[stockSortKey];
        bVal = (b as any)[stockSortKey];
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return stockSortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredStocks, stockSortKey, stockSortDir]);

  const totalStockPages = Math.max(1, Math.ceil(sortedFilteredStocks.length / stockPerPage));

  useEffect(() => {
    if (stockPage > totalStockPages) setStockPage(totalStockPages);
  }, [stockPage, totalStockPages]);

  const paginatedStocks = useMemo(
    () => sortedFilteredStocks.slice((stockPage - 1) * stockPerPage, stockPage * stockPerPage),
    [sortedFilteredStocks, stockPage, stockPerPage]
  );

  const dispatchedLabel = (d: ItemDispatch) => {
    const byName = d.dispatchedByUser ? `${d.dispatchedByUser.firstName} ${d.dispatchedByUser.fatherName}` : d.dispatchedBy || '';
    const toName = d.dispatchedToUser ? `${d.dispatchedToUser.firstName} ${d.dispatchedToUser.fatherName}` : d.dispatchedTo || '';
    return { byName, toName };
  };

  const dispatchedEnriched = useMemo(() =>
    (dispatched as ItemDispatch[]).map(d => ({
      ...d,
      _dispatchedBy: dispatchedLabel(d).byName,
      _dispatchedTo: dispatchedLabel(d).toName,
      _itemsCount: d.items?.length || 0,
      _itemNames: (d.items || []).map(item => {
        const s = item.purchaseItem;
        return s ? stockLabel(s) : `Item #${item.purchaseItemId.slice(0, 8)}`;
      }).join(', '),
    })), [dispatched, itemMap]);

  const dispatchedColumns = useMemo<SmartColumn<any>[]>(() => [
    { header: 'Item Name', accessor: '_itemNames' as any, sortable: true, render: (r: any) => r._itemNames || '—' },
    { header: 'Dispatched By', accessor: '_dispatchedBy' as any, sortable: true, render: (r: any) => r._dispatchedBy || '—' },
    { header: 'Dispatched To', accessor: '_dispatchedTo' as any, sortable: true, render: (r: any) => r._dispatchedTo || '—' },
    { header: 'Items', accessor: '_itemsCount' as any, sortable: true },
    { header: 'Status', accessor: 'dispatchStatus', sortable: true, render: (r: any) => {
      const cls = r.dispatchStatus === 'Confirmed' ? styles.statusConfirmed
        : r.dispatchStatus === 'Rejected' ? styles.statusRejected
        : styles.statusPending;
      return <span className={`${styles.statusBadge} ${cls}`}>{r.dispatchStatus}</span>;
    }},
    { header: 'Dispatch Date', accessor: 'dispatchDate', sortable: true, render: (r: any) => formatServerDate(r.dispatchDate) },
    { header: 'Action', width: '80px', textAlign: 'center', render: (r: any) =>
      <button className={styles.actionView} onClick={() => setViewingDispatch(r)} title="View Details"><MdVisibility /></button>
    },
  ], []);

  const [itemSearch, setItemSearch] = useState('');
  const [itemSearchActive, setItemSearchActive] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const [variantPicker, setVariantPicker] = useState<{ index: number; itemId: string; variants: { id: string; name: string }[]; checked: Record<string, boolean> } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleStockSelect = (id: string) => {
    setSelectedStockIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStockIds.size === filteredStocks.length) {
      setSelectedStockIds(new Set());
    } else {
      setSelectedStockIds(new Set(filteredStocks.map((s: ItemPurchaseItem) => s.id)));
    }
  };

  const dispatchSelected = () => {
    const selected = filteredStocks.filter((s: ItemPurchaseItem) => selectedStockIds.has(s.id));
    if (selected.length === 0) { toast.error('No stock items selected'); return; }
    setDispatchItems(selected.map(s => ({ purchaseItemId: s.id, purchaseItemLabel: `${s.itemName} (${s.batchNo || 'N/A'})`, quantity: 0, currentQty: s.qtyRemaining })));
    setSelectedStockIds(new Set());
    setTab('dispatch');
  };

  const stockDispatch = (s: ItemPurchaseItem) => {
    setDispatchItems([{ purchaseItemId: s.id, purchaseItemLabel: `${s.itemName} (${s.batchNo || 'N/A'})`, quantity: 0, currentQty: s.qtyRemaining }]);
    setTab('dispatch');
  };

  const openEditStock = (s: ItemPurchaseItem) => {
    setEditStockId(s.id);
    setEditStockForm({ batchNo: s.batchNo || '', expiryDate: s.expiryDate || '', qtyRemaining: s.qtyRemaining, purchasePrice: Number(s.purchasePrice), salePrice: Number(s.salePrice) });
  };

  const saveEditStock = async (s: ItemPurchaseItem) => {
    toast.success('Stock updated (UI only)');
    setEditStockId(null);
  };

  // Register form state
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [formItems, setFormItems] = useState<PurchaseFormItem[]>([emptyItem()]);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPhone: '', email: '', address: '' });
  const [dispatchedToUserId, setDispatchedToUserId] = useState<string>('');

  const updateItem = (index: number, field: keyof PurchaseFormItem, value: string | number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (field === 'itemId') {
        if (!value) {
          updated[index] = { ...updated[index], itemId: '', itemName: '', uom: '' };
        } else {
          const item = items.find((d) => d.id === value);
          if (item) {
            updated[index] = {
              ...updated[index],
              itemId: item.id,
              itemName: item.name,
              uom: item.unitOfMeasure?.name ?? '',
            };
          }
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addRow = () => setFormItems((prev) => [...prev, emptyItem()]);
  const removeRow = (i: number) => setFormItems((prev) => prev.filter((_, idx) => idx !== i));

  const closeDropdown = () => { setItemSearchActive(-1); setDropdownPos(null); setItemSearch(''); setVariantPicker(null); };

  const handleItemPicked = (index: number, itemId: string) => {
    const item = items.find(d => d.id === itemId);
    if (!item) return;
    closeDropdown();
    const custVars = (item.variants ?? []).filter(v => v.isActive !== false && v.variantName !== item.name);
    if (custVars.length > 0) {
      updateItem(index, 'itemId', itemId);
      setVariantPicker({ index, itemId, variants: custVars.map(v => ({ id: v.id, name: v.variantName })), checked: {} });
    } else {
      updateItem(index, 'itemId', itemId);
    }
  };

  const addCheckedVariants = () => {
    if (!variantPicker) return;
    const checked = variantPicker.variants.filter(v => variantPicker.checked[v.name] !== false);
    if (checked.length === 0) return;
    const item = items.find(d => d.id === variantPicker.itemId);
    if (!item) return;
    setFormItems((prev) => {
      const updated = [...prev];
      const newRows = checked.map(v => ({ ...emptyItem(), itemId: item.id, variantId: v.id, itemName: v.name }));
      updated.splice(variantPicker.index, 1, ...newRows);
      return updated;
    });
    setVariantPicker(null);
    closeDropdown();
  };

  const lastRow = formItems[formItems.length - 1];
  useEffect(() => {
    if (lastRow && lastRow.itemId && lastRow.quantity > 0 && Number(lastRow.purchasePrice) > 0 && Number(lastRow.salePrice) > 0) {
      setFormItems(prev => [...prev, emptyItem()]);
    }
  }, [lastRow]);

  const totalQty = formItems.reduce((s, it) => s + Number(it.quantity), 0);
  const totalAmt = formItems.reduce((s, it) => s + Number(it.purchasePrice) * Number(it.quantity), 0);

  const handleSavePurchase = async () => {
    if (!invoiceNo) { toast.error('Invoice number is required'); return; }
    const filled = formItems.filter(it => it.itemId);
    if (filled.length === 0) { toast.error('Add at least one item'); return; }
    if (filled.some((it) => it.quantity < 1)) { toast.error('Quantity must be at least 1 for all rows'); return; }
    if (filled.some((it) => Number(it.purchasePrice) <= 0)) { toast.error('Purchase price must be greater than 0'); return; }
    if (filled.some((it) => Number(it.salePrice) <= 0)) { toast.error('Sale price must be greater than 0'); return; }
    try {
      await savePurchase({
        invoiceNo,
        supplierId,
        purchaseDate,
        items: filled.map(it => ({
          itemId: it.itemId || undefined,
          variantId: it.variantId || undefined,
          itemName: it.itemName,
          uom: it.uom,
          quantity: it.quantity,
          purchasePrice: Number(it.purchasePrice),
          salePrice: Number(it.salePrice),
          batchNo: it.batchNo || undefined,
          expiryDate: it.expiryDate || undefined,
          qtyRemaining: it.quantity,
        })),
      }).unwrap();

      toast.success('Purchase saved successfully!');

      setInvoiceNo('');
      setSupplierId(undefined);
      setPurchaseDate(today);
      setFormItems([emptyItem()]);
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
          purchaseItemLabel: stockItem ? `${stockItem.itemName} (${stockItem.batchNo || 'N/A'})` : '',
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
      await dispatchItem({
        dispatchDate: today,
        ...(user?.id ? { dispatchedBy: user.id } : {}),
        dispatchedTo: dispatchedToUserId,
        items: dispatchItems.map(it => ({
          purchaseItemId: it.purchaseItemId,
          quantity: it.quantity,
        })),
      }).unwrap();
      toast.success('Items dispatched successfully!');
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
        <h1 className={styles.pageTitle}>Purchased Item Registration</h1>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`} onClick={() => setTab('register')}>
          <MdAdd className={styles.tabIcon} /> Register Items
        </button>
        <button className={`${styles.tab} ${tab === 'stocks' ? styles.tabActive : ''}`} onClick={() => setTab('stocks')}>
          <MdInventory className={styles.tabIcon} /> Item Stocks
        </button>
        <button className={`${styles.tab} ${tab === 'dispatch' ? styles.tabActive : ''}`} onClick={() => setTab('dispatch')}>
          <MdLocalShipping className={styles.tabIcon} />
          Dispatch Items
          {pendingDispatches > 0 && <span className={styles.tabBadge}>{pendingDispatches}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'dispatched' ? styles.tabActive : ''}`} onClick={() => setTab('dispatched')}>
          <MdCheckCircle className={styles.tabIcon} /> Dispatched Items
        </button>
      </div>

      {/* ─── REGISTER TAB ─── */}
      {tab === 'register' && (
        <div className={styles.tabContent}>
          <div className={styles.formHeader}>
            <div className={styles.formField}>
              <label>Invoice No <span className={styles.req}>*</span></label>
              <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice number" />
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
              <label>Purchase Date</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
          </div>

          <div className={styles.itemsTableWrap}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Item <span className={styles.req}>*</span></th>
                  <th>UOM</th>
                  <th>Batch No</th>
                  <th>Expiry</th>
                  <th>Qty <span className={styles.req}>*</span></th>
                  <th>Purchase Price <span className={styles.req}>*</span></th>
                  <th>Sale Price <span className={styles.req}>*</span></th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {formItems.map((item, i) => (
                  <tr key={i}>
                    <td className={styles.itemCell}>
                      <div className={styles.searchSelectWrap}>
                        <TextField
                          ref={el => { inputRefs.current[i] = el; }}
                          value={itemSearchActive === i ? itemSearch : (() => { const d = items.find(x => x.id === item.itemId); if (!d) return ''; if (item.variantId) { const v = d.variants?.find(x => x.id === item.variantId); if (v) return v.variantName; } const hasCustom = d.variants?.some(v => v.variantName !== d.name); if (hasCustom) { const selVar = d.variants?.find(v => v.variantName === item.itemName); return selVar ? selVar.variantName : `${d.name} (${d.itemCode})`; } return `${d.name} (${d.itemCode})`; })()}
                          onChange={(e) => { setItemSearch(e.target.value); setItemSearchActive(i); }}
                          onFocus={(e) => {
                            setItemSearch(''); setItemSearchActive(i); setVariantPicker(null);
                            const r = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - r.bottom;
                            setDropdownPos({ top: r.bottom, left: r.left, width: r.width, maxH: Math.min(320, spaceBelow - 8) });
                          }}
                          placeholder="Search item..." />
                        {item.itemId && itemSearchActive !== i && !variantPicker && (
                          <button type="button" className={styles.clearSearchBtn} onClick={() => { updateItem(i, 'itemId', ''); inputRefs.current[i]?.focus(); setVariantPicker(null); }} title="Clear">✕</button>
                        )}
                        {itemSearchActive === i && dropdownPos && (
                          <>
                            <div className={styles.searchOverlay} onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeDropdown(); }} />
                            <div className={styles.searchDropdownFixed} style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, maxHeight: dropdownPos.maxH }} onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const flat: { id: string; name: string; search: string[] }[] = [];
                                for (const it of items) {
                                  const custVars = (it.variants ?? []).filter(v => v.isActive !== false && v.variantName !== it.name);
                                  const searchTerms = [it.name, it.itemCode, ...custVars.map(v => v.variantName)];
                                  flat.push({ id: it.id, name: `${it.name} (${it.itemCode})`, search: searchTerms });
                                }
                                return flat.filter(d => !itemSearch || d.search.some(s => s.toLowerCase().includes(itemSearch.toLowerCase())))
                                  .map(d => (
                                    <div key={d.id} className={`${styles.searchOption} ${item.itemId === d.id ? styles.searchOptionActive : ''}`}
                                      onClick={() => handleItemPicked(i, d.id)}>
                                      {d.name}
                                    </div>
                                  ));
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td><TextField w={120} value={item.uom} onChange={(e) => updateItem(i, 'uom', e.target.value)} placeholder="Pieces" readOnly={!!item.itemId && (items.find(d => d.id === item.itemId)?.unitOfMeasure?.name != null)} /></td>
                    <td><TextField value={item.batchNo} onChange={(e) => updateItem(i, 'batchNo', e.target.value)} placeholder="Batch" /></td>
                    <td><TextField type="date" value={item.expiryDate} onChange={(e) => updateItem(i, 'expiryDate', e.target.value)} /></td>
                    <td><TextField value={item.quantity || ''} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value) || 0)} placeholder="1" /></td>
                    <td><TextField value={item.purchasePrice === 0 ? '' : String(item.purchasePrice)} onChange={(e) => updateItem(i, 'purchasePrice', e.target.value)} placeholder="0.00" /></td>
                    <td><TextField value={item.salePrice === 0 ? '' : String(item.salePrice)} onChange={(e) => updateItem(i, 'salePrice', e.target.value)} placeholder="0.00" /></td>
                    <td className={styles.totalCell}>{(Number(item.quantity) * Number(item.purchasePrice)).toFixed(2)}</td>
                    <td>
                      <button className={styles.rowDeleteBtn} onClick={() => removeRow(i)} disabled={formItems.length === 1} title="Remove row">
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
                  <td colSpan={2} />
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
              const hasLossItem = formItems.some(it => it.itemId && Number(it.purchasePrice) > 0 && Number(it.salePrice) > 0 && Number(it.purchasePrice) > Number(it.salePrice));
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
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>Add New Supplier</h3>
                  <button className={styles.formCloseBtn} onClick={() => setSupplierFormOpen(false)} aria-label="Close"><MdClose /></button>
                </div>
                <div className={styles.modalBody}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className={styles.formField}>
                      <label>Name <span className={styles.req}>*</span></label>
                      <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="Supplier name" />
                    </div>
                    <div className={styles.formField}>
                      <label>Phone</label>
                      <input type="text" value={supplierForm.contactPhone} onChange={(e) => setSupplierForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="Contact phone" />
                    </div>
                    <div className={styles.formField}>
                      <label>Email</label>
                      <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                    </div>
                    <div className={styles.formField}>
                      <label>Address</label>
                      <input type="text" value={supplierForm.address} onChange={(e) => setSupplierForm(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
                    </div>
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

      {variantPicker && (
        <div className={styles.modalOverlay} onClick={() => setVariantPicker(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className={styles.modalHeader}>
              <h3>Select Variants</h3>
              <button className={styles.formCloseBtn} onClick={() => setVariantPicker(null)} aria-label="Close"><MdClose /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{items.find(x => x.id === variantPicker.itemId)?.name}</p>
              {variantPicker.variants.map(v => (
                <label key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={variantPicker.checked[v.name] !== false}
                    onChange={() => setVariantPicker(p => p ? { ...p, checked: { ...p.checked, [v.name]: !(p.checked[v.name] ?? true) } } : null)} />
                  {v.name}
                </label>
              ))}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => { const idx = variantPicker.index; const itemId = variantPicker.itemId; updateItem(idx, 'itemId', ''); setVariantPicker(null); }}>Cancel</button>
              <button className={styles.saveBtn} onClick={addCheckedVariants}><MdSave /> Add Selected</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STOCKS TAB ─── */}
      {tab === 'stocks' && (
        <div className={styles.tabContent}>
          {visibleStocks.length === 0 ? (
            <p className={styles.emptyCell}>No stock records found. Register a purchase first.</p>
          ) : (
            <>
              <div className={styles.stockActions}>
                {selectedStockIds.size > 0 && (
                  <>
                    <span className={styles.selectedCount}>{selectedStockIds.size} selected</span>
                    <button className={styles.dispatchSelectedBtn} onClick={dispatchSelected}>
                      <MdLocalShipping /> Dispatch Selected ({selectedStockIds.size})
                    </button>
                  </>
                )}
              </div>
              <div className={styles.tableControls}>
                <div className={styles.showEntries}>
                  <label>Show</label>
                  <select value={stockPerPage} onChange={(e) => { setStockPerPage(Number(e.target.value)); setStockPage(1); }} aria-label="Show entries">
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <label>entries</label>
                </div>
                <div className={styles.searchBox}>
                  <label>Search:</label>
                  <div className={styles.searchInputWrap}>
                    <MdSearch className={styles.searchIcon} />
                    <input type="text" value={stockSearch} onChange={(e) => { setStockSearch(e.target.value); setStockPage(1); }} placeholder="Search item or batch..." />
                  </div>
                </div>
              </div>
              <div className={styles.itemsTableWrap}>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th className={styles.checkCol}>
                        <input type="checkbox" checked={selectedStockIds.size === filteredStocks.length && filteredStocks.length > 0}
                          onChange={toggleSelectAll} />
                      </th>
                      <th className={styles.thSortable} onClick={() => toggleStockSort('label')}><span className={styles.thInner}><span>Item Name</span>{stockSortKey === 'label' ? (stockSortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />) : <MdUnfoldMore className={styles.sortIcon} />}</span></th>
                      <th className={styles.thSortable} onClick={() => toggleStockSort('batchNo')}><span className={styles.thInner}><span>Batch No</span>{stockSortKey === 'batchNo' ? (stockSortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />) : <MdUnfoldMore className={styles.sortIcon} />}</span></th>
                      <th className={styles.thSortable} onClick={() => toggleStockSort('expiryDate')}><span className={styles.thInner}><span>Expiry</span>{stockSortKey === 'expiryDate' ? (stockSortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />) : <MdUnfoldMore className={styles.sortIcon} />}</span></th>
                      <th className={styles.thSortable} onClick={() => toggleStockSort('quantity')}><span className={styles.thInner}><span>Qty</span>{stockSortKey === 'quantity' ? (stockSortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />) : <MdUnfoldMore className={styles.sortIcon} />}</span></th>
                      <th className={styles.thSortable} onClick={() => toggleStockSort('purchasePrice')}><span className={styles.thInner}><span>Purchase Price</span>{stockSortKey === 'purchasePrice' ? (stockSortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />) : <MdUnfoldMore className={styles.sortIcon} />}</span></th>
                      <th className={styles.thSortable} onClick={() => toggleStockSort('salePrice')}><span className={styles.thInner}><span>Sale Price</span>{stockSortKey === 'salePrice' ? (stockSortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />) : <MdUnfoldMore className={styles.sortIcon} />}</span></th>
                      <th><span className={styles.thInner}><span>Total Price</span></span></th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStocks.map((s, i) => (
                      <tr key={s.id ?? i} className={`${selectedStockIds.has(s.id) ? styles.rowSelected : ''}`}>
                        <td className={styles.checkCol}>
                          <input type="checkbox" checked={selectedStockIds.has(s.id)} onChange={() => toggleStockSelect(s.id)} />
                        </td>
                        <td>{stockLabel(s)}</td>
                        {editStockId === s.id ? (
                          <>
                            <td><input type="text" value={editStockForm.batchNo} onChange={(e) => setEditStockForm(p => ({ ...p, batchNo: e.target.value }))} /></td>
                            <td><input type="date" value={editStockForm.expiryDate} onChange={(e) => setEditStockForm(p => ({ ...p, expiryDate: e.target.value }))} /></td>
                            <td>{s.quantity}</td>
                            <td><input type="number" step="0.01" value={editStockForm.purchasePrice} onChange={(e) => setEditStockForm(p => ({ ...p, purchasePrice: Number(e.target.value) }))} /></td>
                            <td><input type="number" step="0.01" value={editStockForm.salePrice} onChange={(e) => setEditStockForm(p => ({ ...p, salePrice: Number(e.target.value) }))} /></td>
                            <td>{(Number(s.purchasePrice) * Number(s.quantity)).toFixed(2)}</td>
                            <td>
                              <span className={styles.actionBtns}>
                                <button className={styles.editSaveBtn} onClick={() => saveEditStock(s)} title="Save"><MdSave /></button>
                                <button className={styles.editCancelBtn} onClick={() => setEditStockId(null)} title="Cancel"><MdClose /></button>
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{s.batchNo || '—'}</td>
                            <td>{s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : '—'}</td>
                            <td>{s.quantity}</td>
                            <td>{Number(s.purchasePrice).toFixed(2)}</td>
                            <td>{Number(s.salePrice).toFixed(2)}</td>
                            <td>{(Number(s.purchasePrice) * Number(s.quantity)).toFixed(2)}</td>
                            <td>
                              <span className={styles.actionBtns}>
                                <button className={styles.actionEdit} onClick={() => openEditStock(s)} title="Edit"><MdEdit /></button>
                                <button className={styles.actionDispatch} onClick={() => stockDispatch(s)} title="Dispatch"><MdLocalShipping /></button>
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedFilteredStocks.length > 0 && (
                <>
                  <div className={styles.paginationBar}>
                    <div className={styles.paginationInfo}>
                      Showing {(stockPage - 1) * stockPerPage + 1}&ndash;{Math.min(stockPage * stockPerPage, sortedFilteredStocks.length)} of {sortedFilteredStocks.length} entries
                    </div>
                    <div className={styles.paginationControls}>
                      <button className={styles.pageBtn} disabled={stockPage <= 1} onClick={() => setStockPage(p => Math.max(1, p - 1))}>
                        <MdChevronLeft />
                      </button>
                      {(() => {
                        const pages: number[] = [];
                        const start = Math.max(1, stockPage - 2);
                        const end = Math.min(totalStockPages, stockPage + 2);
                        for (let i = start; i <= end; i++) pages.push(i);
                        return pages;
                      })().map(p => (
                        <button key={p} className={`${styles.pageBtn} ${p === stockPage ? styles.pageBtnActive : ''}`} onClick={() => setStockPage(p)}>{p}</button>
                      ))}
                      <button className={styles.pageBtn} disabled={stockPage >= totalStockPages} onClick={() => setStockPage(p => Math.min(totalStockPages, p + 1))}>
                        <MdChevronRight />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <div style={{ background: '#1a73e8', color: '#fff', padding: '8px 24px', borderRadius: 6, fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
                      Grand Total Purchased: {sortedFilteredStocks.reduce((s, it) => s + Number(it.quantity), 0)} items | {sortedFilteredStocks.reduce((s, it) => s + Number(it.purchasePrice) * Number(it.quantity), 0).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── DISPATCH TAB ─── */}
      {tab === 'dispatch' && (
        <div className={styles.tabContent}>
          <h2 className={styles.subTitle}>Dispatch Items from Stock</h2>
          {dispatchItems.length === 0 ? (
            <p className={styles.emptyCell}>Select stock items from the Stocks tab to dispatch.</p>
          ) : (
            <>
              <div className={styles.itemsTableWrap}>
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Available Qty</th>
                      <th>Dispatch Qty <span className={styles.req}>*</span></th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchItems.map((item, i) => {
                      const stock = (stocks as ItemPurchaseItem[]).find(s => s.id === item.purchaseItemId);
                      return (
                        <tr key={i}>
                          <td>
                            {item.purchaseItemId && stock ? (
                              <span className={styles.itemLabel}>{stockLabel(stock)} <span className={styles.batchLabel}>({stock.batchNo || 'N/A'})</span></span>
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
                            <input type="number" min={1} max={item.currentQty} value={item.quantity || ''}
                              onChange={(e) => updateDispatchItem(i, 'quantity', Number(e.target.value))} placeholder="1" />
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
            emptyMessage="No dispatched items yet."
            searchFilter={(row: any, q: string) =>
              (row._dispatchedBy || '').toLowerCase().includes(q) ||
              (row._dispatchedTo || '').toLowerCase().includes(q) ||
              (row.dispatchDate || '').toLowerCase().includes(q) ||
              (row.dispatchStatus || '').toLowerCase().includes(q)
            }
          />

          {viewingDispatch && (
            <div className={styles.modalOverlay} onClick={() => setViewingDispatch(null)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>Dispatch Details</h3>
                  <button className={styles.formCloseBtn} onClick={() => setViewingDispatch(null)} aria-label="Close"><MdClose /></button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.detailGrid}>
                    {[
                      ['Dispatch Date', formatServerDate(viewingDispatch.dispatchDate)],
                      ['Dispatched By', viewingDispatch._dispatchedBy || '—'],
                      ['Dispatched To', viewingDispatch._dispatchedTo || '—'],
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
                          const stock = (stocks as ItemPurchaseItem[]).find(s => s.id === item.purchaseItemId);
                          return { ...item, _stock: stock };
                        })}
                        columns={[
                          { header: 'Item', render: (r: any) => r._stock ? stockLabel(r._stock) : `Stock #${r.purchaseItemId}`, sortable: true },
                          { header: 'Batch No', accessor: '_stock.batchNo' as any, render: (r: any) => r._stock?.batchNo || '—', sortable: true },
                          { header: 'Expiry', render: (r: any) => r._stock?.expiryDate ? new Date(r._stock.expiryDate).toLocaleDateString() : '—', sortable: true },
                          { header: 'Stock Qty', accessor: '_stock.quantity' as any, render: (r: any) => r._stock?.quantity ?? '—', textAlign: 'center' },
                          { header: 'Dispatch Qty', accessor: 'quantity' as any, render: (r: any) => r.quantity, textAlign: 'center', sortable: true },
                          { header: 'Purchase Price', render: (r: any) => r._stock?.purchasePrice != null ? Number(r._stock.purchasePrice).toLocaleString() : '—' },
                          { header: 'Sale Price', render: (r: any) => r._stock?.salePrice != null ? Number(r._stock.salePrice).toLocaleString() : '—' },
                          { header: 'Qty Remaining', accessor: '_stock.qtyRemaining' as any, render: (r: any) => r._stock?.qtyRemaining ?? '—', textAlign: 'center', sortable: true },
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
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ width: 400, maxWidth: '90vw' }}>
            <div className={styles.modalHeader}>
              <h3>Confirm Save</h3>
              <button className={styles.formCloseBtn} onClick={() => setConfirmSaveOpen(false)}><MdClose /></button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: 14, color: 'var(--gray-700)', margin: 0 }}>Are you sure you want to save this purchase?</p>
              {formItems.some(it => it.itemId && Number(it.purchasePrice) > 0 && Number(it.salePrice) > 0 && Number(it.purchasePrice) > Number(it.salePrice)) && (
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
