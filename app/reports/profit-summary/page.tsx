'use client';
import { useMemo, useState, useCallback } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetProfitSummaryReportQuery, ProfitSummaryDrug, ProfitSummaryItem, IncomeQueryParams } from '@/store/services/drugApi';
import { exportPdf, printTable } from '../reportUtils';
import styles from '../Reports.module.css';

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

interface ProfitRow {
  id: string;
  name: string;
  type: 'Drug' | 'Item';
  soldQty: number;
  totalCost: number | null;
  totalSold: number;
  netProfit: number | null;
}

function buildRows(drugs: ProfitSummaryDrug[], items: ProfitSummaryItem[]): ProfitRow[] {
  const result: ProfitRow[] = [];
  for (const d of drugs) {
    result.push({ id: `drug-${d.qualifiedName}`, name: d.qualifiedName, type: 'Drug', soldQty: d.soldQuantity, totalCost: d.totalPurchaseCost, totalSold: d.totalSold, netProfit: d.netProfit });
  }
  for (const i of items) {
    result.push({ id: `item-${i.itemName}`, name: i.itemName, type: 'Item', soldQty: i.soldQuantity, totalCost: i.totalPurchaseCost, totalSold: i.totalSold, netProfit: i.netProfit });
  }
  return result;
}

export default function ProfitSummaryReport() {
  const def = defaultRange();
  const [startDate, setStartDate] = useState(def.startDate);
  const [endDate, setEndDate] = useState(def.endDate);
  const [params, setParams] = useState<IncomeQueryParams>({ startDate: def.startDate, endDate: def.endDate });
  const { data, isLoading } = useGetProfitSummaryReportQuery(params);

  const applyFilter = useCallback(() => {
    setParams({ startDate: startDate || undefined, endDate: endDate || undefined });
  }, [startDate, endDate]);

  const rows = useMemo(() => data ? buildRows(data.drugs, data.items) : [], [data]);

  const columns = useMemo<SmartColumn<ProfitRow>[]>(
    () => [
      { accessor: 'name', header: 'Name', sortable: true },
      {
        accessor: 'type',
        header: 'Type',
        width: '80px',
        sortable: true,
        render: (row) => (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: 12, fontWeight: 600,
            background: row.type === 'Drug' ? '#dbeafe' : '#f3e8ff',
            color: row.type === 'Drug' ? '#1d4ed8' : '#7c3aed',
          }}>{row.type}</span>
        ),
      },
      { accessor: 'soldQty', header: 'Sold Qty', sortable: true },
      {
        accessor: 'totalCost',
        header: 'Total Cost',
        sortable: true,
        render: (row) => row.totalCost !== null ? row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—',
        className: styles.amount,
      },
      {
        accessor: 'totalSold',
        header: 'Total Sold',
        sortable: true,
        render: (row) => row.totalSold.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        className: styles.amount,
      },
      {
        accessor: 'netProfit',
        header: 'Net Profit',
        sortable: true,
        render: (row) => row.netProfit !== null
          ? <span style={{ color: row.netProfit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{row.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          : '—',
        className: styles.amount,
      },
    ],
    []
  );

  const handlePdf = () => {
    const items = data ? buildRows(data.drugs, data.items) : [];
    exportPdf(
      'Profit Summary — Drug & Item Breakdown',
      ['Name', 'Type', 'Sold Qty', 'Total Cost', 'Total Sold', 'Net Profit'],
      items.map((r) => [r.name, r.type, r.soldQty, r.totalCost !== null ? r.totalCost : '—', r.totalSold, r.netProfit !== null ? r.netProfit : '—']),
      'profit-summary'
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerBar}>
        <h2 className={styles.headerTitle}>Profit Summary — Drug & Item Breakdown</h2>
      </div>
      <div className={styles.filters}>
        <span className={styles.filterLabel}>Date Range:</span>
        <input type="date" className={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" className={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className={styles.actionGroup}>
          <button className={styles.filterBtn} onClick={applyFilter} title="Search"><MdSearch /></button>
          <button className={`${styles.actionBtnInline} ${styles.actionBtnPdf}`} onClick={handlePdf} title="Export PDF"><MdPictureAsPdf /></button>
          <button className={styles.actionBtnInline} onClick={() => printTable('Profit Summary — Drug & Item Breakdown', ['Name', 'Type', 'Sold Qty', 'Total Cost', 'Total Sold', 'Net Profit'], (data ? buildRows(data.drugs, data.items) : []).map(r => [r.name, r.type, r.soldQty, r.totalCost !== null ? r.totalCost.toFixed(2) : '—', r.totalSold.toFixed(2), r.netProfit !== null ? r.netProfit.toFixed(2) : '—']))} title="Print"><MdPrint /></button>
        </div>
      </div>
      <SmartTable
        title=""
        data={rows}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch withPagination withRowNumbers
        defaultPageSize={25}
        emptyMessage="No profit data found."
        classNames={{ pageHeader: styles.customPageHeader, headerAction: styles.customHeaderAction }}
      />
      {rows.length ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <div style={{ background: '#1a73e8', color: '#fff', padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>
            Grand Total: Drug: {rows.filter(r => r.type === 'Drug').reduce((s, r) => s + (r.totalSold || 0), 0).toFixed(2)} | Item: {rows.filter(r => r.type === 'Item').reduce((s, r) => s + (r.totalSold || 0), 0).toFixed(2)} | Total: {rows.reduce((s, r) => s + (r.totalSold || 0), 0).toFixed(2)}
          </div>
        </div>
      ) : null}
    </div>
  );
}