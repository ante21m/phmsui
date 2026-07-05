'use client';
import { useState, useMemo, useEffect, ReactNode } from 'react';
import { ScrollArea } from '@mantine/core';
import { MdSearch, MdArrowUpward, MdArrowDownward, MdUnfoldMore, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import styles from './SmartTable.module.css';

export interface SmartColumn<T> {
  accessor?: keyof T | ((row: T) => ReactNode);
  header: string | ReactNode;
  width?: string;
  sortable?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
}

interface SmartTableProps<T> {
  data: T[];
  columns: SmartColumn<T>[];
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  withSearch?: boolean;
  withPagination?: boolean;
  withRowNumbers?: boolean;
  searchPlaceholder?: string;
  rowKey: (row: T) => string | number;
  searchFilter?: (row: T, search: string) => boolean;
  onRowClick?: (row: T) => void;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  classNames?: {
    page?: string;
    pageHeader?: string;
    pageTitle?: string;
    headerAction?: string;
    pagination?: string;
    paginationInfo?: string;
  };
  title?: string;
  headerAction?: ReactNode;
  selectionBar?: ReactNode;
  /** Max height before table scrolls (sticky header) */
  maxHeight?: string | number;
  hideEntries?: boolean;
}

export default function SmartTable<T>({
  data,
  columns,
  isLoading,
  loadingMessage = 'Loading data...',
  emptyMessage = 'No data found.',
  withSearch = true,
  withPagination = true,
  withRowNumbers = true,
  searchPlaceholder = 'Search...',
  rowKey,
  searchFilter,
  onRowClick,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  classNames,
  title,
  headerAction,
  selectionBar,
  maxHeight,
  hideEntries = false,
}: SmartTableProps<T>) {
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(defaultPageSize);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    if (!search) return arr;
    const q = search.toLowerCase();
    return arr.filter((row) => {
      if (searchFilter) return searchFilter(row, q);
      return columns.some((col) => {
        if (!col.accessor || typeof col.accessor === 'function') return false;
        const val = row[col.accessor];
        return val != null && String(val).toLowerCase().includes(q);
      });
    });
  }, [data, search, searchFilter, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const [scrolled, setScrolled] = useState(false);
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(
    () => (withPagination
      ? sorted.slice((page - 1) * perPage, page * perPage)
      : sorted),
    [sorted, withPagination, perPage, page]
  );

  const toggleSort = (col: SmartColumn<T>) => {
    if (col.sortable === false) return;
    const accessor = col.accessor;
    if (!accessor || typeof accessor === 'function') return;
    if (sortKey === accessor) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(accessor);
      setSortDir('asc');
    }
  };

  const sortIndicator = (col: SmartColumn<T>) => {
    if (col.sortable === false) return null;
    const accessor = col.accessor;
    if (!accessor || typeof accessor === 'function') return null;
    if (sortKey !== accessor) return <MdUnfoldMore className={styles.sortIcon} />;
    return sortDir === 'asc' ? <MdArrowUpward className={styles.sortIcon} /> : <MdArrowDownward className={styles.sortIcon} />;
  };

  const renderTable = (scrollable: boolean, hasMaxHeight: boolean) => {
    const thead = (
      <thead className={scrollable && scrolled ? styles.thScrolled : undefined}>
        <tr>
          {withRowNumbers && <th className={styles.thNum}>#</th>}
          {columns.map((col, i) => (
            <th
              key={i}
              className={`${styles.th} ${col.sortable !== false && col.accessor && typeof col.accessor !== 'function' ? styles.thSortable : ''}`}
              style={{ width: col.width, textAlign: col.textAlign || 'left' }}
              onClick={() => toggleSort(col)}
            >
              <span className={styles.thInner}>
                {col.header}
                {sortIndicator(col)}
              </span>
            </th>
          ))}
        </tr>
      </thead>
    );

    const tbody = (
      <tbody>
        {isLoading ? (
          <tr key="loading">
            <td colSpan={columns.length + (withRowNumbers ? 1 : 0)} className={styles.loadingCell}>
              <div className={styles.spinner} />
              {loadingMessage}
            </td>
          </tr>
        ) : paginated.length === 0 ? (
          <tr key="empty">
            <td colSpan={columns.length + (withRowNumbers ? 1 : 0)} className={styles.emptyCell}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          paginated.map((row, idx) => (
            <tr
              key={rowKey(row)}
              className={`${idx % 2 === 0 ? styles.rowEven : styles.rowOdd} ${onRowClick ? styles.rowClickable : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {withRowNumbers && <td className={styles.tdNum}>{(page - 1) * perPage + idx + 1}</td>}
              {columns.map((col, ci) => {
                let value: ReactNode;
                if (col.render) {
                  value = col.render(row);
                } else if (col.accessor && typeof col.accessor === 'function') {
                  value = col.accessor(row);
                } else if (col.accessor) {
                  const v = row[col.accessor];
                  value = v != null ? String(v) : '—';
                }
                if (typeof value === 'number' && !isFinite(value)) value = '—';
                return (
                  <td key={ci} style={{ textAlign: col.textAlign || 'left' }}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    );

    const table = <table className={styles.table}>{thead}{tbody}</table>;

    if (hasMaxHeight) {
      return (
        <ScrollArea h={maxHeight as number} onScrollPositionChange={({ y }) => setScrolled(y !== 0)}>
          {table}
        </ScrollArea>
      );
    }
    return table;
  };

  const pageNumbers = useMemo(() => {
    const range: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  return (
    <div className={classNames?.page}>
      {title && (
        <div className={`${styles.pageHeader} ${classNames?.pageHeader || ''}`}>
          <h1 className={`${styles.pageTitle} ${classNames?.pageTitle || ''}`}>{title}</h1>
          {headerAction && <div className={classNames?.headerAction}>{headerAction}</div>}
        </div>
      )}

      {(withSearch || withPagination) && (
        <div className={styles.tableControls}>
          {withPagination && !hideEntries && (
            <div className={styles.showEntries}>
              <label>Show</label>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} aria-label="Show entries">
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <label>entries</label>
            </div>
          )}
          {withSearch && (
            <div className={styles.searchBox}>
              <label>Search:</label>
              <div className={styles.searchInputWrap}>
                <MdSearch className={styles.searchIcon} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder={searchPlaceholder}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {selectionBar && <div className={styles.selectionBarWrap}>{selectionBar}</div>}

      <div className={styles.tableWrap}>
        {renderTable(!!maxHeight, !!maxHeight)}
      </div>

      {withPagination && !isLoading && sorted.length > 0 && (
        <div className={`${styles.paginationBar} ${classNames?.pagination || ''}`}>
          <div className={`${styles.paginationInfo} ${classNames?.paginationInfo || ''}`}>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length} entries
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <MdChevronLeft />
            </button>
            {pageNumbers[0] > 1 && (
              <>
                <button className={styles.pageBtn} onClick={() => setPage(1)}>1</button>
                {pageNumbers[0] > 2 && <span className={styles.pageEllipsis}>...</span>}
              </>
            )}
            {pageNumbers.map((p) => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className={styles.pageEllipsis}>...</span>}
                <button className={styles.pageBtn} onClick={() => setPage(totalPages)}>{totalPages}</button>
              </>
            )}
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <MdChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}