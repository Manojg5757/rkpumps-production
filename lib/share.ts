import toast from 'react-hot-toast';
import { Quotation, Sale } from '../types';
import { saleTotal } from './gst';
import { formatDate } from './utils';
import { BUSINESS_INFO } from './config';

export const safeFileName = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Open a PDF in a new tab for viewing / printing. Falls back to download if pop-ups are blocked. */
export function openBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) downloadBlob(blob, filename);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const rupee = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const waNumber = (phone?: string) => {
  const d = (phone || '').replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  return d;
};

export function openWhatsApp(phone: string | undefined, text: string) {
  const n = waNumber(phone);
  const url = n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/**
 * Share a PDF. On phones this opens the native share sheet (WhatsApp, Gmail…) with the PDF attached.
 * On desktop it opens WhatsApp with a text summary and downloads the PDF to attach.
 */
export async function sharePdf(blob: Blob, filename: string, text: string, phone?: string) {
  try {
    const file = new File([blob], filename, { type: 'application/pdf' });
    const data = { files: [file], title: filename.replace(/\.pdf$/, ''), text };
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare(data)) {
      await navigator.share(data);
      return;
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
  }
  openWhatsApp(phone, text);
  downloadBlob(blob, filename);
  toast('PDF downloaded — attach it in WhatsApp', { icon: '📎' });
}

export function invoiceMessage(s: Sale, businessName = BUSINESS_INFO.name) {
  const total = saleTotal(s);
  const lines = [
    `*Invoice ${s.billNumber}*`,
    `Date: ${formatDate(new Date(s.date))}`,
    `Customer: ${s.customer.name}`,
    '',
    ...s.items.map(i => `• ${i.name} × ${i.quantity} — ${rupee(i.lineTotal)}`),
    '',
    `*Total: ${rupee(total)}*`,
  ];
  if ((s.pendingAmount || 0) > 0) {
    lines.push(`Paid: ${rupee(s.paidAmount || 0)}`, `*Balance due: ${rupee(s.pendingAmount)}*`);
  }
  lines.push('', `Thank you — ${businessName}`);
  return lines.join('\n');
}

export function quotationMessage(q: Quotation, businessName = BUSINESS_INFO.name) {
  return [
    `*Quotation ${q.quotationNumber}*`,
    `Date: ${formatDate(new Date(q.date))}`,
    `Customer: ${q.customer.name}`,
    '',
    ...q.items.map(i => `• ${i.name} × ${i.quantity} — ${rupee(i.lineTotal)}`),
    '',
    `*Total: ${rupee(q.grandTotal)}* (incl. GST)`,
    `_Valid for ${q.validDays} days_`,
    '',
    `— ${businessName}`,
  ].join('\n');
}

export function reminderMessage(name: string, pending: number, bills: string[], businessName = BUSINESS_INFO.name, upiId?: string) {
  const lines = [
    `Dear ${name},`,
    '',
    `This is a gentle reminder that ${rupee(pending)} is pending${bills.length ? ` against invoice${bills.length > 1 ? 's' : ''} ${bills.join(', ')}` : ''}.`,
    'Kindly arrange the payment at the earliest.',
  ];
  if (upiId) lines.push('', `UPI: ${upiId}`);
  lines.push('', `Thank you — ${businessName}`);
  return lines.join('\n');
}
