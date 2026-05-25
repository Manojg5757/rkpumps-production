import { Quotation } from '../types';
import { BUSINESS_INFO } from './config';
import { formatCurrency, formatDate, numberToWords } from './utils';

export async function generateQuotationPDF(quotation: Quotation): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const [{ NotoSansRegular }, { NotoSansBold }] = await Promise.all([
    import('./fonts/NotoSans-Regular'),
    import('./fonts/NotoSans-Bold'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', NotoSansBold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

  const normal = () => doc.setFont('NotoSans', 'normal');
  const bold   = () => doc.setFont('NotoSans', 'bold');

  const W      = 210;
  const M      = 12;
  const CW     = W - M * 2;

  const DARK:   [number, number, number] = [30, 41, 59];
  const ACCENT: [number, number, number] = [5, 150, 105];   // green for quotation
  const LIGHT:  [number, number, number] = [248, 250, 252];
  const BORDER: [number, number, number] = [210, 214, 220];

  // ─── HEADER BAND ────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 38, 'F');

  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  bold();
  doc.setFontSize(14);
  doc.text(BUSINESS_INFO.name, M, 13);

  normal();
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  const addrLine = [BUSINESS_INFO.address1, BUSINESS_INFO.address2].filter(Boolean).join(', ');
  doc.text(addrLine, M, 19);
  const contactParts = [
    BUSINESS_INFO.phone ? `Ph: ${BUSINESS_INFO.phone}` : '',
    BUSINESS_INFO.email || '',
  ].filter(Boolean);
  if (contactParts.length) doc.text(contactParts.join('   |   '), M, 24);

  // Title top-right
  doc.setTextColor(255, 255, 255);
  bold();
  doc.setFontSize(16);
  doc.text('PRICE QUOTATION', W - M, 13, { align: 'right' });

  // Quotation meta
  normal();
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text('Quotation No:', W - M - 42, 22);
  doc.text('Date:',        W - M - 42, 28);

  bold();
  doc.setTextColor(240, 245, 255);
  doc.setFontSize(8);
  doc.text(quotation.quotationNumber,              W - M, 22, { align: 'right' });
  doc.text(formatDate(new Date(quotation.date)),   W - M, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // ─── QUOTE TO ───────────────────────────────────────────────────────────────
  const billY = 43;

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, billY, CW, 26, 2, 2, 'FD');

  bold();
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  doc.text('QUOTE TO', M + 4, billY + 6);

  bold();
  doc.setFontSize(10);
  doc.setTextColor(15, 20, 40);
  doc.text(quotation.customer.name, M + 4, billY + 12);

  normal();
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 100);
  const custDetails: string[] = [];
  if (quotation.customer.phone)   custDetails.push(`Ph: ${quotation.customer.phone}`);
  if (quotation.customer.address) custDetails.push(quotation.customer.address);
  if (custDetails.length) doc.text(custDetails.join('   |   '), M + 4, billY + 18);

  // Validity (right side of Quote To box)
  bold();
  doc.setFontSize(8);
  doc.setTextColor(...ACCENT);
  doc.text(`Valid for ${quotation.validDays} days`, W - M - 4, billY + 12, { align: 'right' });
  normal();
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 130);
  const validUntil = new Date(quotation.date);
  validUntil.setDate(validUntil.getDate() + quotation.validDays);
  doc.text(`Until: ${formatDate(validUntil)}`, W - M - 4, billY + 18, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // ─── ITEMS TABLE ─────────────────────────────────────────────────────────────
  const tableStartY = billY + 30;

  const tableData = quotation.items.map((item, i) => [
    i + 1,
    item.name,
    item.unitName,
    item.quantity,
    formatCurrency(item.unitPrice),
    formatCurrency(item.lineTotal),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Description', 'Unit', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: DARK,
      textColor: [255, 255, 255],
      font: 'NotoSans',
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      halign: 'center',
    },
    bodyStyles: {
      font: 'NotoSans',
      fontStyle: 'normal',
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      textColor: [25, 30, 50],
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { lineColor: BORDER, lineWidth: 0.25 },
    columnStyles: {
      0: { cellWidth: 8,    halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16,   halign: 'center' },
      3: { cellWidth: 12,   halign: 'center' },
      4: { cellWidth: 30,   halign: 'right'  },
      5: { cellWidth: 30,   halign: 'right'  },
    },
    margin: { left: M, right: M },
  });

  const docAT = doc as unknown as { lastAutoTable: { finalY: number } };
  const afterTable = docAT.lastAutoTable ? docAT.lastAutoTable.finalY : tableStartY + 30;

  // ─── SUMMARY BOX ─────────────────────────────────────────────────────────────
  const SUM_W = 76;
  const SUM_X = W - M - SUM_W;
  const GAP   = afterTable + 5;
  const ROW_H = 6.5;
  const TOTAL_H = 9;
  const BOX_H   = ROW_H + 4 + TOTAL_H + 2; // just one row + total

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(SUM_X, GAP, SUM_W, BOX_H, 2, 2, 'FD');

  let rY = GAP + 6;
  normal();
  doc.setFontSize(8.5);
  doc.setTextColor(80, 90, 110);
  doc.text('Sub Total', SUM_X + 4, rY);
  doc.setTextColor(20, 25, 45);
  doc.text(formatCurrency(quotation.grandTotal), SUM_X + SUM_W - 4, rY, { align: 'right' });
  rY += ROW_H;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(SUM_X + 2, rY - 1, SUM_X + SUM_W - 2, rY - 1);
  rY += 1;

  doc.setFillColor(...DARK);
  doc.rect(SUM_X, rY, SUM_W, TOTAL_H, 'F');
  doc.roundedRect(SUM_X, rY, SUM_W, TOTAL_H + 2, 2, 2, 'F');

  bold();
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL AMOUNT', SUM_X + 4, rY + 6);
  doc.text(formatCurrency(quotation.grandTotal), SUM_X + SUM_W - 4, rY + 6, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // ─── AMOUNT IN WORDS ─────────────────────────────────────────────────────────
  const wordsX = M;
  const wordsY = GAP + 4;
  const wordsMaxW = SUM_X - M - 6;

  bold();
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 90);
  doc.text('Amount in Words', wordsX, wordsY);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(...LIGHT);
  const wordsText = numberToWords(Math.floor(quotation.grandTotal));
  const wrapped = doc.splitTextToSize(wordsText, wordsMaxW - 8);
  const wordsBoxH = wrapped.length * 5 + 8;
  doc.roundedRect(wordsX, wordsY + 2, wordsMaxW, wordsBoxH, 2, 2, 'FD');
  normal();
  doc.setFontSize(8.5);
  doc.setTextColor(20, 30, 55);
  doc.text(wrapped, wordsX + 4, wordsY + 8);

  doc.setTextColor(0, 0, 0);

  // ─── FOOTER ──────────────────────────────────────────────────────────────────
  const footerY = Math.max(GAP + BOX_H + 10, wordsY + wordsBoxH + 10);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, footerY, W - M, footerY);

  bold();
  doc.setFontSize(8);
  doc.setTextColor(40, 50, 70);
  doc.text('Terms & Conditions:', M, footerY + 6);
  normal();
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 110);
  doc.text(`1. This quotation is valid for ${quotation.validDays} days from the date of issue.`, M, footerY + 11);
  doc.text('2. Prices are subject to change after the validity period.', M, footerY + 16);
  doc.text('3. This is a price quotation only and does not constitute a tax invoice.', M, footerY + 21);

  doc.setDrawColor(140, 150, 170);
  doc.setLineWidth(0.4);
  doc.line(W - M - 48, footerY + 20, W - M, footerY + 20);
  bold();
  doc.setFontSize(8);
  doc.setTextColor(40, 50, 70);
  doc.text(`For ${BUSINESS_INFO.name}`, W - M, footerY + 9, { align: 'right' });
  normal();
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 110);
  doc.text('Authorised Signatory', W - M, footerY + 24, { align: 'right' });

  doc.setFillColor(245, 246, 250);
  doc.rect(0, footerY + 28, W, 12, 'F');
  doc.setFontSize(7.5);
  normal();
  doc.setTextColor(120, 130, 150);
  doc.text('This is a computer-generated quotation.', W / 2, footerY + 33, { align: 'center' });
  doc.setTextColor(...ACCENT);
  bold();
  doc.text('Thank you for your interest!', W / 2, footerY + 37, { align: 'center' });

  return doc.output('blob');
}
