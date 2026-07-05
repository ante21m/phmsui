'use client';
import { MdMedicalServices, MdWarning, MdShoppingCart, MdInventory } from 'react-icons/md';
import { useGetDrugsQuery, useGetLowStockDrugsQuery, useGetExpiryAlertsQuery } from '@/store/services/drugApi';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const { data: drugs = [] } = useGetDrugsQuery();
  const { data: lowStock } = useGetLowStockDrugsQuery();
  const { data: expiry = [] } = useGetExpiryAlertsQuery(30);
  const lowStockCount = lowStock?.data?.length ?? 0;

  const stats = [
    { label: 'Drug Masters', value: drugs.length, icon: <MdMedicalServices />, color: 'teal' },
    { label: 'Low Stock Items', value: lowStockCount, icon: <MdWarning />, color: 'orange' },
    { label: 'Expiry Alerts', value: expiry.length, icon: <MdWarning />, color: 'red' },
    { label: 'Drug Categories', value: '—', icon: <MdInventory />, color: 'blue' },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={`${styles.card} ${styles[`card_${s.color}`]}`}>
            <div className={styles.cardIcon}>{s.icon}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardValue}>{s.value}</div>
              <div className={styles.cardLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
