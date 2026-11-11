import { Sale } from '../types';
import { getSettings } from './settings';
import { formatCurrency, formatDate, numberToWords } from './utils';
import {
  createDoc, drawHeader, drawParty, drawFooter, ensureSpace, addPageNumbers, normal, bold,
  INK, BRAND, LIGHT, BORDER, MUTED, M, CW, PAGE_W,
} from './pdfCommon';

const money = (n: number) => formatCurrency(n).replace('₹', '₹ ');

export async function generateBillPDF(sale: Sale): Promise<Blob> {
  const s = await getSettings();
  const { doc, autoTable } = await createDoc();

  const isTaxInvoice = !!s.gstin;
  const inter = !!sale.isInterState;
  const finalTotal = sale.finalTotal ?? Math.floor(sale.grandTotal);
  const roundOff = sale.roundOff ?? finalTotal - sale.grandTotal;

  const meta: [string, string][] = [
    ['Invoice No', sale.billNumber],
    ['Date', formatDate(new Date(sale.date))],
  ];
  if (sale.placeOfSupply) meta.push(['Place of supply', sale.placeOfSupply]);

  let y = drawHeader(doc, s, BRAND, isTaxInvoice ? 'TAX INVOICE' : 'INVOICE', 'Original for recipient', meta);

  const lines: string[] = [];
  const contact = [sale.customer.phone ? `Ph: ${sale.customer.phone}` : '', sale.customer.address || ''].filter(Boolean).join('   |   ');
  if (contact) lines.push(contact);
  const right: string[] = [];
  if (sale.customer.gstin) right.push(`GSTIN: ${sale.customer.gstin}`, `State code: ${sale.customer.gstin.slice(0, 2)}`);
  y = drawParty(doc, y, 'BILL TO', BRAND, sale.customer.name, lines, right);

  // ── Items ──
  const hasDisc = sale.items.some(i => i.discountPercent);
  const hasHsn = sale.items.some(i => i.hsnCode);
  const head = ['#', 'Description', ...(hasHsn ? ['HSN/SAC'] : []), 'Qty', 'Rate', ...(hasDisc ? ['Disc'] : []), 'Taxable', 'GST', 'Tax', 'Amount'];
  const body = sale.items.map((it, idx) => [
    idx + 1,
    it.name,
    ...(hasHsn ? [it.hsnCode || '-'] : []),
    `${it.quantity} ${it.unitName}`,
    formatCurrency(it.basePrice),
    ...(hasDisc ? [it.discountPercent ? `${it.discountPercent}%` : '-'] : []),
    formatCurrency(it.lineTaxableAmount),
    `${it.gstPercentage}%`,
    formatCurrency(it.lineGSTAmount),
    formatCurrency(it.lineTotal),
  ]);

  const colStyles: Record<number, { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right' }> = {};
  let c = 0;
  colStyles[c++] = { cellWidth: 7, halign: 'center' };
  colStyles[c++] = { cellWidth: 'auto' };
  if (hasHsn) colStyles[c++] = { cellWidth: 16, halign: 'center' };
  colStyles[c++] = { cellWidth: 17, halign: 'center' };
  colStyles[c++] = { cellWidth: 20, halign: 'right' };
  if (hasDisc) colStyles[c++] = { cellWidth: 11, halign: 'center' };
  colStyles[c++] = { cellWidth: 22, halign: 'right' };
  colStyles[c++] = { cellWidth: 11, halign: 'center' };
  colStyles[c++] = { cellWidth: 19, halign: 'right' };
  colStyles[c++] = { cellWidth: 23, halign: 'right' };

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: 'grid',
    headStyles: { fillColor: INK, textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 7.5, halign: 'center', cellPadding: 2.2 },
    bodyStyles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 7.8, textColor: [25, 32, 40], cellPadding: 2 },
    alternateRowStyles: { fillColor: [247, 249, 250] },
    styles: { lineColor: BORDER, lineWidth: 0.25, overflow: 'linebreak' },
    columnStyles: colStyles,
    margin: { left: M, right: M, top: 15 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ── Tax summary (left) + totals (right) ──
  const groups: Record<number, { taxable: number; gst: number }> = {};
  sale.items.forEach(i => {
    const g = (groups[i.gstPercentage] ||= { taxable: 0, gst: 0 });
    g.taxable += i.lineTaxableAmount;
    g.gst += i.lineGSTAmount;
  });
  const rates = Object.keys(groups).map(Number).sort((a, b) => a - b);

  const rows: [string, string][] = [['Taxable value', money(sale.totalTaxableAmount)]];
  rates.forEach(r => {
    if (r === 0) return;
    if (inter) rows.push([`IGST @ ${r}%`, money(groups[r].gst)]);
    else {
      rows.push([`CGST @ ${r / 2}%`, money(groups[r].gst / 2)]);
      rows.push([`SGST @ ${r / 2}%`, money(groups[r].gst / 2)]);
    }
  });
  if (Math.abs(roundOff) >= 0.01) rows.push(['Round off', `${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}`]);

  const pending = sale.pendingAmount || 0;
  const SUM_W = 78;
  const SUM_X = PAGE_W - M - SUM_W;
  const ROW_H = 6;
  const boxH = rows.length * ROW_H + 4 + 10 + (pending > 0 || sale.paidAmount ? 13 : 0);
  y = ensureSpace(doc, y, boxH + 6);
  const top = y;

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(SUM_X, top, SUM_W, boxH, 2, 2, 'FD');
  let ry = top + 5.5;
  doc.setFontSize(8.3);
  rows.forEach(([l, v]) => {
    normal(doc); doc.setTextColor(...MUTED); doc.text(l, SUM_X + 4, ry);
    doc.setTextColor(...INK); doc.text(v, SUM_X + SUM_W - 4, ry, { align: 'right' });
    ry += ROW_H;
  });
  ry -= 1;
  doc.setFillColor(...INK);
  doc.rect(SUM_X, ry, SUM_W, 10, 'F');
  bold(doc);
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Invoice total', SUM_X + 4, ry + 6.6);
  doc.text(money(finalTotal), SUM_X + SUM_W - 4, ry + 6.6, { align: 'right' });
  ry += 10;
  if (pending > 0 || sale.paidAmount) {
    doc.setFontSize(8.3);
    normal(doc); doc.setTextColor(...MUTED); doc.text('Received', SUM_X + 4, ry + 5);
    doc.setTextColor(20, 110, 70); doc.text(money(sale.paidAmount || 0), SUM_X + SUM_W - 4, ry + 5, { align: 'right' });
    bold(doc); doc.setTextColor(pending > 0 ? 160 : 20, pending > 0 ? 90 : 110, pending > 0 ? 10 : 70);
    doc.text(pending > 0 ? 'Balance due' : 'Fully paid', SUM_X + 4, ry + 10.5);
    doc.text(money(pending), SUM_X + SUM_W - 4, ry + 10.5, { align: 'right' });
  }

  // Left column: amount in words, GST summary, bank
  const LW = SUM_X - M - 6;
  let ly = top;
  bold(doc); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text('Amount in words', M, ly + 3);
  normal(doc); doc.setFontSize(8.3); doc.setTextColor(...INK);
  const words = doc.splitTextToSize(numberToWords(finalTotal), LW) as string[];
  doc.text(words, M, ly + 8);
  ly += 8 + words.length * 4 + 2;

  if (isTaxInvoice && rates.some(r => r > 0)) {
    autoTable(doc, {
      startY: ly,
      head: [inter ? ['GST %', 'Taxable', 'IGST', 'Total tax'] : ['GST %', 'Taxable', 'CGST', 'SGST', 'Total tax']],
      body: rates.map(r => inter
        ? [`${r}%`, formatCurrency(groups[r].taxable), formatCurrency(groups[r].gst), formatCurrency(groups[r].gst)]
        : [`${r}%`, formatCurrency(groups[r].taxable), formatCurrency(groups[r].gst / 2), formatCurrency(groups[r].gst / 2), formatCurrency(groups[r].gst)]),
      theme: 'grid',
      headStyles: { fillColor: [232, 238, 241], textColor: INK, font: 'NotoSans', fontStyle: 'bold', fontSize: 7, halign: 'center', cellPadding: 1.4 },
      bodyStyles: { font: 'NotoSans', fontSize: 7, halign: 'right', cellPadding: 1.4, textColor: [40, 50, 58] },
      columnStyles: { 0: { halign: 'center' } },
      styles: { lineColor: BORDER, lineWidth: 0.2 },
      margin: { left: M, right: PAGE_W - M - LW },
      tableWidth: LW,
    });
    ly = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  const bank: string[] = [];
  if (s.bankName || s.accountNumber) {
    if (s.accountName) bank.push(`A/c name: ${s.accountName}`);
    if (s.bankName) bank.push(`Bank: ${s.bankName}`);
    if (s.accountNumber) bank.push(`A/c no: ${s.accountNumber}${s.ifsc ? `   IFSC: ${s.ifsc.toUpperCase()}` : ''}`);
  }
  if (s.upiId) bank.push(`UPI: ${s.upiId}`);
  if (bank.length) {
    bold(doc); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('Payment details', M, ly + 3);
    normal(doc); doc.setFontSize(7.8); doc.setTextColor(...INK);
    bank.forEach((l, i) => doc.text(l, M, ly + 7.5 + i * 4));
    ly += 7.5 + bank.length * 4;
  }

  y = Math.max(top + boxH, ly) + 6;

  if (sale.notes) {
    const nl = doc.splitTextToSize(sale.notes, CW) as string[];
    y = ensureSpace(doc, y, nl.length * 4 + 8);
    bold(doc); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('Notes', M, y);
    normal(doc); doc.setFontSize(8); doc.setTextColor(...INK);
    doc.text(nl, M, y + 4.5);
    y += nl.length * 4 + 7;
  }

  const terms = (s.invoiceTerms || '').split('\n').map(t => t.trim()).filter(Boolean);
  drawFooter(doc, y, s, terms, 'This is a computer-generated invoice.', 'Thank you for your business!', BRAND);
  addPageNumbers(doc, sale.billNumber);

  return doc.output('blob');
}
