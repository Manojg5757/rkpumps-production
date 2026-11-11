import { Quotation } from '../types';
import { getSettings } from './settings';
import { formatCurrency, formatDate, numberToWords } from './utils';
import {
  createDoc, drawHeader, drawParty, drawFooter, ensureSpace, addPageNumbers, normal, bold,
  INK, QUOTE, LIGHT, BORDER, MUTED, M, CW, PAGE_W,
} from './pdfCommon';

export async function generateQuotationPDF(q: Quotation): Promise<Blob> {
  const s = await getSettings();
  const { doc, autoTable } = await createDoc();

  const until = new Date(q.date);
  until.setDate(until.getDate() + q.validDays);

  let y = drawHeader(doc, s, QUOTE, 'QUOTATION', 'Price estimate', [
    ['Quotation No', q.quotationNumber],
    ['Date', formatDate(new Date(q.date))],
    ['Valid until', formatDate(until)],
  ]);

  const contact = [q.customer.phone ? `Ph: ${q.customer.phone}` : '', q.customer.address || ''].filter(Boolean).join('   |   ');
  y = drawParty(doc, y, 'QUOTE TO', QUOTE, q.customer.name, contact ? [contact] : [], [`Valid for ${q.validDays} days`]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Description', 'Qty', 'Unit price', 'Amount']],
    body: q.items.map((i, idx) => [idx + 1, i.name, `${i.quantity} ${i.unitName}`, formatCurrency(i.unitPrice), formatCurrency(i.lineTotal)]),
    theme: 'grid',
    headStyles: { fillColor: INK, textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 2.4 },
    bodyStyles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8.2, textColor: [25, 32, 40], cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [247, 249, 250] },
    styles: { lineColor: BORDER, lineWidth: 0.25, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: M, right: M, top: 15 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  const SUM_W = 78;
  const SUM_X = PAGE_W - M - SUM_W;
  y = ensureSpace(doc, y, 32);
  const top = y;

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(SUM_X, top, SUM_W, 21, 2, 2, 'FD');
  normal(doc); doc.setFontSize(8.3); doc.setTextColor(...MUTED);
  doc.text('Prices include GST', SUM_X + 4, top + 6);
  doc.setFillColor(...INK);
  doc.rect(SUM_X, top + 10, SUM_W, 11, 'F');
  bold(doc); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('Total amount', SUM_X + 4, top + 17);
  doc.text(formatCurrency(q.grandTotal).replace('₹', '₹ '), SUM_X + SUM_W - 4, top + 17, { align: 'right' });

  const LW = SUM_X - M - 6;
  bold(doc); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text('Amount in words', M, top + 3);
  normal(doc); doc.setFontSize(8.3); doc.setTextColor(...INK);
  const words = doc.splitTextToSize(numberToWords(Math.floor(q.grandTotal)), LW) as string[];
  doc.text(words, M, top + 8);
  let ly = top + 8 + words.length * 4 + 3;

  const contactLine = [s.phone ? `Call / WhatsApp: ${s.phone}` : '', s.upiId ? `UPI: ${s.upiId}` : ''].filter(Boolean).join('   |   ');
  if (contactLine) {
    normal(doc); doc.setFontSize(7.8); doc.setTextColor(...MUTED);
    doc.text(contactLine, M, ly + 2);
    ly += 6;
  }

  y = Math.max(top + 21, ly) + 6;

  if (q.notes) {
    const nl = doc.splitTextToSize(q.notes, CW) as string[];
    y = ensureSpace(doc, y, nl.length * 4 + 8);
    bold(doc); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text('Notes', M, y);
    normal(doc); doc.setFontSize(8); doc.setTextColor(...INK);
    doc.text(nl, M, y + 4.5);
    y += nl.length * 4 + 7;
  }

  const terms = [
    `This quotation is valid for ${q.validDays} days from the date of issue.`,
    ...(s.quotationTerms || '').split('\n').map(t => t.trim()).filter(Boolean),
  ];
  drawFooter(doc, y, s, terms, 'This is a computer-generated quotation.', 'Thank you for your interest!', QUOTE);
  addPageNumbers(doc, q.quotationNumber);

  return doc.output('blob');
}
