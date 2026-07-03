'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MdDashboard, MdMedicalServices, MdKeyboardArrowDown,
  MdKeyboardArrowRight, MdShoppingCart, MdCheckCircle,
  MdWarning, MdNotifications, MdAdd, MdInventory,
  MdLocalHospital, MdReport, MdPayment, MdUndo, MdBusiness,
  MdPeople, MdPointOfSale,
} from 'react-icons/md';

import styles from './Sidebar.module.css';
import { useGetUserDetailQuery } from '@/store/services/drugApi';

// ─── Types 

type Role =
  | 'admin'
  | 'pharmacist'
  | 'pharmacy-inventory-officer'
  | 'store-manager';

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: number;
  /**
   * Which non-admin roles can see this item.
   *
   * undefined  → admin-only (no roles key at all)
   * []         → admin-only (explicit empty array)
   * ['pharmacist', ...]  → those roles + admin can see it
   */
  roles?: Role[];
}

// ─── Nav tree 

const navItems: NavItem[] = [
  // ── Dashboard 
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <MdDashboard />,
    roles: ['pharmacist', 'pharmacy-inventory-officer', 'store-manager'],
  },

  // ── Medicine
  {
    label: 'Medicine',
    icon: <MdMedicalServices />,
    roles: ['pharmacist', 'pharmacy-inventory-officer', 'store-manager'],
    children: [
      {
        label: 'Drug Master',
        href: '/medicine/drug-master',
        icon: <MdAdd />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Item Master',
        href: '/medicine/item-master',
        icon: <MdAdd />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Purchased Drugs',
        href: '/medicine/purchased-drugs',
        icon: <MdShoppingCart />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Purchased Items',
        href: '/medicine/purchased-items',
        icon: <MdShoppingCart />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Dispatch Confirmation',
        href: '/medicine/dispatch-confirmation',
        icon: <MdCheckCircle />,
        roles: ['pharmacist'],
      },
      {
        label: 'Item Dispatch Confirmation',
        href: '/medicine/item-dispatch-confirmation',
        icon: <MdCheckCircle />,
        roles: ['pharmacist'],
      },
      {
        label: 'Low Stock',
        href: '/medicine/low-stock',
        icon: <MdWarning />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Expiry Alert',
        href: '/medicine/expiry-alert',
        icon: <MdWarning />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Drug Losses',
        href: '/medicine/drug-losses',
        icon: <MdReport />,
        roles: ['pharmacist'],
      },
      {
        label: 'Drug Loss Review',
        href: '/medicine/drug-loss-review',
        icon: <MdCheckCircle />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Drug Sales',
        href: '/medicine/drug-sales',
        icon: <MdPointOfSale />,
        roles: ['pharmacist'],
      },
      {
        label: 'Sold List',
        href: '/medicine/sold-drugs',
        icon: <MdPointOfSale />,
        roles: ['pharmacist', 'pharmacy-inventory-officer'],
      },
      {
        label: 'Drug Sales Returns',
        href: '/medicine/drug-sales-returns',
        icon: <MdUndo />,
        roles: ['store-manager'],
      },
    ],
  },

  // ── Admin-only 
  // roles: [] means ONLY admin can see these — no other role matches
  {
    label: 'Workflow Management',
    href: '/workflow-management',
    icon: <MdCheckCircle />,
    roles: [],
  },
  {
    label: 'Users',
    href: '/users',
    icon: <MdPeople />,
    roles: [],
  },

  // ── Departments / Stores / Suppliers 
  {
    label: 'Departments',
    href: '/medicine/departments',
    icon: <MdBusiness />,
    roles: ['pharmacy-inventory-officer'],
  },
  {
    label: 'Stores',
    href: '/medicine/stores',
    icon: <MdBusiness />,
    roles: ['pharmacy-inventory-officer'],
  },
  {
    label: 'Suppliers',
    href: '/medicine/suppliers',
    icon: <MdBusiness />,
    roles: ['pharmacy-inventory-officer'],
  },

  // ── Inventory 
  {
    label: 'Inventory Requests',
    href: '/inventory-requests',
    icon: <MdInventory />,
    roles: ['pharmacist'],
  },
  {
    label: 'Inventory Approvals',
    href: '/inventory-approvals',
    icon: <MdCheckCircle />,
    roles: ['pharmacy-inventory-officer'],
  },

  // ── Pharmacy Requests 
  {
    label: 'Pharmacy Requests',
    icon: <MdInventory />,
    roles: ['pharmacist', 'pharmacy-inventory-officer'],
    children: [
      {
        label: 'Drug Request',
        href: '/pharmacy-requests',
        icon: <MdInventory />,
        roles: ['pharmacist'],
      },
      {
        label: 'Request Confirmation',
        href: '/pharmacy-requests/confirmation',
        icon: <MdCheckCircle />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Request History',
        href: '/pharmacy-requests/history',
        icon: <MdCheckCircle />,
        roles: ['pharmacist', 'pharmacy-inventory-officer'],
      },
    ],
  },

  // ── Reports 
  {
    label: 'Reports',
    icon: <MdReport />,
    roles: ['pharmacist', 'pharmacy-inventory-officer'],
    children: [
      {
        label: 'Available Items',
        href: '/reports/available-items',
        icon: <MdInventory />,
        roles: ['pharmacist', 'pharmacy-inventory-officer'],
      },
      {
        label: 'Sold Drug Counts',
        href: '/reports/sold-drug-counts',
        icon: <MdPointOfSale />,
        roles: ['pharmacist', 'pharmacy-inventory-officer'],
      },
      {
        label: 'Sold Item Counts',
        href: '/reports/sold-item-counts',
        icon: <MdPointOfSale />,
        roles: ['pharmacist', 'pharmacy-inventory-officer'],
      },
      {
        label: 'Batch Stock',
        href: '/reports/batch-stock',
        icon: <MdLocalHospital />,
        roles: ['pharmacist', 'pharmacy-inventory-officer'],
      },
      {
        label: 'Income Summary',
        href: '/reports/income-summary',
        icon: <MdPayment />,
        roles: ['pharmacy-inventory-officer'],
      },
      {
        label: 'Profit Summary',
        href: '/reports/profit-summary',
        icon: <MdReport />,
        roles: ['pharmacy-inventory-officer'],
      },
    ],
  },

  // ── My Purchase Requests 
  {
    label: 'My Purchase Requests',
    href: '/purchase-requests',
    icon: <MdInventory />,
    roles: ['pharmacy-inventory-officer'],
  },

  // ── Notice
  {
    label: 'Notice',
    icon: <MdNotifications />,
    roles: ['pharmacist', 'pharmacy-inventory-officer'],
    children: [
      {
        label: 'View Notices',
        href: '/notice/view',
        icon: <MdNotifications />,
        roles: ['store-manager'],
      },
    ],
  },

  // ── My Stock 
  {
    label: 'My Stock',
    icon: <MdLocalHospital />,
    roles: [ 'store-manager'],
    children: [
      {
        label: 'Stock Overview',
        href: '/stock/overview',
        icon: <MdLocalHospital />,
        roles: ['pharmacist', 'pharmacy-inventory-officer', 'store-manager'],
      },
    ],
  },
];

const MIN_WIDTH = 100;
const MAX_WIDTH = 400;

export default function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useGetUserDetailQuery();
  const userRoles: string[] = user?.roles ?? [];

  const isAdmin = userRoles.includes('admin');

   const hasRole = useCallback(
    (roles?: Role[]): boolean => {
      if (isAdmin) return true;                        // admin sees everything
      if (!roles || roles.length === 0) return false;  // admin-only items
      return roles.some((r) => userRoles.includes(r)); // role match check
    },
    [isAdmin, userRoles],
  );

  /**
   * Build the visible nav tree for the current user.
   * Every child uses its OWN explicit roles — no parent fallback —
   * so admin-only parents can never accidentally expose their children.
   */
  const visibleItems = useMemo<NavItem[]>(() => {
    const filterItem = (item: NavItem): NavItem | null => {
      // Check this item's own roles first
      if (!hasRole(item.roles)) return null;

      // Leaf node — visible
      if (!item.children) return item;

      // Group — filter children by their OWN roles (no parent fallback)
      const visibleChildren = item.children
        .filter((child) => hasRole(child.roles))
        .map((child) => ({ ...child }));

      // Hide the group if no children passed the filter
      if (visibleChildren.length === 0) return null;

      return { ...item, children: visibleChildren };
    };

    return navItems.map(filterItem).filter(Boolean) as NavItem[];
  }, [hasRole]);

  // Groups default to expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Medicine: true,
    'Pharmacy Requests': true,
    Reports: true,
    Notice: true,
    'My Stock': true,
  });

  const [sidebarWidth, setSidebarWidth] = useState(180);
  const dragging = useRef(false);

  const isActive = (href?: string) => !!href && pathname.startsWith(href);

  const toggleGroup = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  // ── Drag-to-resize 
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── Render 
  return (
    <aside className={styles.sidebar} style={{ width: sidebarWidth }}>
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoD}>D</span>
        <span className={styles.logoDash}>-</span>
        <span className={styles.logoC}>C</span>
        <span className={styles.logoA}>a</span>
        <span className={styles.logoR}>r</span>
        <span className={styles.logoE}>e</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {visibleItems.map((item) => (
          <div key={item.label}>

            {/* ── Leaf link ── */}
            {item.href ? (
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.badge ? (
                  <span className={styles.badge}>{item.badge}</span>
                ) : null}
              </Link>
            ) : (
              /* ── Collapsible group ── */
              <>
                <button
                  className={`${styles.navGroup} ${collapsed[item.label] ? styles.navGroupOpen : ''}`}
                  onClick={() => toggleGroup(item.label)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.arrow}>
                    {collapsed[item.label]
                      ? <MdKeyboardArrowDown />
                      : <MdKeyboardArrowRight />}
                  </span>
                </button>

                {collapsed[item.label] && item.children && (
                  <div className={styles.subNav}>
                    {item.children.map((child, idx) => (
                      <Link
                        key={`${child.href}-${idx}`}
                        href={child.href || '#'}
                        className={`${styles.subNavItem} ${isActive(child.href) ? styles.subNavItemActive : ''}`}
                      >
                        <span className={styles.subIcon}>{child.icon ?? '+'}</span>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        ))}
      </nav>

      {/* Drag handle */}
      <div className={styles.dragHandle} onMouseDown={handleMouseDown} />
    </aside>
  );
}
