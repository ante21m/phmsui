'use client';
import { useMemo, useState } from 'react';
import { MdWarning, MdAddShoppingCart } from 'react-icons/md';
import { toast } from 'react-toastify';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetLowStockDrugsQuery, LowStockItem } from '@/store/services/drugApi';
import styles from './LowStock.module.css';

export default function LowStockPage() {
  const { data, isLoading } = useGetLowStockDrugsQuery();
  const rawItems = data?.data ?? [];
  const items = useMemo(() => (rawItems as LowStockItem[]).filter(i => i.qtyRemaining >= 0), [rawItems]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());

  const toggleSelect = (name: string) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleMoveToPurchasePlan = () => {
    const selected = items.filter(i => selectedNames.has(i.name));
    toast.success(`${selected.length} item(s) moved to purchase plan`);
    setSelectedNames(new Set());
  };

  const columns = useMemo<SmartColumn<LowStockItem>[]>(
    () => [
      { header: <input type="checkbox" checked={selectedNames.size === items.length} onChange={() => { if (selectedNames.size === items.length) setSelectedNames(new Set()); else setSelectedNames(new Set(items.map(i => i.name))); }} style={{ cursor: 'pointer' }} />, width: '40px', render: (row) => <input type="checkbox" checked={selectedNames.has(row.name)} onChange={() => toggleSelect(row.name)} style={{ cursor: 'pointer' }} /> },
      { accessor: 'name', header: 'Name', sortable: true },
      {
        accessor: 'type',
        header: 'Type',
        width: '80px',
        sortable: true,
        render: (row) => <>{row.type === 'drug' ? 'Drug' : 'Item'}</>,
      },
      { accessor: 'reorderLevel', header: 'Reorder Level', sortable: true },
      {
        accessor: 'qtyRemaining',
        header: 'Qty Remaining',
        sortable: true,
        render: (row) => (
          <span className={row.qtyRemaining <= row.reorderLevel ? styles.tdLow : ''}>{row.qtyRemaining}</span>
        ),
      },
    ],
    [selectedNames, items]
  );

  return (
    <div className={styles.page}>
      <SmartTable
        title="Low Stock Drugs"
        data={items}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => `${row.type}-${row.name}`}
        withSearch
        withPagination
        withRowNumbers
        defaultPageSize={25}
        selectionBar={
          <button className={styles.purchasePlanBtn} onClick={handleMoveToPurchasePlan} disabled={selectedNames.size === 0}>
            <MdAddShoppingCart /> Move to Purchase Plan {selectedNames.size > 0 && `(${selectedNames.size})`}
          </button>
        }
        headerAction={
          <div className={styles.warnBadge}>
            <MdWarning className={styles.warnIcon} />
            <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
        }
        classNames={{
          pageHeader: styles.customPageHeader,
          headerAction: styles.customHeaderAction,
        }}
      />
    </div>
  );
}