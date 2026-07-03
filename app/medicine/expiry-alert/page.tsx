'use client';
import { useMemo } from 'react';
import { MdWarning } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import { useGetExpiryAlertsQuery, DrugPurchaseItem } from '@/store/services/drugApi';
import styles from './ExpiryAlert.module.css';

function daysLeft(expiryDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryAlertPage() {
  const { data: rawItems = [], isLoading } = useGetExpiryAlertsQuery();
  const items = useMemo(() => rawItems.filter(i => i.qtyRemaining >= 0), [rawItems]);

  const columns = useMemo<SmartColumn<DrugPurchaseItem>[]>(
    () => [
      { accessor: 'drugName', header: 'Drug Name', sortable: true },
      { accessor: 'batchNo', header: 'Batch', sortable: true },
      { accessor: 'qtyRemaining', header: 'Qty Remaining', sortable: true },
      {
        accessor: 'expiryDate',
        header: 'Expiry Date',
        sortable: true,
        render: (row) => (
          <span className={styles.tdExpiry}>
            {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—'}
          </span>
        ),
      },
      {
        header: 'Days Left',
        sortable: true,
        render: (row) => {
          if (!row.expiryDate) return <span>—</span>;
          const d = daysLeft(row.expiryDate);
          const cls = d <= 0 ? styles.daysExpired : d <= 30 ? styles.daysUrgent : d <= 60 ? styles.daysSoon : styles.daysOk;
          return <span className={cls}>{d === 0 ? 'Today' : d < 0 ? `${d} day${d !== -1 ? 's' : ''} ago` : `${d} day${d !== 1 ? 's' : ''} left`}</span>;
        },
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <SmartTable
        title="Expiry Alert"
        data={items}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        withSearch
        withPagination
        withRowNumbers
        defaultPageSize={25}
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
