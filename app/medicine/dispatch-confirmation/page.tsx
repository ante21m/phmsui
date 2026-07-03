'use client';
import { useMemo, useState } from 'react';
import { MdSearch, MdPictureAsPdf, MdPrint, MdVisibility } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetDispatchedDrugsQuery, DrugDispatch } from '@/store/services/drugApi';
import { printTable, formatServerDate } from '@/app/reports/reportUtils';
import styles from './DispatchConfirmation.module.css';
import Link from 'next/link';

export default function DispatchConfirmationPage() {
  const [tab, setTab] = useState<'waiting' | 'confirmed' | 'rejected'>('waiting');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data: dispatched = [], isLoading } = useGetDispatchedDrugsQuery();
  const filterByDate = (list: DrugDispatch[]) => {
    if (!dateFrom && !dateTo) return list;
    return list.filter((d) => {
      const dt = d.dispatchDate ? new Date(d.dispatchDate) : null;
      if (!dt) return !dateFrom && !dateTo;
      if (dateFrom && dt < new Date(dateFrom)) return false;
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (dt > toEnd) return false;
      }
      return true;
    });
  };

  const pending = filterByDate((dispatched as DrugDispatch[]).filter((d) => d.dispatchStatus === 'Pending'));
  const confirmed = filterByDate((dispatched as DrugDispatch[]).filter((d) => d.dispatchStatus === 'Confirmed'));
  const rejected = filterByDate((dispatched as DrugDispatch[]).filter((d) => d.dispatchStatus === 'Rejected'));

  const enrich = (list: DrugDispatch[]) => list.map(d => ({
    ...d,
    _drugName: (d.items || []).map(it => it.purchaseItem?.drugName || '').filter(Boolean).join(', '),
    _qtyConfirmed: d.dispatchStatus === 'Confirmed' ? (d.items || []).reduce((s, it) => s + (it.currentQty ?? 0), 0) : null,
    _qtyRejected: d.dispatchStatus === 'Rejected' ? (d.items || []).reduce((s, it) => s + (it.quantity ?? 0) - (it.currentQty ?? 0), 0) : null,
  }));

  const pendingE = useMemo(() => enrich(pending), [pending]);
  const confirmedE = useMemo(() => enrich(confirmed), [confirmed]);
  const rejectedE = useMemo(() => enrich(rejected), [rejected]);

  const columns = useMemo<SmartColumn<any>[]>(
    () => {
      const cols: SmartColumn<any>[] = [
        {
          header: 'Drug Name', sortable: true,
          render: (row: any) => row._drugName || '—',
        },
        {
          accessor: 'dispatchedBy',
          header: 'Dispatched By',
          render: (row) => row.dispatchedByUser ? `${row.dispatchedByUser.firstName} ${row.dispatchedByUser.fatherName}` : row.dispatchedBy || '—',
        },
        {
          accessor: 'dispatchedTo',
          header: 'Dispatched To',
          render: (row) => row.dispatchedToUser ? `${row.dispatchedToUser.firstName} ${row.dispatchedToUser.fatherName}` : row.dispatchedTo || '—',
        },
        {
          header: 'Items',
          render: (row) => `${row.items?.length || 0} item(s)`,
        },
      ];
      if (tab === 'confirmed') {
        cols.push({ header: 'Qty Confirmed', textAlign: 'right', sortable: true, render: (row: any) => row._qtyConfirmed != null ? Number(row._qtyConfirmed) : '—' });
      }
      if (tab === 'rejected') {
        cols.push({ header: 'Qty Rejected', textAlign: 'right', sortable: true, render: (row: any) => row._qtyRejected != null ? Number(row._qtyRejected) : '—' });
      }
      cols.push(
        {
          accessor: 'dispatchStatus',
          header: 'Status',
          sortable: true,
          render: (row) => (
            <span className={row.dispatchStatus === 'Pending' ? styles.statusPending : row.dispatchStatus === 'Rejected' ? styles.statusRejected : styles.statusConfirmed}>
              {row.dispatchStatus}
            </span>
          ),
        },
        {
          accessor: 'dispatchDate', header: 'Dispatch Date', sortable: true, textAlign: 'right',
          render: (row) => formatServerDate(row.dispatchDate),
        },
        {
          header: 'Action',
          textAlign: 'right',
          render: (row) => (
            <span className={styles.actionBtns}>
              <Link href={`/medicine/dispatch-confirmation/${row.id}`} className={styles.viewLink}>
                <MdVisibility /> View Details
              </Link>
            </span>
          ),
        },
      );
      return cols;
    },
    [tab]
  );

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>{tab === 'waiting' ? 'Waiting Confirmation' : tab === 'confirmed' ? 'Confirmed Drugs' : 'Rejected Drugs'}</h2>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'waiting' ? styles.tabActive : ''}`} onClick={() => setTab('waiting')}>
          Waiting Confirmation
          <span className={styles.tabCount}>{pending.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'confirmed' ? styles.tabActive : ''}`} onClick={() => setTab('confirmed')}>
          Confirmed Drugs
          <span className={styles.tabCount}>{confirmed.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'rejected' ? styles.tabActive : ''}`} onClick={() => setTab('rejected')}>
          Rejected Drugs
          <span className={styles.tabCount}>{rejected.length}</span>
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterField}>
          <label>From :</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className={styles.filterField}>
          <label>To :</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className={styles.filterActions}>
          <button className={`${styles.filterActionIcon} ${styles.filterApply}`} title="Apply"><MdSearch /></button>
          <button className={`${styles.filterActionIcon} ${styles.filterPdf}`} onClick={() => {
            const data = tab === 'waiting' ? pendingE : tab === 'confirmed' ? confirmedE : rejectedE;
            const headers = tab === 'waiting' ? ['Drug Name', 'Dispatched By', 'Dispatched To', 'Items', 'Status', 'Dispatch Date']
              : tab === 'confirmed' ? ['Drug Name', 'Dispatched By', 'Dispatched To', 'Items', 'Qty Confirmed', 'Status', 'Dispatch Date']
              : ['Drug Name', 'Dispatched By', 'Dispatched To', 'Items', 'Qty Rejected', 'Status', 'Dispatch Date'];
            printTable('Drug Dispatch', headers,
              data.map((r: any) => tab === 'waiting'
                ? [r._drugName || '—',
                  r.dispatchedByUser ? `${r.dispatchedByUser.firstName} ${r.dispatchedByUser.fatherName}` : r.dispatchedBy || '—',
                  r.dispatchedToUser ? `${r.dispatchedToUser.firstName} ${r.dispatchedToUser.fatherName}` : r.dispatchedTo || '—',
                  `${r.items?.length || 0} item(s)`, r.dispatchStatus, formatServerDate(r.dispatchDate)]
                : tab === 'confirmed'
                ? [r._drugName || '—',
                  r.dispatchedByUser ? `${r.dispatchedByUser.firstName} ${r.dispatchedByUser.fatherName}` : r.dispatchedBy || '—',
                  r.dispatchedToUser ? `${r.dispatchedToUser.firstName} ${r.dispatchedToUser.fatherName}` : r.dispatchedTo || '—',
                  `${r.items?.length || 0} item(s)`, r._qtyConfirmed ?? '—', r.dispatchStatus, formatServerDate(r.dispatchDate)]
                : [r._drugName || '—',
                  r.dispatchedByUser ? `${r.dispatchedByUser.firstName} ${r.dispatchedByUser.fatherName}` : r.dispatchedBy || '—',
                  r.dispatchedToUser ? `${r.dispatchedToUser.firstName} ${r.dispatchedToUser.fatherName}` : r.dispatchedTo || '—',
                  `${r.items?.length || 0} item(s)`, r._qtyRejected ?? '—', r.dispatchStatus, formatServerDate(r.dispatchDate)]));
          }} title="PDF"><MdPictureAsPdf /></button>
          <button className={`${styles.filterActionIcon} ${styles.filterPrint}`} onClick={() => {
            const data = tab === 'waiting' ? pendingE : tab === 'confirmed' ? confirmedE : rejectedE;
            const headers = tab === 'waiting' ? ['Drug Name', 'Dispatched By', 'Dispatched To', 'Items', 'Status', 'Dispatch Date']
              : tab === 'confirmed' ? ['Drug Name', 'Dispatched By', 'Dispatched To', 'Items', 'Qty Confirmed', 'Status', 'Dispatch Date']
              : ['Drug Name', 'Dispatched By', 'Dispatched To', 'Items', 'Qty Rejected', 'Status', 'Dispatch Date'];
            printTable('Drug Dispatch', headers,
              data.map((r: any) => tab === 'waiting'
                ? [r._drugName || '—',
                  r.dispatchedByUser ? `${r.dispatchedByUser.firstName} ${r.dispatchedByUser.fatherName}` : r.dispatchedBy || '—',
                  r.dispatchedToUser ? `${r.dispatchedToUser.firstName} ${r.dispatchedToUser.fatherName}` : r.dispatchedTo || '—',
                  `${r.items?.length || 0} item(s)`, r.dispatchStatus, formatServerDate(r.dispatchDate)]
                : tab === 'confirmed'
                ? [r._drugName || '—',
                  r.dispatchedByUser ? `${r.dispatchedByUser.firstName} ${r.dispatchedByUser.fatherName}` : r.dispatchedBy || '—',
                  r.dispatchedToUser ? `${r.dispatchedToUser.firstName} ${r.dispatchedToUser.fatherName}` : r.dispatchedTo || '—',
                  `${r.items?.length || 0} item(s)`, r._qtyConfirmed ?? '—', r.dispatchStatus, formatServerDate(r.dispatchDate)]
                : [r._drugName || '—',
                  r.dispatchedByUser ? `${r.dispatchedByUser.firstName} ${r.dispatchedByUser.fatherName}` : r.dispatchedBy || '—',
                  r.dispatchedToUser ? `${r.dispatchedToUser.firstName} ${r.dispatchedToUser.fatherName}` : r.dispatchedTo || '—',
                  `${r.items?.length || 0} item(s)`, r._qtyRejected ?? '—', r.dispatchStatus, formatServerDate(r.dispatchDate)]));
          }} title="Print"><MdPrint /></button>
        </div>
      </div>

      <h2 className={styles.printTitle}>{tab === 'waiting' ? 'Waiting Confirmation' : tab === 'confirmed' ? 'Confirmed Drugs' : 'Rejected Drugs'}</h2>

      <SmartTable
        title=""
        data={tab === 'waiting' ? pendingE : tab === 'confirmed' ? confirmedE : rejectedE}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch
        withPagination
        withRowNumbers
        defaultPageSize={25}
        emptyMessage={tab === 'waiting' ? 'No pending dispatch confirmations.' : tab === 'confirmed' ? 'No confirmed dispatches.' : 'No rejected dispatches.'}
        classNames={{
          page: styles.smartRoot,
          pageHeader: styles.customPageHeader,
          headerAction: styles.customHeaderAction,
        }}
      />
    </div>
  );
}
