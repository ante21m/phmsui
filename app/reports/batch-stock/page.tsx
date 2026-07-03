'use client';
import { useMemo, useState, useCallback } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetBatchStockReportQuery, BatchStockItem } from '@/store/services/drugApi';
import { exportPdf, printTable } from '../reportUtils';
import styles from '../Reports.module.css';

export default function BatchStockReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [params, setParams] = useState<Record<string, any>>({ limit: 10000 });
  const { data, isLoading } = useGetBatchStockReportQuery(params);

  const applyFilter = useCallback(() => {
    setParams({ limit: 10000, startDate: startDate || undefined, endDate: endDate || undefined });
  }, [startDate, endDate]);

  const columns = useMemo<SmartColumn<BatchStockItem>[]>(
    () => [
      { accessor: 'qualifiedName', header: 'Drug', sortable: true },
      { accessor: 'batchNo', header: 'Batch No', sortable: true },
      { accessor: 'expiryDate', header: 'Expiry', sortable: true, render: (row) => row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—' },
      { accessor: 'inStore', header: 'In Store', sortable: true },
      { accessor: 'inPharmacy', header: 'In Pharmacy', sortable: true },
      { accessor: 'totalAvailable', header: 'Total', sortable: true, render: (row) => <strong>{row.totalAvailable}</strong> },
    ],
    []
  );

  const handlePdf = () => {
    const items = data?.data ?? [];
    exportPdf(
      'Available Drug by batch',
      ['Drug', 'Batch No', 'Expiry', 'In Store', 'In Pharmacy', 'Total Available'],
      items.map((r) => [r.qualifiedName, r.batchNo, r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '', r.inStore, r.inPharmacy, r.totalAvailable]),
      'batch-stock'
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <h2 className={styles.headerTitle}>Available Drug by batch</h2>
      </div>
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Date Filter:</span>
        <input type="date" className={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" className={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className={styles.actionGroup}>
          <button className={styles.filterBtn} onClick={applyFilter} title="Search"><MdSearch /></button>
          <button className={`${styles.actionBtnInline} ${styles.actionBtnPdf}`} onClick={handlePdf} title="Export PDF"><MdPictureAsPdf /></button>
          <button className={styles.actionBtnInline} onClick={() => printTable('Available Drug by batch', ['Drug', 'Batch No', 'Expiry', 'In Store', 'In Pharmacy', 'Total Available'], (data?.data ?? []).map(r => [r.qualifiedName, r.batchNo, r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '—', r.inStore, r.inPharmacy, r.totalAvailable]), 3)} title="Print"><MdPrint /></button>
        </div>
      </div>
      <SmartTable
        title=""
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.purchaseItemId}
        withSearch withPagination withRowNumbers
        defaultPageSize={20}
        emptyMessage="No batch stock data found."
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
    </div>
  );
}