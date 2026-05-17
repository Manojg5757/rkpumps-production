import { Sale } from '../types';
import { BUSINESS_INFO } from './config';
import { formatCurrency, formatDate, numberToWords } from './utils';

export async function generateBillPDF(sale: Sale): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isTaxInvoice = !!sale.customer.gstin;
  const headerText = isTaxInvoice ? 'TAX INVOICE' : 'INVOICE';

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(headerText, 105, 15, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(10, 20, 200, 20);

  // Business Details (Left)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(BUSINESS_INFO.name, 10, 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(BUSINESS_INFO.address1, 10, 34);
  doc.text(BUSINESS_INFO.address2, 10, 40);
  doc.text(`Ph: ${BUSINESS_INFO.phone}`, 10, 46);
  if (BUSINESS_INFO.email) {
    doc.text(`Email: ${BUSINESS_INFO.email}`, 10, 52);
  }

  // Invoice Details (Right)
  doc.text(`Invoice No: ${sale.billNumber}`, 140, 28);
  doc.text(`Date: ${formatDate(new Date(sale.date))}`, 140, 34);
  if (BUSINESS_INFO.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${BUSINESS_INFO.gstin}`, 140, 40);
  }

  doc.line(10, 56, 200, 56);

  // Customer Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 10, 64);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${sale.customer.name}`, 10, 70);
  if (sale.customer.address) {
    doc.text(`Address: ${sale.customer.address}`, 10, 76);
  }
  
  if (sale.customer.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${sale.customer.gstin}`, 140, 70);
    doc.setFont('helvetica', 'normal');
  }
  if (sale.customer.phone) {
    doc.text(`Ph: ${sale.customer.phone}`, 140, 76);
  }

  // Table
  const tableData = sale.items.map((item, index) => [
    index + 1,
    item.name,
    item.unitName,
    item.quantity,
    item.basePrice.toFixed(2),
    `${item.gstPercentage}%`,
    item.lineGSTAmount.toFixed(2),
    item.lineTotal.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['#', 'Description', 'Unit', 'Qty', 'Rate', 'GST%', 'GST Amount', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [50, 50, 50], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
    },
  });

  const docWithAutoTable = doc as unknown as { lastAutoTable: { finalY: number } };
  const finalY = docWithAutoTable.lastAutoTable ? docWithAutoTable.lastAutoTable.finalY + 10 : 100;

  // Summary
  doc.setFontSize(10);
  doc.text(`Taxable Amount:  ${formatCurrency(sale.totalTaxableAmount)}`, 130, finalY);
  doc.text(`Total GST:       ${formatCurrency(sale.totalGSTAmount)}`, 130, finalY + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total:     ${formatCurrency(sale.grandTotal)}`, 130, finalY + 12);

  if (sale.pendingAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Amount Paid:     ${formatCurrency(sale.paidAmount || 0)}`, 130, finalY + 18);
    doc.setTextColor(200, 0, 0); // Red for pending
    doc.text(`Pending Balance: ${formatCurrency(sale.pendingAmount)}`, 130, finalY + 24);
    doc.setTextColor(0, 0, 0); // Reset color
  }

  const textYOffset = sale.pendingAmount > 0 ? 30 : 16;
  doc.line(10, finalY + textYOffset, 200, finalY + textYOffset);

  // Amount in Words
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount in Words: ${numberToWords(sale.grandTotal)}`, 10, finalY + textYOffset + 8);

  doc.line(10, finalY + textYOffset + 12, 200, finalY + textYOffset + 12);

  // Footer
  doc.setFontSize(9);
  doc.text('This is a computer-generated invoice.', 105, finalY + textYOffset + 20, { align: 'center' });
  doc.text('Thank you for your business!', 105, finalY + textYOffset + 25, { align: 'center' });

  return doc.output('blob');
}
