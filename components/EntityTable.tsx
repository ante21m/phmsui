'use client';
import { Search, X } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render?: (item: T, index: number) => React.ReactNode;
}

interface EntityTableProps<T> {
  title: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  searchValue?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onAdd?: () => void;
  addLabel?: string;
  rowKey: (item: T) => string | number;
  emptyMessage?: string;
  maxHeight?: number;
  headerAction?: React.ReactNode;
}

function buildPageList(cur: number, tot: number): (number | '...')[] {
  if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
  const s = new Set([1, tot, cur, cur - 1, cur + 1].filter(n => n >= 1 && n <= tot));
  const asc = Array.from(s).sort((a, b) => a - b);
  const res: (number | '...')[] = [];
  let prev: number | null = null;
  for (const n of asc) {
    if (prev !== null && n - prev > 1) res.push('...');
    res.push(n);
    prev = n;
  }
  return res;
}

export function EntityTable<T>({
  title,
  columns,
  data,
  loading = false,
  page,
  total,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  searchValue = '',
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
  sortKey,
  sortDir,
  onAdd,
  addLabel = 'Add',
  rowKey,
  emptyMessage = 'No items found.',
  maxHeight,
  headerAction,
}: EntityTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tableHeaderStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: 'var(--gray-50, #f8fafb)',
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg, 8px)',
      boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))',
      overflow: 'hidden',
      border: '1px solid var(--gray-200, #e2e8e6)',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 10px',
        minHeight: 38,
        background: 'var(--teal-primary, #00897b)',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: 'white',
          letterSpacing: '0.3px',
        }}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {headerAction}
          {onAdd && (
            <button
              onClick={onAdd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'white',
                color: 'var(--teal-dark, #00695c)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md, 6px)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))',
              }}
            >
              {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 4,
        padding: '8px 12px',
        borderBottom: '1px solid var(--gray-200, #e2e8e6)',
        fontSize: 13.5,
        color: 'var(--gray-700, #334744)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            style={{
              padding: '4px 8px',
              border: '1px solid var(--gray-300, #cbd5d2)',
              borderRadius: 'var(--radius-sm, 4px)',
              background: 'white',
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span>entries</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Search:</span>
          <div style={{ position: 'relative' }}>
            <Search style={{
              position: 'absolute', left: 8, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--gray-400, #9eada9)',
              width: 14, height: 14,
              pointerEvents: 'none',
            }} />
            <input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }}
              style={{
                padding: '6px 10px 6px 28px',
                border: '1px solid var(--gray-300, #cbd5d2)',
                borderRadius: 'var(--radius-sm, 4px)',
                outline: 'none',
                width: 200,
                fontSize: 13.5,
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--teal-primary, #00897b)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--gray-300, #cbd5d2)'}
            />
            {searchValue && (
              <button
                onClick={() => { onSearchChange(''); onPageChange(1); }}
                style={{
                  position: 'absolute', right: 6, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 2,
                  display: 'flex',
                  color: 'var(--gray-400, #9eada9)',
                }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto', maxHeight: maxHeight || undefined }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13.5,
        }}>
          <thead style={tableHeaderStyle}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => {
                    if (col.sortable && onSortChange) {
                      if (sortKey === col.key) {
                        onSortChange(col.key, sortDir === 'asc' ? 'desc' : 'asc');
                      } else {
                        onSortChange(col.key, 'asc');
                      }
                    }
                  }}
                  style={{
                    padding: '10px 12px',
                    textAlign: col.align || 'left',
                    fontWeight: 600,
                    fontSize: 12.5,
                    color: 'var(--gray-600, #4b6360)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    borderBottom: '1px solid var(--gray-200, #e2e8e6)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    width: col.width,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    {col.sortable && (
                      <span style={{
                        fontSize: 10,
                        opacity: sortKey === col.key ? 1 : 0.35,
                        color: sortKey === col.key ? 'var(--teal-primary, #00897b)' : undefined,
                      }}>
                        {sortKey === col.key ? (sortDir === 'asc' ? '\u2191' : '\u2193') : '\u21C5'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: '60px 12px',
                  textAlign: 'center',
                  color: 'var(--gray-400, #9eada9)',
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 22, height: 22,
                      borderRadius: '50%',
                      border: '2px solid var(--teal-primary, #00897b)',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: '60px 12px',
                  textAlign: 'center',
                  color: 'var(--gray-400, #9eada9)',
                }}>
                  <span>{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr
                  key={rowKey(item)}
                  style={{
                    background: i % 2 === 0 ? 'white' : 'var(--gray-50, #f8fafb)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--teal-50, #e0f2f1)' }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i % 2 === 0 ? 'white' : 'var(--gray-50, #f8fafb)';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--gray-100, #f1f5f4)',
                        textAlign: col.align || 'left',
                        color: 'var(--gray-800, #1f2e2c)',
                      }}
                    >
                      {col.render
                        ? col.render(item, i)
                        : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        padding: '10px 16px',
        borderTop: '1px solid var(--gray-200, #e2e8e6)',
        fontSize: 13.5,
        color: 'var(--gray-600, #4b6360)',
      }}>
        <span>
          {total === 0
            ? 'No entries'
            : `Showing ${(page - 1) * pageSize + 1}\u2013${Math.min(page * pageSize, total)} of ${total} entries`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            style={{
              minWidth: 28, height: 28,
              borderRadius: 'var(--radius-sm, 4px)',
              border: '1px solid var(--gray-300, #cbd5d2)',
              background: 'white',
              fontSize: 13,
              cursor: page <= 1 ? 'default' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {'\u2039'}
          </button>
          {buildPageList(page, totalPages).map((n, i) =>
            n === '...' ? (
              <span key={`e${i}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--gray-400)' }}>{'...'}</span>
            ) : (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                style={{
                  minWidth: 28, height: 28,
                  borderRadius: 'var(--radius-sm, 4px)',
                  border: n === page
                    ? '1px solid var(--teal-primary, #00897b)'
                    : '1px solid var(--gray-300, #cbd5d2)',
                  background: n === page ? 'var(--teal-primary, #00897b)' : 'white',
                  color: n === page ? 'white' : 'var(--gray-700, #334744)',
                  fontWeight: n === page ? 600 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {n}
              </button>
            )
          )}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{
              minWidth: 28, height: 28,
              borderRadius: 'var(--radius-sm, 4px)',
              border: '1px solid var(--gray-300, #cbd5d2)',
              background: 'white',
              fontSize: 13,
              cursor: page >= totalPages ? 'default' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {'\u203A'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EntityFormModal({
  open,
  onClose,
  title,
  children,
  onSave,
  saveLabel = 'Save',
  saving = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-lg, 8px)',
          width: 500, maxWidth: '90vw',
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--teal-primary, #00897b)',
          color: 'white',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, border: 'none', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              color: 'white', fontSize: 18, cursor: 'pointer',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ padding: 16 }}>
          {children}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '0 16px 16px',
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', border: 'none',
              borderRadius: 'var(--radius-sm, 4px)',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              background: 'var(--gray-200, #e2e8e6)',
              color: 'var(--gray-700, #334744)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 20px', border: 'none',
              borderRadius: 'var(--radius-sm, 4px)',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              background: 'var(--teal-primary, #00897b)',
              color: 'white',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
