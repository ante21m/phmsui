'use client';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MdKeyboardArrowDown, MdKeyboardArrowRight } from 'react-icons/md';

import styles from './Sidebar.module.css';
import { useGetUserDetailQuery } from '@/store/services/drugApi';
import { getVisibleMenu } from './nav.config';

const MIN_WIDTH = 100;
const MAX_WIDTH = 400;

export default function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useGetUserDetailQuery();

  // Menu structure and role access are defined in ./nav.config.tsx
  const visibleItems = useMemo(
    () => getVisibleMenu(user?.roles ?? []),
    [user?.roles],
  );

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
          <div key={item.key}>

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
                    {item.children.map((child) => (
                      <Link
                        key={child.key}
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
