'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Modal, Button } from '@mantine/core';
import { MdClose, MdSave, MdDelete, MdAdd, MdDevicesOther } from 'react-icons/md';
import {
  useCreateDrugSaleMutation,
  useUpdateDrugSaleMutation,
  useGetDispatchedDrugsQuery,
  useGetDrugStocksQuery,
  useGetDispatchedItemsQuery,
  useGetItemStocksQuery,
  useGetUserDetailQuery,
  DrugDispatch,
  DrugPurchaseItem,
  ItemDispatch,
  ItemPurchaseItem,
  CreateDrugSaleDto,
} from '@/store/services/drugApi';
import styles from './DrugSales.module.css';

type Tab = 'drug-sales' | 'non-drug-sales';

const today = new Date().toISOString().split('T')[0];

let keyCounter = 0;

interface SaleDrugItem {
  _key: number;
  medicationName: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number;
  dispatchDetailId: string | null;
}

interface SaleItemRow {
  _key: number;
  itemId: string | null;
  itemName: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number;
  dispatchDetailId: string | null;
}

const emptyDrugItem = (): SaleDrugItem => ({
  _key: ++keyCounter,
  medicationName: '',
  quantity: null,
  unitPrice: null,
  totalPrice: 0,
  dispatchDetailId: null,
});

const emptyItemRow = (): SaleItemRow => ({
  _key: ++keyCounter,
  itemId: null,
  itemName: '',
  quantity: null,
  unitPrice: null,
  totalPrice: 0,
  dispatchDetailId: null,
});

interface FormData {
  fullName: string;
  mrn: string;
  sex: string;
  age: string;
  soldAt: string;
  payerType: string;
  paymentMethod: string;
  drugItems: SaleDrugItem[];
  itemRows: SaleItemRow[];
}

const emptyForm = (): FormData => ({
  fullName: '',
  mrn: '',
  sex: '',
  age: '',
  soldAt: today,
  payerType: 'patient',
  paymentMethod: 'cash',
  drugItems: [],
  itemRows: [],
});

export default function DrugSalesPage() {
  const [tab, setTab] = useState<Tab>('drug-sales');

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Add New Sale</h2>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'drug-sales' ? styles.tabActive : ''}`} onClick={() => setTab('drug-sales')}>
          Drug Sales
        </button>
        <button className={`${styles.tab} ${tab === 'non-drug-sales' ? styles.tabActive : ''}`} onClick={() => setTab('non-drug-sales')}>
          Non-Drug Sales
        </button>
      </div>

      {tab === 'drug-sales' ? <DrugSaleForm /> : <NonDrugSaleTab />}
    </div>
  );
}

function DrugSaleForm() {
  const { data: dispatched = [] } = useGetDispatchedDrugsQuery();
  const { data: stocks = [] } = useGetDrugStocksQuery();
  const { data: itemDispatched = [] } = useGetDispatchedItemsQuery();
  const { data: itemStocks = [] } = useGetItemStocksQuery();
  const [createSale] = useCreateDrugSaleMutation();
  const [updateSale] = useUpdateDrugSaleMutation();
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  const { data: user } = useGetUserDetailQuery(undefined, { skip: !hasToken });

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [itemDrugOpen, setItemDrugOpen] = useState<Record<number, boolean>>({});
  const [itemSearchOpen, setItemSearchOpen] = useState<Record<number, boolean>>({});
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ payload: CreateDrugSaleDto; isUpdate: boolean; saleId: string | null; lossItems: string[] } | null>(null);

  const confirmedDispatches = (dispatched as DrugDispatch[]).filter(d => d.dispatchStatus === 'Confirmed');
  const confirmedItemDispatches = (itemDispatched as ItemDispatch[]).filter(d => d.dispatchStatus === 'Confirmed');

  const stockById = useMemo(() => {
    const map: Record<string, DrugPurchaseItem> = {};
    for (const s of stocks as DrugPurchaseItem[]) {
      map[s.id] = s;
    }
    return map;
  }, [stocks]);

  const itemStockById = useMemo(() => {
    const map: Record<string, ItemPurchaseItem> = {};
    for (const s of itemStocks as ItemPurchaseItem[]) {
      map[s.id] = s;
    }
    return map;
  }, [itemStocks]);

  const dispatchItemOptions = useMemo(() => {
    const options: Array<{ dispatchDetailId: string; drugLabel: string; salePrice: number; purchasePrice: number; qtyRemaining: number }> = [];
    for (const d of confirmedDispatches) {
      for (const di of d.items) {
        const s = di.purchaseItem || stockById[di.purchaseItemId];
        if (!s) continue;
        const drugLabel = s.drug
          ? `${s.drug.genericName} ${s.drug.dosageForm} - ${s.drug.strength}`
          : s.drugName;
        if (di.currentQty <= 0) continue;
        options.push({ dispatchDetailId: di.id, drugLabel, salePrice: Number(s.salePrice), purchasePrice: Number(s.purchasePrice), qtyRemaining: di.currentQty });
      }
    }
    return options;
  }, [confirmedDispatches]);

  const dispatchedItemsOptions = useMemo(() => {
    const options: Array<{ dispatchDetailId: string; itemLabel: string; salePrice: number; purchasePrice: number; qtyRemaining: number }> = [];
    for (const d of confirmedItemDispatches) {
      for (const di of d.items) {
        const s = di.purchaseItem || itemStockById[di.purchaseItemId];
        if (!s) continue;
        const itemLabel = s.item
          ? (s.itemName && s.itemName !== s.item.name ? s.itemName : `${s.item.name} (${s.item.itemCode})`)
          : s.itemName;
        const avail = di.currentQty ?? s.qtyRemaining;
        if (avail <= 0) continue;
        options.push({ dispatchDetailId: di.id, itemLabel, salePrice: Number(s.salePrice), purchasePrice: Number(s.purchasePrice), qtyRemaining: avail });
      }
    }
    return options;
  }, [confirmedItemDispatches, itemStockById]);

  const selectDrugForItem = (rowIndex: number, opt: { dispatchDetailId: string; drugLabel: string; salePrice: number }) => {
    setForm(prev => {
      const drugItems = [...prev.drugItems];
      const qty = Number(drugItems[rowIndex]?.quantity);
      drugItems[rowIndex] = {
        ...drugItems[rowIndex],
        _key: drugItems[rowIndex]._key,
        medicationName: opt.drugLabel,
        dispatchDetailId: opt.dispatchDetailId,
        unitPrice: opt.salePrice,
        totalPrice: qty ? opt.salePrice * qty : 0,
      };
      return { ...prev, drugItems };
    });
  };

  const selectItemForRow = (rowIndex: number, opt: { dispatchDetailId: string; itemLabel: string; salePrice: number }) => {
    setForm(prev => {
      const itemRows = [...prev.itemRows];
      const qty = Number(itemRows[rowIndex]?.quantity);
      itemRows[rowIndex] = {
        ...itemRows[rowIndex],
        _key: itemRows[rowIndex]._key,
        itemId: null,
        itemName: opt.itemLabel,
        dispatchDetailId: opt.dispatchDetailId,
        unitPrice: opt.salePrice,
        totalPrice: qty ? opt.salePrice * qty : 0,
      };
      return { ...prev, itemRows };
    });
  };

  const closeForm = () => { setEditingSaleId(null); setForm(emptyForm()); };

  const updateDrugItem = (index: number, field: keyof SaleDrugItem, value: string | number | null) => {
    setForm(prev => {
      const drugItems = [...prev.drugItems];
      drugItems[index] = { ...drugItems[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        drugItems[index].totalPrice = Number(drugItems[index].quantity) * Number(drugItems[index].unitPrice);
      }
      return { ...prev, drugItems };
    });
  };

  const updateItemRow = (index: number, field: keyof SaleItemRow, value: string | number | null) => {
    setForm(prev => {
      const itemRows = [...prev.itemRows];
      itemRows[index] = { ...itemRows[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        itemRows[index].totalPrice = Number(itemRows[index].quantity) * Number(itemRows[index].unitPrice);
      }
      return { ...prev, itemRows };
    });
  };

  const addDrugRow = () => setForm(prev => ({ ...prev, drugItems: [...prev.drugItems, emptyDrugItem()] }));
  const addItemRow = () => setForm(prev => ({ ...prev, itemRows: [...prev.itemRows, emptyItemRow()] }));
  const removeDrugRow = (i: number) => setForm(prev => ({ ...prev, drugItems: prev.drugItems.filter((_, idx) => idx !== i) }));
  const removeItemRow = (i: number) => setForm(prev => ({ ...prev, itemRows: prev.itemRows.filter((_, idx) => idx !== i) }));

  const drugSubTotal = form.drugItems.reduce((s, it) => s + Number(it.totalPrice), 0);
  const itemSubTotal = form.itemRows.reduce((s, it) => s + Number(it.totalPrice), 0);
  const saleGrandTotal = drugSubTotal + itemSubTotal;

  const handleSave = async () => {
    if (!form.fullName) { toast.error('Patient full name is required'); return; }
    if (form.drugItems.length > 0) {
      if (form.drugItems.some(it => !it.medicationName)) { toast.error('Medication name for all drug items is required'); return; }
      if (form.drugItems.some(it => !it.quantity || it.quantity < 1)) { toast.error('Drug quantity must be at least 1'); return; }
      if (form.drugItems.some(it => !it.unitPrice || it.unitPrice <= 0)) { toast.error('Drug unit price must be greater than 0'); return; }
    }
    const lossItems: string[] = [];
    for (const it of form.drugItems) {
      if (!it.dispatchDetailId) continue;
      const opt = dispatchItemOptions.find(o => o.dispatchDetailId === it.dispatchDetailId);
      if (opt && (it.quantity ?? 0) > opt.qtyRemaining) {
        toast.error(`Insufficient stock for "${it.medicationName}": requested ${it.quantity ?? 0}, available ${opt.qtyRemaining}`);
        return;
      }
      if (opt && it.unitPrice && it.unitPrice < opt.purchasePrice) {
        lossItems.push(`"${it.medicationName}" (cost: ${opt.purchasePrice}, selling: ${it.unitPrice})`);
      }
    }
    if (form.itemRows.some(it => !it.itemName)) { toast.error('Item name for all item rows is required'); return; }
    if (form.itemRows.some(it => !it.quantity || it.quantity < 1)) { toast.error('Item quantity must be at least 1'); return; }
    if (form.itemRows.some(it => !it.unitPrice || it.unitPrice <= 0)) { toast.error('Item unit price must be greater than 0'); return; }
    for (const it of form.itemRows) {
      if (!it.dispatchDetailId) continue;
      const opt = dispatchedItemsOptions.find(o => o.dispatchDetailId === it.dispatchDetailId);
      if (opt && (it.quantity ?? 0) > opt.qtyRemaining) {
        toast.error(`Insufficient stock for "${it.itemName}": requested ${it.quantity ?? 0}, available ${opt.qtyRemaining}`);
        return;
      }
      if (opt && it.unitPrice && it.unitPrice < opt.purchasePrice) {
        lossItems.push(`"${it.itemName}" (cost: ${opt.purchasePrice}, selling: ${it.unitPrice})`);
      }
    }
    const payload: CreateDrugSaleDto = {
      pharmacistId: user?.id,
      fullName: form.fullName,
      mrn: form.mrn || undefined,
      sex: form.sex || undefined,
      age: form.age || undefined,
      payerType: form.payerType,
      paymentMethod: form.paymentMethod,
      items: form.drugItems.map(it => ({
        medicationName: it.medicationName,
        quantity: it.quantity ?? 0,
        unitPrice: it.unitPrice ?? 0,
        totalPrice: it.totalPrice,
        dispatchDetailId: it.dispatchDetailId || undefined,
      })),
      itemItems: form.itemRows.map(it => ({
        itemId: it.itemId || undefined,
        itemName: it.itemName,
        quantity: it.quantity ?? 0,
        unitPrice: it.unitPrice ?? 0,
        totalPrice: it.totalPrice,
        dispatchDetailId: it.dispatchDetailId || undefined,
      })),
    };
    if (lossItems.length > 0) {
      setPendingSave({ payload, isUpdate: !!editingSaleId, saleId: editingSaleId, lossItems });
      setLossModalOpen(true);
      return;
    }
    await executeSave(payload, !!editingSaleId, editingSaleId);
  };

  const executeSave = async (payload: CreateDrugSaleDto, isUpdate: boolean, saleId: string | null) => {
    try {
      if (isUpdate) {
        await updateSale({ id: saleId!, ...payload }).unwrap();
        toast.success('Sale updated');
      } else {
        await createSale(payload).unwrap();
        toast.success('Drug sale recorded');
      }
      closeForm();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Failed to record sale';
      toast.error(msg);
    }
  };

  const confirmLossSale = async () => {
    if (!pendingSave) return;
    await executeSave(pendingSave.payload, pendingSave.isUpdate, pendingSave.saleId);
    setLossModalOpen(false);
    setPendingSave(null);
  };

  const cancelLossSale = () => {
    setLossModalOpen(false);
    setPendingSave(null);
  };

  return (
    <div className={styles.inlineForm}>
      <div className={styles.inlineFormBody}>
        <div className={styles.formField}>
          <label>Full Name <span className={styles.req}>*</span></label>
          <input type="text" value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Patient name" />
        </div>
        <div className={styles.formField}>
          <label htmlFor="sale-sex">Sex</label>
          <select id="sale-sex" value={form.sex} onChange={(e) => setForm(p => ({ ...p, sex: e.target.value }))}>
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className={styles.formField}>
          <label>Age</label>
          <input type="text" value={form.age} onChange={(e) => setForm(p => ({ ...p, age: e.target.value }))} placeholder="Age" />
        </div>
        <div className={styles.formField}>
          <label htmlFor="sale-payer-type">Payer Type</label>
          <select id="sale-payer-type" value={form.payerType} onChange={(e) => setForm(p => ({ ...p, payerType: e.target.value }))}>
            <option value="patient">Patient</option>
            <option value="insurance">Insurance</option>
            <option value="sponsor">Sponsor</option>
            <option value="free">Free</option>
          </select>
        </div>
        <div className={styles.formField}>
          <label htmlFor="sale-payment-method">Payment Method</label>
          <select id="sale-payment-method" value={form.paymentMethod} onChange={(e) => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
         <option value="cash">cash</option>
            <option value="mobile">Mobile</option>
            <option value="card">Card</option>
            <option value="credit">Credit</option>
             <option value="bank">Bank </option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className={styles.sectionLabel}>Drug Items</div>
      <div className={styles.itemsTableWrap}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Drug <span className={styles.req}>*</span></th>
              <th>Qty <span className={styles.req}>*</span></th>
              <th>Unit Price <span className={styles.req}>*</span></th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {form.drugItems.map((it, i) => (
              <tr key={it._key}>
                <td className={styles.drugCell}>
                  <div className={styles.drugSearchWrap}>
                    <div className={styles.searchInputWrap}>
                      <input type="text" value={it.medicationName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(prev => {
                            const drugItems = [...prev.drugItems];
                            drugItems[i] = { ...drugItems[i], medicationName: val, dispatchDetailId: null };
                            return { ...prev, drugItems };
                          });
                        }}
                        onFocus={() => setItemDrugOpen(prev => ({ ...prev, [i]: true }))}
                        onBlur={() => setTimeout(() => setItemDrugOpen(prev => ({ ...prev, [i]: false })), 200)}
                        placeholder="Search drug..." />
                      {it.dispatchDetailId && (
                        <button type="button" className={styles.clearSearchBtn} onClick={() => {
                          setForm(prev => {
                            const drugItems = [...prev.drugItems];
                            drugItems[i] = { ...drugItems[i], medicationName: '', dispatchDetailId: null, unitPrice: null, totalPrice: 0 };
                            return { ...prev, drugItems };
                          });
                        }} title="Clear">✕</button>
                      )}
                    </div>
                    <div className={`${styles.drugDropdownWrap} ${itemDrugOpen[i] ? styles.drugDropdownVisible : ''}`}>
                      <div className={styles.drugDropdown}>
                        {(() => {
                          const q = it.medicationName.toLowerCase();
                          const filtered = dispatchItemOptions.filter(o => o.drugLabel.toLowerCase().includes(q));
                          if (filtered.length === 0) return <div className={styles.searchEmpty}>No drugs match</div>;
                          return filtered.map(o => (
                            <div key={o.dispatchDetailId} className={styles.searchOption}
                              onMouseDown={() => { selectDrugForItem(i, o); setItemDrugOpen(prev => ({ ...prev, [i]: false })); }}>
                              <span className={styles.searchOptLabel}>{o.drugLabel}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{(() => {
                  const opt = it.dispatchDetailId ? dispatchItemOptions.find(o => o.dispatchDetailId === it.dispatchDetailId) : null;
                  return (
                    <div className={styles.qtyWrap}>
                      <span className={styles.availQty}>Avail: {opt ? opt.qtyRemaining - (it.quantity ?? 0) : '—'}</span>
                      <input type="number" min={1} value={it.quantity || ''} onChange={(e) => updateDrugItem(i, 'quantity', Number(e.target.value))} placeholder="1" />
                    </div>
                  );
                })()}</td>
                <td><input type="number" min={0.01} step="0.01" value={it.unitPrice || ''} onChange={(e) => updateDrugItem(i, 'unitPrice', Number(e.target.value))} placeholder="0.00" /></td>
                <td className={styles.totalCell}>{it.totalPrice.toFixed(2)}</td>
                <td>
                  <button className={styles.rowDeleteBtn} onClick={() => removeDrugRow(i)} title="Remove"><MdDelete /></button>
                </td>
              </tr>
            ))}
          </tbody>
          {form.drugItems.length > 0 && (
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={3} className={styles.totalLabel}>Drug Subtotal</td>
                <td className={styles.totalAmt}>{drugSubTotal.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className={styles.tableActions}>
        <button className={styles.addRowBtn} onClick={addDrugRow}><MdAdd /> Add Drug</button>
      </div>

      <div className={styles.divider} />

      {form.itemRows.length > 0 && (
        <><div className={styles.sectionLabel}>Other Items</div>
      <div className={styles.itemsTableWrap}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Item <span className={styles.req}>*</span></th>
              <th>Qty <span className={styles.req}>*</span></th>
              <th>Unit Price <span className={styles.req}>*</span></th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {form.itemRows.map((it, i) => (
                <tr key={it._key}>
                  <td className={styles.drugCell}>
                    <div className={styles.drugSearchWrap}>
                      <div className={styles.searchInputWrap}>
                        <input type="text" value={it.itemName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => {
                              const itemRows = [...prev.itemRows];
                              itemRows[i] = { ...itemRows[i], itemName: val, itemId: null };
                              return { ...prev, itemRows };
                            });
                          }}
                          onFocus={() => setItemSearchOpen(prev => ({ ...prev, [i]: true }))}
                          onBlur={() => setTimeout(() => setItemSearchOpen(prev => ({ ...prev, [i]: false })), 200)}
                          placeholder="Search item..." />
                        {it.dispatchDetailId && (
                          <button type="button" className={styles.clearSearchBtn} onClick={() => {
                            setForm(prev => {
                              const itemRows = [...prev.itemRows];
                              itemRows[i] = { ...itemRows[i], itemName: '', dispatchDetailId: null, unitPrice: null, totalPrice: 0 };
                              return { ...prev, itemRows };
                            });
                          }} title="Clear">✕</button>
                        )}
                      </div>
                      <div className={`${styles.drugDropdownWrap} ${itemSearchOpen[i] ? styles.drugDropdownVisible : ''}`}>
                        <div className={styles.drugDropdown}>
                          {(() => {
                            const q = it.itemName.toLowerCase();
                            const filtered = dispatchedItemsOptions.filter(o => o.itemLabel.toLowerCase().includes(q));
                            if (filtered.length === 0) return <div className={styles.searchEmpty}>No items match</div>;
                            return filtered.map(o => (
                              <div key={o.dispatchDetailId} className={styles.searchOption}
                                onMouseDown={() => { selectItemForRow(i, o); setItemSearchOpen(prev => ({ ...prev, [i]: false })); }}>
                                <span className={styles.searchOptLabel}>{o.itemLabel}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{(() => {
                    const opt = it.dispatchDetailId ? dispatchedItemsOptions.find(o => o.dispatchDetailId === it.dispatchDetailId) : null;
                    return (
                      <div className={styles.qtyWrap}>
                      <span className={styles.availQty}>Avail: {opt ? opt.qtyRemaining - (it.quantity ?? 0) : '—'}</span>
                        <input type="number" min={1} value={it.quantity || ''} onChange={(e) => updateItemRow(i, 'quantity', Number(e.target.value))} placeholder="1" />
                      </div>
                    );
                  })()}</td>
                  <td><input type="number" min={0.01} step="0.01" value={it.unitPrice || ''} onChange={(e) => updateItemRow(i, 'unitPrice', Number(e.target.value))} placeholder="0.00" /></td>
                  <td className={styles.totalCell}>{it.totalPrice.toFixed(2)}</td>
                  <td>
                    <button className={styles.rowDeleteBtn} onClick={() => removeItemRow(i)} title="Remove"><MdDelete /></button>
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={3} className={styles.totalLabel}>Items Subtotal</td>
              <td className={styles.totalAmt}>{itemSubTotal.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div></>
      )}
      <div className={styles.tableActions}>
        <button className={styles.addRowBtn} onClick={addItemRow}><MdDevicesOther /> Add Item</button>
      </div>

      <div className={styles.grandTotalRow}>
        <span className={styles.grandTotalLabel}>GRAND TOTAL (Drugs + Items)</span>
        <span className={styles.grandTotalAmt}>{saleGrandTotal.toFixed(2)}</span>
      </div>

      <div className={styles.inlineFormActions}>
        <button className={styles.saveBtn} onClick={handleSave}><MdSave /> Save</button>
        <button className={styles.cancelBtn} onClick={closeForm}><MdClose /> Cancel</button>
      </div>

      <Modal opened={lossModalOpen} onClose={cancelLossSale} title="Confirm Sale at Loss" centered>
        <p style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>
          {pendingSave && `⚠️ The following items are being sold below cost:\n\n${pendingSave.lossItems.join('\n')}\n\nThis will result in a loss. Do you want to proceed?`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="default" onClick={cancelLossSale}>Cancel</Button>
          <Button color="red" onClick={confirmLossSale}>Proceed</Button>
        </div>
      </Modal>
    </div>
  );
}

function NonDrugSaleTab() {
  const { data: itemDispatched = [] } = useGetDispatchedItemsQuery();
  const { data: itemStocks = [] } = useGetItemStocksQuery();
  const [createSale] = useCreateDrugSaleMutation();
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  const { data: user } = useGetUserDetailQuery(undefined, { skip: !hasToken });

  const confirmedItemDispatches = (itemDispatched as ItemDispatch[]).filter(d => d.dispatchStatus === 'Confirmed');

  const itemStockById = useMemo(() => {
    const map: Record<string, ItemPurchaseItem> = {};
    for (const s of itemStocks as ItemPurchaseItem[]) { map[s.id] = s; }
    return map;
  }, [itemStocks]);

  const dispatchedItemsOptions = useMemo(() => {
    const options: Array<{ dispatchDetailId: string; itemLabel: string; salePrice: number; purchasePrice: number; qtyRemaining: number }> = [];
    for (const d of confirmedItemDispatches) {
      for (const di of d.items) {
        const s = di.purchaseItem || itemStockById[di.purchaseItemId];
        if (!s) continue;
        const itemLabel = s.item ? (s.itemName && s.itemName !== s.item.name ? s.itemName : `${s.item.name} (${s.item.itemCode})`) : s.itemName;
        const avail = di.currentQty ?? s.qtyRemaining;
        if (avail <= 0) continue;
        options.push({ dispatchDetailId: di.id, itemLabel, salePrice: Number(s.salePrice), purchasePrice: Number(s.purchasePrice), qtyRemaining: avail });
      }
    }
    return options;
  }, [confirmedItemDispatches, itemStockById]);

  const [form, setForm] = useState({ fullName: '', mrn: '', sex: '', age: '', soldAt: today, payerType: 'patient', paymentMethod: 'cash', itemRows: [emptyItemRow()] });
  const [itemSearchOpen, setItemSearchOpen] = useState<Record<number, boolean>>({});
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ payload: CreateDrugSaleDto; lossItems: string[] } | null>(null);

  const updateItemRow = (index: number, field: keyof SaleItemRow, value: string | number | null) => {
    setForm(prev => {
      const itemRows = [...prev.itemRows];
      itemRows[index] = { ...itemRows[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        itemRows[index].totalPrice = Number(itemRows[index].quantity) * Number(itemRows[index].unitPrice);
      }
      return { ...prev, itemRows };
    });
  };

  const addItemRow = () => setForm(prev => ({ ...prev, itemRows: [...prev.itemRows, emptyItemRow()] }));
  const removeItemRow = (i: number) => setForm(prev => ({ ...prev, itemRows: prev.itemRows.filter((_, idx) => idx !== i) }));
  const itemTotal = form.itemRows.reduce((s, it) => s + Number(it.totalPrice), 0);

  const selectItemForRow = (rowIndex: number, opt: { dispatchDetailId: string; itemLabel: string; salePrice: number }) => {
    setForm(prev => {
      const itemRows = [...prev.itemRows];
      const qty = Number(itemRows[rowIndex]?.quantity);
      itemRows[rowIndex] = { ...itemRows[rowIndex], _key: itemRows[rowIndex]._key, itemId: null, itemName: opt.itemLabel, dispatchDetailId: opt.dispatchDetailId, unitPrice: opt.salePrice, totalPrice: qty ? opt.salePrice * qty : 0 };
      return { ...prev, itemRows };
    });
  };

  const handleSave = async () => {
    if (!form.fullName) { toast.error('Patient full name is required'); return; }
    if (form.itemRows.some(it => !it.itemName)) { toast.error('Item name for all rows is required'); return; }
    if (form.itemRows.some(it => !it.quantity || it.quantity < 1)) { toast.error('Item quantity must be at least 1'); return; }
    if (form.itemRows.some(it => !it.unitPrice || it.unitPrice <= 0)) { toast.error('Item unit price must be greater than 0'); return; }
    const lossItems: string[] = [];
    for (const it of form.itemRows) {
      if (!it.dispatchDetailId) continue;
      const opt = dispatchedItemsOptions.find(o => o.dispatchDetailId === it.dispatchDetailId);
      if (opt && (it.quantity ?? 0) > opt.qtyRemaining) {
        toast.error(`Insufficient stock for "${it.itemName}": requested ${it.quantity ?? 0}, available ${opt.qtyRemaining}`);
        return;
      }
      if (opt && it.unitPrice && it.unitPrice < opt.purchasePrice) {
        lossItems.push(`"${it.itemName}" (cost: ${opt.purchasePrice}, selling: ${it.unitPrice})`);
      }
    }
    const payload: CreateDrugSaleDto = {
      pharmacistId: user?.id,
      fullName: form.fullName,
      mrn: form.mrn || undefined,
      sex: form.sex || undefined,
      age: form.age || undefined,
      payerType: form.payerType,
      paymentMethod: form.paymentMethod,
      items: [],
      itemItems: form.itemRows.map(it => ({
        itemId: it.itemId || undefined,
        itemName: it.itemName,
        quantity: it.quantity ?? 0,
        unitPrice: it.unitPrice ?? 0,
        totalPrice: it.totalPrice,
        dispatchDetailId: it.dispatchDetailId || undefined,
      })),
    };
    if (lossItems.length > 0) {
      setPendingSave({ payload, lossItems });
      setLossModalOpen(true);
      return;
    }
    await executeSave(payload);
  };

  const executeSave = async (payload: CreateDrugSaleDto) => {
    try {
      await createSale(payload).unwrap();
      toast.success('Non-drug sale recorded');
      setForm({ fullName: '', mrn: '', sex: '', age: '', soldAt: today, payerType: 'patient', paymentMethod: 'cash', itemRows: [emptyItemRow()] });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Failed to record sale';
      toast.error(msg);
    }
  };

  const closeForm = () => setForm({ fullName: '', mrn: '', sex: '', age: '', soldAt: today, payerType: 'patient', paymentMethod: 'cash', itemRows: [emptyItemRow()] });

  return (
    <div className={styles.inlineForm}>
      <div className={styles.inlineFormBody}>
        <div className={styles.formField}>
          <label>Full Name <span className={styles.req}>*</span></label>
          <input type="text" value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Patient name" />
        </div>
        <div className={styles.formField}>
          <label htmlFor="nonsale-sex">Sex</label>
          <select id="nonsale-sex" value={form.sex} onChange={(e) => setForm(p => ({ ...p, sex: e.target.value }))}>
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className={styles.formField}>
          <label>Age</label>
          <input type="text" value={form.age} onChange={(e) => setForm(p => ({ ...p, age: e.target.value }))} placeholder="Age" />
        </div>
        <div className={styles.formField}>
          <label htmlFor="nonsale-payer-type">Payer Type</label>
          <select id="nonsale-payer-type" value={form.payerType} onChange={(e) => setForm(p => ({ ...p, payerType: e.target.value }))}>
            <option value="patient">Patient</option>
            <option value="insurance">Insurance</option>
            <option value="sponsor">Sponsor</option>
            <option value="free">Free</option>
          </select>
        </div>
        <div className={styles.formField}>
          <label htmlFor="nonsale-payment-method">Payment Method</label>
          <select id="nonsale-payment-method" value={form.paymentMethod} onChange={(e) => setForm(p => ({ ...p, paymentMethod: e.target.value }))}>
            <option value="cash">cash</option>
            <option value="mobile">Mobile</option>
            <option value="card">Card</option>
            <option value="credit">Credit</option>
             <option value="bank">Bank </option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className={styles.sectionLabel}>Other Items</div>
      <div className={styles.itemsTableWrap}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Item <span className={styles.req}>*</span></th>
              <th>Qty <span className={styles.req}>*</span></th>
              <th>Unit Price <span className={styles.req}>*</span></th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {form.itemRows.map((it, i) => (
              <tr key={it._key}>
                <td className={styles.drugCell}>
                  <div className={styles.drugSearchWrap}>
                    <div className={styles.searchInputWrap}>
                      <input type="text" value={it.itemName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(prev => {
                            const itemRows = [...prev.itemRows];
                            itemRows[i] = { ...itemRows[i], itemName: val, itemId: null };
                            return { ...prev, itemRows };
                          });
                        }}
                        onFocus={() => setItemSearchOpen(prev => ({ ...prev, [i]: true }))}
                        onBlur={() => setTimeout(() => setItemSearchOpen(prev => ({ ...prev, [i]: false })), 200)}
                        placeholder="Search item..." />
                      {it.dispatchDetailId && (
                        <button type="button" className={styles.clearSearchBtn} onClick={() => {
                          setForm(prev => {
                            const itemRows = [...prev.itemRows];
                            itemRows[i] = { ...itemRows[i], itemName: '', dispatchDetailId: null, unitPrice: null, totalPrice: 0 };
                            return { ...prev, itemRows };
                          });
                        }} title="Clear">✕</button>
                      )}
                    </div>
                    <div className={`${styles.drugDropdownWrap} ${itemSearchOpen[i] ? styles.drugDropdownVisible : ''}`}>
                      <div className={styles.drugDropdown}>
                        {(() => {
                          const q = it.itemName.toLowerCase();
                          const filtered = dispatchedItemsOptions.filter(o => o.itemLabel.toLowerCase().includes(q));
                          if (filtered.length === 0) return <div className={styles.searchEmpty}>No items match</div>;
                          return filtered.map(o => (
                            <div key={o.dispatchDetailId} className={styles.searchOption}
                              onMouseDown={() => { selectItemForRow(i, o); setItemSearchOpen(prev => ({ ...prev, [i]: false })); }}>
                              <span className={styles.searchOptLabel}>{o.itemLabel}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{(() => {
                  const opt = it.dispatchDetailId ? dispatchedItemsOptions.find(o => o.dispatchDetailId === it.dispatchDetailId) : null;
                  return (
                    <div className={styles.qtyWrap}>
                      <span className={styles.availQty}>Avail: {opt ? opt.qtyRemaining - (it.quantity ?? 0) : '—'}</span>
                      <input type="number" min={1} value={it.quantity || ''} onChange={(e) => updateItemRow(i, 'quantity', Number(e.target.value))} placeholder="1" />
                    </div>
                  );
                })()}</td>
                <td><input type="number" min={0.01} step="0.01" value={it.unitPrice || ''} onChange={(e) => updateItemRow(i, 'unitPrice', Number(e.target.value))} placeholder="0.00" /></td>
                <td className={styles.totalCell}>{it.totalPrice.toFixed(2)}</td>
                <td>
                  <button className={styles.rowDeleteBtn} onClick={() => removeItemRow(i)} title="Remove"><MdDelete /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={3} className={styles.totalLabel}>Items Total</td>
              <td className={styles.totalAmt}>{itemTotal.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={styles.tableActions}>
        <button className={styles.addRowBtn} onClick={addItemRow}><MdDevicesOther /> Add Item</button>
      </div>

      <div className={styles.inlineFormActions}>
        <button className={styles.saveBtn} onClick={handleSave}><MdSave /> Save</button>
        <button className={styles.cancelBtn} onClick={closeForm}><MdClose /> Cancel</button>
      </div>

      <Modal opened={lossModalOpen} onClose={() => setPendingSave(null)} title="Confirm Sale at Loss" centered>
        <p style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>
          {pendingSave && `⚠️ The following items are being sold below cost:\n\n${pendingSave.lossItems.join('\n')}\n\nThis will result in a loss. Do you want to proceed?`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="default" onClick={() => { setLossModalOpen(false); setPendingSave(null); }}>Cancel</Button>
          <Button color="red" onClick={async () => { if (pendingSave) { await executeSave(pendingSave.payload); } setLossModalOpen(false); setPendingSave(null); }}>Proceed</Button>
        </div>
      </Modal>
    </div>
  );
}
