import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportPdf(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 137, 123] },
  });
  doc.save(`${filename}.pdf`);
}

export function printPage() {
  window.print();
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatServerDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export function printTable(title: string, headers: string[], rows: (string | number)[][], rightAlignFrom = 1) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h2 { font-size: 16px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 6px 8px; background: #eee; border: 1px solid #ccc; font-size: 11px; text-transform: uppercase; }
    td { padding: 5px 8px; border: 1px solid #ccc; }
    .r { text-align: right; }
  </style></head><body>
  <h2>${title}</h2>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(row => `<tr>${row.map((c, ci) => `<td${ci >= rightAlignFrom ? ' class="r"' : ''}>${c ?? ''}</td>`).join('')}</tr>`).join('')}
  </tbody></table></body></html>`);
  win.document.close();
  win.print();
}