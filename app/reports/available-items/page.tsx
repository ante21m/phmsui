'use client';
import { useMemo, useState, useCallback } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetAvailableItemsSummaryQuery, AvailableItemSummary } from '@/store/services/drugApi';
import { exportPdf, printTable } from '../reportUtils';
import styles from '../Reports.module.css';

export default function AvailableItemsReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [params, setParams] = useState<Record<string, any>>({ limit: 10000 });
  const { data, isLoading } = useGetAvailableItemsSummaryQuery(params);

  const applyFilter = useCallback(() => {
    setParams({ limit: 10000, startDate: startDate || undefined, endDate: endDate || undefined });
  }, [startDate, endDate]);

  const rows = useMemo(() => {
    const r: (AvailableItemSummary & { _type: string })[] = [];
    for (const d of data?.drugs ?? []) r.push({ ...d, _type: 'Drug' });
    for (const d of data?.nonDrugs ?? []) r.push({ ...d, _type: 'Non-Drug' });
    return r;
  }, [data]);

  const grandTotal = data?.grandTotalCost ?? 0;

  const columns = useMemo<SmartColumn<AvailableItemSummary & { _type: string }>[]>(
    () => [
      { accessor: 'name', header: 'Name', sortable: true },
      { accessor: '_type', header: 'Type', sortable: true },
      { accessor: 'batchNo', header: 'Batch No', sortable: true, render: (row) => row.batchNo || '—' },
      { accessor: 'qtyRemaining', header: 'Qty', sortable: true, render: (row) => row.qtyRemaining.toLocaleString() },
      { accessor: 'purchasePrice', header: 'Purchase Price', sortable: true, render: (row) => row.purchasePrice.toFixed(2) },
      { accessor: 'rowTotal', header: 'Total Price', sortable: true, render: (row) => row.rowTotal.toFixed(2) },
    ],
    []
  );

  const handlePdf = () => {
    exportPdf(
      'Available Items',
      ['Name', 'Type', 'Batch No', 'Qty', 'Purchase Price', 'Total Price'],
      rows.map((r) => [r.name, r._type, r.batchNo || '', r.qtyRemaining, r.purchasePrice.toFixed(2), r.rowTotal.toFixed(2)]),
      'available-items'
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <h2 className={styles.headerTitle}>Available Items</h2>
      </div>
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Date Filter:</span>
        <input type="date" className={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" className={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className={styles.actionGroup}>
          <button className={styles.filterBtn} onClick={applyFilter} title="Search"><MdSearch /></button>
          <button className={`${styles.actionBtnInline} ${styles.actionBtnPdf}`} onClick={handlePdf} title="Export PDF"><MdPictureAsPdf /></button>
          <button className={styles.actionBtnInline} onClick={() => printTable('Available Items', ['Name', 'Type', 'Batch No', 'Qty', 'Purchase Price', 'Total Price'], rows.map(r => [r.name, r._type, r.batchNo || '', r.qtyRemaining.toLocaleString(), r.purchasePrice.toFixed(2), r.rowTotal.toFixed(2)]))} title="Print"><MdPrint /></button>
        </div>
      </div>
      <SmartTable
        title=""
        data={rows}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => `${row._type}-${row.id}-${row.batchNo || ''}`}
        withSearch withPagination withRowNumbers
        defaultPageSize={50}
        emptyMessage="No available items found."
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <div style={{ background: '#1a73e8', color: '#fff', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>
          Grand Total: {grandTotal.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
