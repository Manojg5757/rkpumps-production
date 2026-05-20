import { Sale } from '../types';
import { BUSINESS_INFO } from './config';
import { formatCurrency, formatDate, numberToWords } from './utils';

export async function generateBillPDF(sale: Sale): Promise<Blob> {
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
  const M      = 12;   // margin
  const CW     = W - M * 2; // content width = 186mm

  const DARK:   [number, number, number] = [30, 41, 59];
  const ACCENT: [number, number, number] = [79, 70, 229];
  const LIGHT:  [number, number, number] = [248, 250, 252];
  const BORDER: [number, number, number] = [210, 214, 220];

  const isTaxInvoice = !!sale.customer.gstin;

  // ─── HEADER BAND ────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 38, 'F');

  // Accent strip at very top
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, W, 2, 'F');

  // Business name
  doc.setTextColor(255, 255, 255);
  bold();
  doc.setFontSize(14);
  doc.text(BUSINESS_INFO.name, M, 13);

  // Business details
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
  if (BUSINESS_INFO.gstin) {
    doc.setTextColor(200, 210, 230);
    bold();
    doc.text(`GSTIN: ${BUSINESS_INFO.gstin}`, M, 29);
  }

  // Invoice type label (top-right)
  doc.setTextColor(255, 255, 255);
  bold();
  doc.setFontSize(16);
  doc.text(isTaxInvoice ? 'TAX INVOICE' : 'INVOICE', W - M, 13, { align: 'right' });

  // Invoice meta (right column)
  normal();
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(`Invoice No:`, W - M - 42, 22);
  doc.text(`Date:`,       W - M - 42, 28);

  bold();
  doc.setTextColor(240, 245, 255);
  doc.setFontSize(8);
  doc.text(sale.billNumber,                   W - M, 22, { align: 'right' });
  doc.text(formatDate(new Date(sale.date)),   W - M, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // ─── BILL TO ────────────────────────────────────────────────────────────────
  const billY = 43;

  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, billY, CW, 26, 2, 2, 'FD');

  // "BILL TO" label
  bold();
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  doc.text('BILL TO', M + 4, billY + 6);

  // Customer name
  bold();
  doc.setFontSize(10);
  doc.setTextColor(15, 20, 40);
  doc.text(sale.customer.name, M + 4, billY + 12);

  // Customer details
  normal();
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 100);
  const custDetails: string[] = [];
  if (sale.customer.phone)   custDetails.push(`Ph: ${sale.customer.phone}`);
  if (sale.customer.address) custDetails.push(sale.customer.address);
  doc.text(custDetails.join('   |   '), M + 4, billY + 18);

  // Customer GSTIN (right)
  if (sale.customer.gstin) {
    bold();
    doc.setFontSize(8);
    doc.setTextColor(15, 20, 40);
    doc.text(`GSTIN: ${sale.customer.gstin}`, W - M - 4, billY + 12, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);

  // ─── ITEMS TABLE ─────────────────────────────────────────────────────────────
  const tableStartY = billY + 30;

  const tableData = sale.items.map((item, i) => {
    const cgst = item.lineGSTAmount / 2;
    const sgst = item.lineGSTAmount / 2;
    return [
      i + 1,
      item.name,
      item.unitName,
      item.quantity,
      formatCurrency(item.basePrice),
      `${item.gstPercentage}%`,
      formatCurrency(cgst),
      formatCurrency(sgst),
      formatCurrency(item.lineTotal),
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'Description', 'Unit', 'Qty', 'Unit Rate', 'GST %', 'CGST', 'SGST', 'Amount']],
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
      0: { cellWidth: 7,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 13, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 21, halign: 'right'  },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 20, halign: 'right'  },
      7: { cellWidth: 20, halign: 'right'  },
      8: { cellWidth: 21, halign: 'right'  },
    },
    margin: { left: M, right: M },
  });

  const docAT = doc as unknown as { lastAutoTable: { finalY: number } };
  const afterTable = docAT.lastAutoTable ? docAT.lastAutoTable.finalY : tableStartY + 30;

  // ─── SUMMARY BOX ─────────────────────────────────────────────────────────────
  const finalTotal = sale.finalTotal ?? Math.floor(sale.grandTotal);
  const roundOff   = sale.roundOff   ?? (finalTotal - sale.grandTotal);

  const SUM_W = 76;
  const SUM_X = W - M - SUM_W;
  const GAP   = afterTable + 5;

  // Group items by GST rate for CGST/SGST breakdown
  const gstGroups: Record<number, { taxable: number; gst: number }> = {};
  for (const item of sale.items) {
    if (!gstGroups[item.gstPercentage]) gstGroups[item.gstPercentage] = { taxable: 0, gst: 0 };
    gstGroups[item.gstPercentage].taxable += item.lineTaxableAmount;
    gstGroups[item.gstPercentage].gst     += item.lineGSTAmount;
  }

  const summaryRows: [string, string][] = [
    ['Taxable Amount', formatCurrency(sale.totalTaxableAmount)],
  ];

  // Per-rate CGST + SGST rows (sorted by rate)
  for (const rate of Object.keys(gstGroups).map(Number).sort((a, b) => a - b)) {
    if (rate === 0) continue;
    const half     = rate / 2;
    const cgstAmt  = gstGroups[rate].gst / 2;
    const sgstAmt  = gstGroups[rate].gst / 2;
    summaryRows.push([`CGST @ ${half}%`, formatCurrency(cgstAmt)]);
    summaryRows.push([`SGST @ ${half}%`, formatCurrency(sgstAmt)]);
  }

  summaryRows.push(['Total GST', formatCurrency(sale.totalGSTAmount)]);

  if (Math.abs(roundOff) >= 0.01) {
    summaryRows.push(['Round Off', `${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}`]);
  }

  const ROW_H     = 6.5;
  const TOTAL_H   = 9;
  const BOX_H     = summaryRows.length * ROW_H + 4 + TOTAL_H + 2;

  // Outer box
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(SUM_X, GAP, SUM_W, BOX_H, 2, 2, 'FD');

  // Summary rows
  let rY = GAP + 6;
  for (const [label, value] of summaryRows) {
    normal();
    doc.setFontSize(8.5);
    doc.setTextColor(80, 90, 110);
    doc.text(label, SUM_X + 4, rY);
    doc.setTextColor(20, 25, 45);
    doc.text(value, SUM_X + SUM_W - 4, rY, { align: 'right' });
    rY += ROW_H;
  }

  // Divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(SUM_X + 2, rY - 1, SUM_X + SUM_W - 2, rY - 1);
  rY += 1;

  // NET PAYABLE row (dark fill inside rounded box — flat top, rounded bottom)
  doc.setFillColor(...DARK);
  doc.rect(SUM_X, rY, SUM_W, TOTAL_H, 'F');
  // re-draw rounded bottom corners by overdrawing with filled roundedRect
  doc.roundedRect(SUM_X, rY, SUM_W, TOTAL_H + 2, 2, 2, 'F');

  bold();
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('NET PAYABLE', SUM_X + 4, rY + 6);
  doc.text(formatCurrency(finalTotal), SUM_X + SUM_W - 4, rY + 6, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // ─── AMOUNT IN WORDS ─────────────────────────────────────────────────────────
  const wordsX = M;
  const wordsY = GAP + 4;
  const wordsMaxW = SUM_X - M - 6;

  doc.setFontSize(8);
  bold();
  doc.setTextColor(60, 70, 90);
  doc.text('Amount in Words', wordsX, wordsY);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(...LIGHT);
  const wordsText = numberToWords(finalTotal);
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

  // Separator
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, footerY, W - M, footerY);

  // Terms (left)
  bold();
  doc.setFontSize(8);
  doc.setTextColor(40, 50, 70);
  doc.text('Terms & Conditions:', M, footerY + 6);
  normal();
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 110);
  doc.text('1. Goods once sold will not be taken back or exchanged.', M, footerY + 11);
  doc.text('2. All disputes are subject to local jurisdiction only.', M, footerY + 16);

  // Signature block (right)
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

  // Bottom note
  doc.setFillColor(245, 246, 250);
  doc.rect(0, footerY + 28, W, 12, 'F');
  doc.setFontSize(7.5);
  normal();
  doc.setTextColor(120, 130, 150);
  doc.text('This is a computer-generated invoice and does not require a physical signature.', W / 2, footerY + 33, { align: 'center' });
  doc.setTextColor(...ACCENT);
  bold();
  doc.text('Thank you for your business!', W / 2, footerY + 37, { align: 'center' });

  return doc.output('blob');
}
