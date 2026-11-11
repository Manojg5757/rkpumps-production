import type { jsPDF as JsPDF } from 'jspdf';
import { BusinessSettings } from '../types';

export type RGB = [number, number, number];
export const INK: RGB = [20, 35, 43];
export const BRAND: RGB = [14, 90, 122];
export const QUOTE: RGB = [5, 120, 87];
export const LIGHT: RGB = [244, 247, 248];
export const BORDER: RGB = [210, 218, 222];
export const MUTED: RGB = [100, 115, 125];

export const PAGE_W = 210;
export const PAGE_H = 297;
export const M = 12;
export const CW = PAGE_W - M * 2;

export async function createDoc() {
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
  doc.setFont('NotoSans', 'normal');
  return { doc, autoTable };
}

export const normal = (doc: JsPDF) => doc.setFont('NotoSans', 'normal');
export const bold = (doc: JsPDF) => doc.setFont('NotoSans', 'bold');

/** Draw the business header band. Returns the y position below it. */
export function drawHeader(doc: JsPDF, s: BusinessSettings, accent: RGB, title: string, subtitle: string, meta: [string, string][]) {
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, 40, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 0, PAGE_W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  bold(doc);
  doc.setFontSize(15);
  doc.text(s.name, M, 13);

  normal(doc);
  doc.setFontSize(8);
  doc.setTextColor(190, 205, 212);
  const addr = [s.address1, s.address2].filter(Boolean).join(', ');
  if (addr) doc.text(addr, M, 19);
  const contact = [s.phone ? `Ph: ${s.phone}` : '', s.email].filter(Boolean).join('   |   ');
  if (contact) doc.text(contact, M, 24);
  if (s.gstin) {
    bold(doc);
    doc.setTextColor(235, 242, 245);
    doc.text(`GSTIN: ${s.gstin}`, M, 30);
  }

  bold(doc);
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, PAGE_W - M, 13, { align: 'right' });
  normal(doc);
  doc.setFontSize(7);
  doc.setTextColor(170, 188, 196);
  if (subtitle) doc.text(subtitle, PAGE_W - M, 17.5, { align: 'right' });

  let y = 23;
  doc.setFontSize(8);
  for (const [k, v] of meta) {
    normal(doc);
    doc.setTextColor(170, 188, 196);
    doc.text(k, PAGE_W - M - 46, y);
    bold(doc);
    doc.setTextColor(240, 246, 248);
    doc.text(v, PAGE_W - M, y, { align: 'right' });
    y += 5;
  }
  doc.setTextColor(0, 0, 0);
  return 45;
}

/** Party box ("Bill to" / "Quote to"). Returns the y below it. */
export function drawParty(doc: JsPDF, y: number, label: string, accent: RGB, name: string, lines: string[], right: string[] = []) {
  const wrapped = lines.flatMap(l => doc.splitTextToSize(l, CW * 0.62) as string[]);
  const h = Math.max(20, 13 + wrapped.length * 4.2);
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, h, 2, 2, 'FD');
  bold(doc);
  doc.setFontSize(7);
  doc.setTextColor(...accent);
  doc.text(label, M + 4, y + 5.5);
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(name, M + 4, y + 11);
  normal(doc);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  wrapped.forEach((l, i) => doc.text(l, M + 4, y + 15.5 + i * 4.2));
  right.forEach((l, i) => {
    if (i === 0) { bold(doc); doc.setTextColor(...INK); } else { normal(doc); doc.setTextColor(...MUTED); }
    doc.text(l, PAGE_W - M - 4, y + 11 + i * 4.5, { align: 'right' });
  });
  doc.setTextColor(0, 0, 0);
  return y + h + 4;
}

/** Ensure there is `need` mm left on the page; otherwise add a page. Returns the y to continue at. */
export function ensureSpace(doc: JsPDF, y: number, need: number) {
  if (y + need > PAGE_H - 12) {
    doc.addPage();
    return 15;
  }
  return y;
}

export function drawFooter(doc: JsPDF, y: number, s: BusinessSettings, terms: string[], note: string, thanks: string, accent: RGB) {
  const termLines = terms.flatMap((t, i) => doc.splitTextToSize(`${i + 1}. ${t}`, CW * 0.58) as string[]);
  const need = 18 + termLines.length * 4.3 + 14;
  y = ensureSpace(doc, y, need);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, y, PAGE_W - M, y);

  if (termLines.length) {
    bold(doc);
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text('Terms & conditions', M, y + 6);
    normal(doc);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    termLines.forEach((l, i) => doc.text(l, M, y + 11 + i * 4.3));
  }

  bold(doc);
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(`For ${s.name}`, PAGE_W - M, y + 6, { align: 'right' });
  doc.setDrawColor(150, 160, 168);
  doc.line(PAGE_W - M - 50, y + 20, PAGE_W - M, y + 20);
  normal(doc);
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('Authorised signatory', PAGE_W - M, y + 24, { align: 'right' });

  const by = Math.max(y + 28, y + 13 + termLines.length * 4.3);
  doc.setFillColor(...LIGHT);
  doc.rect(0, by, PAGE_W, 11, 'F');
  doc.setFontSize(7);
  doc.setTextColor(130, 140, 150);
  doc.text(note, PAGE_W / 2, by + 4.5, { align: 'center' });
  bold(doc);
  doc.setTextColor(...accent);
  doc.text(thanks, PAGE_W / 2, by + 8.5, { align: 'center' });
}

export function addPageNumbers(doc: JsPDF, label: string) {
  const n = doc.getNumberOfPages();
  if (n < 2) return;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    normal(doc);
    doc.setFontSize(7);
    doc.setTextColor(140, 150, 158);
    doc.text(`${label} · page ${i} of ${n}`, PAGE_W - M, PAGE_H - 5, { align: 'right' });
  }
}
