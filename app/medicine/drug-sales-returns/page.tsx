'use client';
import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { MdUndo, MdClose, MdCheckCircle, MdSearch } from 'react-icons/md';
import {
  useGetDrugSalesReturnsQuery,
  useCreateDrugSalesReturnMutation,
  useGetDrugSalesQuery,
  DrugSale,
  DrugSaleItem,
} from '@/store/services/drugApi';
import styles from './DrugSalesReturns.module.css';

interface SaleItemEntry {
  sale: DrugSale;
  item: DrugSaleItem;
  saleIndex: number;
  itemIndex: number;
}

export default function DrugSalesReturnsPage() {
  const { data: sales = [], isLoading: salesLoading } = useGetDrugSalesQuery();
  const { data: returns = [] } = useGetDrugSalesReturnsQuery();
  const [createReturn] = useCreateDrugSalesReturnMutation();

  const [search, setSearch] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnedItems, setReturnedItems] = useState<Set<string>>(new Set());

  const saleItems = useMemo(() => {
    const list: SaleItemEntry[] = [];
    (sales as DrugSale[]).forEach((sale, si) => {
      (sale.items || []).forEach((item, ii) => {
        const key = `${sale.id}-${ii}`;
        list.push({ sale, item, saleIndex: si, itemIndex: ii });
      });
    });
    return list;
  }, [sales]);

  const filtered = useMemo(() => {
    if (!search) return saleItems;
    const q = search.toLowerCase();
    return saleItems.filter(e =>
      e.item.medicationName?.toLowerCase().includes(q) ||
      e.sale.fullName?.toLowerCase().includes(q)
    );
  }, [saleItems, search]);

  const handleReturn = async (entry: SaleItemEntry) => {
    const key = `${entry.sale.id}-${entry.itemIndex}`;
    const qty = returnQty[key] || entry.item.quantity;
    if (!entry.item.dispatchDetailId) {
      toast.error('This item cannot be returned (no stock reference)');
      return;
    }
    try {
      await createReturn({
        saleId: entry.sale.id,
        items: [{ dispatchDetailId: entry.item.dispatchDetailId, quantity: qty }],
        salesDetail: entry.item.id ? String(entry.item.id) : undefined,
        drugSale: entry.sale.id,
        returnReason: returnReason || undefined,
      }).unwrap();
      toast.success(`${entry.item.medicationName} returned successfully`);
      setReturnedItems(prev => new Set(prev).add(`${entry.sale.id}-${entry.item.id || entry.itemIndex}`));
      setReturningId(null);
      setReturnReason('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? JSON.stringify((err as { data: unknown }).data)
        : 'Return failed';
      toast.error(msg);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Return Sale Items</h2>
        <div className={styles.searchWrap}>
          <MdSearch className={styles.searchIcon} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drug or customer..." className={styles.searchInput} />
        </div>
      </div>

      {salesLoading ? (
        <p className={styles.loading}>Loading sales data...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No sold drugs found.</p>
      ) : (
        <div className={styles.itemsTableWrap}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Drug Name</th>
                <th>Qty Sold</th>
                <th>Return Qty</th>
                <th>Return Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const itemKey = `${entry.sale.id}-${entry.item.id || entry.itemIndex}`;
                const isReturned = returnedItems.has(`${entry.sale.id}-${entry.item.id || entry.itemIndex}`);
                const isReturning = returningId === itemKey;
                const qty = returnQty[itemKey] ?? entry.item.quantity;
                return (
                  <tr key={itemKey} className={isReturned ? styles.rowReturned : ''}>
                    <td>{entry.item.medicationName}</td>
                    <td>×{entry.item.quantity}</td>
                    <td>
                      {isReturning ? (
                        <input type="number" min={1} max={entry.item.quantity}
                          value={qty}
                          onChange={(e) => setReturnQty(prev => ({ ...prev, [itemKey]: Number(e.target.value) }))}
                          className={styles.qtyInput} />
                      ) : (
                        <span>{entry.item.quantity}</span>
                      )}
                    </td>
                    <td>
                      {isReturning ? (
                        <input type="text" value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder="Reason for return" className={styles.reasonInput} />
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td>
                      {isReturned ? (
                        <span className={styles.statusReturned}>Returned</span>
                      ) : isReturning ? (
                        <span className={styles.statusPending}>Pending</span>
                      ) : (
                        <span className={styles.statusSold}>Sold</span>
                      )}
                    </td>
                    <td>
                      {isReturned ? (
                        <span className={styles.returnedBadge}><MdCheckCircle /> Returned</span>
                      ) : isReturning ? (
                        <span className={styles.actionBtns}>
                          <button className={styles.submitBtn} onClick={() => handleReturn(entry)}>
                            <MdUndo /> Return
                          </button>
                          <button className={styles.cancelBtn} onClick={() => { setReturningId(null); setReturnReason(''); }}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button className={styles.returnBtn} onClick={() => { setReturningId(itemKey); setReturnQty(prev => ({ ...prev, [itemKey]: entry.item.quantity })); }}>
                          <MdUndo /> Return
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
