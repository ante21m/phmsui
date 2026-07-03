'use client';
import { useMemo, useState, useCallback } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetIncomeSummaryReportQuery, IncomeSummaryRow, IncomeQueryParams } from '@/store/services/drugApi';
import { exportPdf, printTable } from '../reportUtils';
import styles from '../Reports.module.css';

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function IncomeSummaryReport() {
  const def = defaultRange();
  const [startDate, setStartDate] = useState(def.startDate);
  const [endDate, setEndDate] = useState(def.endDate);
  const [params, setParams] = useState<IncomeQueryParams>({ startDate: def.startDate, endDate: def.endDate });
  const { data, isLoading } = useGetIncomeSummaryReportQuery(params);

  const applyFilter = useCallback(() => {
    setParams({ startDate: startDate || undefined, endDate: endDate || undefined });
  }, [startDate, endDate]);

  const columns = useMemo<SmartColumn<IncomeSummaryRow>[]>(
    () => [
      { accessor: 'date', header: 'Date', sortable: true },
      { accessor: 'drugIncome', header: 'Drug Income', sortable: true, render: (row) => row.drugIncome.toLocaleString(undefined, { minimumFractionDigits: 2 }), className: styles.amount },
      { accessor: 'itemIncome', header: 'Item Income', sortable: true, render: (row) => row.itemIncome.toLocaleString(undefined, { minimumFractionDigits: 2 }), className: styles.amount },
      { accessor: 'totalIncome', header: 'Grand Total', sortable: true, render: (row) => <strong>{row.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>, className: styles.amount },
    ],
    []
  );

  const handlePdf = () => {
    const items = data?.data ?? [];
    exportPdf(
      'Income Summary',
      ['Date', 'Drug Income', 'Item Income', 'Total Income'],
      items.map((r) => [r.date, r.drugIncome, r.itemIncome, r.totalIncome]),
      'income-summary'
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <h2 className={styles.headerTitle}>Income Summary</h2>
      </div>
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Date Range:</span>
        <input type="date" className={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" className={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className={styles.actionGroup}>
          <button className={styles.filterBtn} onClick={applyFilter} title="Search"><MdSearch /></button>
          <button className={`${styles.actionBtnInline} ${styles.actionBtnPdf}`} onClick={handlePdf} title="Export PDF"><MdPictureAsPdf /></button>
          <button className={styles.actionBtnInline} onClick={() => printTable('Income Summary', ['Date', 'Drug Income', 'Item Income', 'Total Income'], (data?.data ?? []).map(r => [r.date, r.drugIncome.toFixed(2), r.itemIncome.toFixed(2), r.totalIncome.toFixed(2)]))} title="Print"><MdPrint /></button>
        </div>
      </div>
      <SmartTable
        title=""
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.date}
        withSearch withPagination withRowNumbers
        defaultPageSize={31}
        emptyMessage="No income data found."
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
      {data?.data?.length ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ background: '#1a73e8', color: '#fff', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>
            Grand Total: Drug: {data.data.reduce((s, r) => s + r.drugIncome, 0).toFixed(2)} | Item: {data.data.reduce((s, r) => s + r.itemIncome, 0).toFixed(2)} | Total: {data.data.reduce((s, r) => s + r.totalIncome, 0).toFixed(2)}
          </div>
        </div>
      ) : null}
    </div>
  );
}