'use client';
import { useMemo, useState, useCallback } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetSoldItemCountsReportQuery, SoldItemCount } from '@/store/services/drugApi';
import { exportPdf, printTable } from '../reportUtils';
import styles from '../Reports.module.css';

export default function SoldItemCountsReport() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [params, setParams] = useState<Record<string, any>>({ limit: 10000 });
  const { data, isLoading } = useGetSoldItemCountsReportQuery(params);

  const applyFilter = useCallback(() => {
    setParams({ limit: 10000, startDate: startDate || undefined, endDate: endDate || undefined });
  }, [startDate, endDate]);

  const columns = useMemo<SmartColumn<SoldItemCount>[]>(
    () => [
      { accessor: 'itemName', header: 'Item Name', sortable: true },
      { accessor: 'unitPrice', header: 'Unit Price', sortable: true, render: (row) => row.unitPrice.toFixed(2) },
      { accessor: 'totalSold', header: 'Total Sold', sortable: true, render: (row) => row.totalSold.toLocaleString() },
      { accessor: 'totalPaid', header: 'Total Paid', sortable: true, render: (row) => row.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 }) },
    ],
    []
  );

  const handlePdf = () => {
    const items = data?.data ?? [];
    exportPdf(
      'Sold Item Counts',
      ['Item Name', 'Unit Price', 'Total Sold', 'Total Paid'],
      items.map((r) => [r.itemName, r.unitPrice.toFixed(2), r.totalSold, r.totalPaid]),
      'sold-item-counts'
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <h2 className={styles.headerTitle}>Sold Item Counts</h2>
      </div>
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Date Filter:</span>
        <input type="date" className={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" className={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className={styles.actionGroup}>
          <button className={styles.filterBtn} onClick={applyFilter} title="Search"><MdSearch /></button>
          <button className={`${styles.actionBtnInline} ${styles.actionBtnPdf}`} onClick={handlePdf} title="Export PDF"><MdPictureAsPdf /></button>
          <button className={styles.actionBtnInline} onClick={() => printTable('Sold Item Counts', ['Item Name', 'Unit Price', 'Total Sold', 'Total Paid'], (data?.data ?? []).map(r => [r.itemName, r.unitPrice.toFixed(2), r.totalSold, r.totalPaid.toFixed(2)]))} title="Print"><MdPrint /></button>
        </div>
      </div>
      <SmartTable
        title=""
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.itemName}
        withSearch withPagination withRowNumbers
        defaultPageSize={20}
        emptyMessage="No sold item data found."
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
      {data?.data?.length ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ background: '#1a73e8', color: '#fff', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>
            Grand Total: {data.data.reduce((s, r) => s + r.totalSold, 0).toLocaleString()} items | {data.data.reduce((s, r) => s + r.totalPaid, 0).toFixed(2)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
