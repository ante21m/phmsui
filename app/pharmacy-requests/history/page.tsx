'use client';
import { useMemo } from 'react';
import { MdVisibility } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetPharmacyRequestsQuery,
  type PharmacyRequest,
} from '@/store/services/drugApi';
import styles from './History.module.css';

export default function RequestHistoryPage() {
  const { data: all = [], isLoading } = useGetPharmacyRequestsQuery();

  const completed = useMemo(() => all.filter(r => r.status === 'Received' || r.status === 'Rejected'), [all]);

  const statusClass: Record<string, string> = {
    Received: styles.statusReceived,
    Rejected: styles.statusRejected,
  };

  const columns = useMemo<SmartColumn<PharmacyRequest>[]>(() => [
    { render: (r) => r.requestNo || r.id.slice(0, 8) + '...', header: 'Request No' },
    { header: 'Store', render: (r) => r.store?.name || r.storeId?.slice(0, 8) || '—' },
    { accessor: 'status', header: 'Status', sortable: true, render: (r) => <span className={`${styles.statusBadge} ${statusClass[r.status] || ''}`}>{r.status}</span> },
    { header: 'Items', render: (r) => `${r.items.length} item(s)` },
    { header: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-' },
  ], []);

  return (
    <div style={{ width: '100%' }}>
      <h2 className={styles.pageTitle}>Request History</h2>
      <SmartTable title="" data={completed} columns={columns} isLoading={isLoading}
        rowKey={(row) => row.id} withSearch withPagination withRowNumbers
        defaultPageSize={25} maxHeight={600}
        emptyMessage="No completed requests found." />
    </div>
  );
}