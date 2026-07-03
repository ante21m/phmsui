'use client';
import { useState, useMemo, useCallback } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetDrugSalesQuery,
  DrugSale,
  DrugSaleItem,
  ItemSaleItem,
} from '@/store/services/drugApi';
import { exportPdf, printTable, formatServerDate } from '@/app/reports/reportUtils';
import styles from './SoldDrugs.module.css';

export default function SoldDrugsPage() {
  const { data: sales = [], isLoading } = useGetDrugSalesQuery();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredSales = useMemo(() => {
    let list = sales;
    if (startDate) {
      const sd = new Date(startDate);
      sd.setHours(0, 0, 0, 0);
      list = list.filter((s) => s.soldAt && new Date(s.soldAt) >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate);
      ed.setHours(23, 59, 59, 999);
      list = list.filter((s) => s.soldAt && new Date(s.soldAt) <= ed);
    }
    return list;
  }, [sales, startDate, endDate]);

  const clearFilter = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  const rows = useMemo(() => {
    const r: Array<{
      _rowKey: number;
      _type: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      fullName: string;
      paymentMethod: string;
      soldAt: string | null;
      pharmacist: DrugSale['pharmacist'];
    }> = [];
    let key = 0;
    for (const s of filteredSales) {
      for (const it of s.items || []) {
        r.push({
          _rowKey: ++key,
          _type: 'Drug',
          itemName: it.medicationName,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
          fullName: s.fullName || '',
          paymentMethod: s.paymentMethod,
          soldAt: s.soldAt,
          pharmacist: s.pharmacist,
        });
      }
      for (const it of s.itemSaleItems || []) {
        r.push({
          _rowKey: ++key,
          _type: 'Item',
          itemName: it.itemName,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
          fullName: s.fullName || '',
          paymentMethod: s.paymentMethod,
          soldAt: s.soldAt,
          pharmacist: s.pharmacist,
        });
      }
    }
    return r;
  }, [filteredSales]);

  const columns = useMemo<SmartColumn<any>[]>(
    () => [
      { accessor: 'fullName', header: 'Customer', sortable: true },
      { accessor: 'itemName', header: 'Item Name', sortable: true },
      { accessor: '_type', header: 'Type', sortable: true },
      { accessor: 'quantity', header: 'Qty Sold', textAlign: 'right', sortable: true },
      {
        accessor: 'unitPrice', header: 'Unit Price', textAlign: 'right', sortable: true,
        render: (row) => row.unitPrice.toFixed(2),
      },
      {
        accessor: 'totalPrice', header: 'Total', textAlign: 'right', sortable: true,
        render: (row) => row.totalPrice.toFixed(2),
      },
      { accessor: 'paymentMethod', header: 'Payment', textAlign: 'right', sortable: true },
      {
        header: 'Sold By', textAlign: 'right', sortable: true,
        render: (row) => row.pharmacist ? `${row.pharmacist.firstName || ''} ${row.pharmacist.lastName || ''}`.trim() || row.pharmacist.id : '—',
      },
      {
        accessor: 'soldAt', header: 'Sold Date', textAlign: 'right', sortable: true,
        render: (row) => formatServerDate(row.soldAt),
      },
    ],
    []
  );

  const totalQty = useMemo(() => rows.reduce((s, r) => s + r.quantity, 0), [rows]);
  const totalAmt = useMemo(() => rows.reduce((s, r) => s + r.totalPrice, 0), [rows]);

  return (
    <div className={styles.page}>

      <h2 className={styles.pageTitle}>Sales Report</h2>

      <div className={styles.filters}>
        <span className={styles.filterLabel}>Date Filter:</span>
        <input type="date" className={styles.dateInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>to</span>
        <input type="date" className={styles.dateInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        {(startDate || endDate) && (
          <button className={styles.clearBtn} onClick={clearFilter} title="Clear filters">✕</button>
        )}
        <div className={styles.actionGroup}>
          <button className={styles.filterBtn} onClick={clearFilter} title="Refresh"><MdSearch /></button>
          <button className={`${styles.actionBtnInline} ${styles.actionBtnPdf}`} onClick={() => {
            const headers = ['Customer', 'Item Name', 'Type', 'Qty Sold', 'Unit Price', 'Total', 'Payment', 'Sold By', 'Sold Date'];
            const data = rows.map((r) => [
              r.fullName, r.itemName, r._type, r.quantity,
              r.unitPrice.toFixed(2), r.totalPrice.toFixed(2), r.paymentMethod,
              r.pharmacist ? `${r.pharmacist.firstName || ''} ${r.pharmacist.lastName || ''}`.trim() || r.pharmacist.id : '',
              formatServerDate(r.soldAt),
            ]);
            exportPdf('Sales Report - Sold Detail List', headers, data, 'sales-report');
          }} title="Export PDF"><MdPictureAsPdf /></button>
          <button className={styles.actionBtnInline} onClick={() => {
            const headers = ['Customer', 'Item Name', 'Type', 'Qty Sold', 'Unit Price', 'Total', 'Payment', 'Sold By', 'Sold Date'];
            const data = rows.map((r) => [
              r.fullName, r.itemName, r._type, r.quantity,
              r.unitPrice.toFixed(2), r.totalPrice.toFixed(2), r.paymentMethod,
              r.pharmacist ? `${r.pharmacist.firstName || ''} ${r.pharmacist.lastName || ''}`.trim() || r.pharmacist.id : '',
              formatServerDate(r.soldAt),
            ]);
            printTable('Sales Report - Sold Detail List', headers, data, 2);
          }} title="Print"><MdPrint /></button>
        </div>
      </div>

      <SmartTable
        title=""
        data={rows}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row._rowKey}
        withSearch withPagination withRowNumbers
        defaultPageSize={25} maxHeight={520}
        classNames={{ pageHeader: styles.customPageHeader }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <div style={{ background: '#1a73e8', color: '#fff', padding: '8px 24px', borderRadius: 6, fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>
          Grand Total Sold: {totalQty} items | {totalAmt.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
