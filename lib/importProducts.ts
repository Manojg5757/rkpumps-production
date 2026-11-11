import { Category, Product, Unit } from '../types';
import { GST_RATES, round2, round4 } from './gst';

/** One spreadsheet row turned into a product, with what the import will do with it. */
export type PlannedRow = {
  row: number;                 // spreadsheet row number (1-based, as Excel shows it)
  name: string;
  itemCode: string;
  categoryName: string;
  unitName: string;
  hsnCode: string;
  gstPercentage: number;
  isService: boolean;
  basePrice?: number;          // excl. GST
  purchasePrice?: number;      // excl. GST
  openingStock: number;
  lowStockThreshold?: number;
  verifyWithCA: boolean;
  action: 'create' | 'update' | 'skip';
  existingId?: string;
  addStock: number;            // quantity added to an existing product (Stock in)
  errors: string[];
  warnings: string[];
};

export type ImportPlan = {
  rows: PlannedRow[];
  newCategories: string[];
  newUnits: string[];
  saleIncludesGst: boolean;
  columns: string[];           // which known columns the file has
  stockForExisting: number;    // existing products that have a stock quantity in the file
  saleHeader: string;
  counts: { create: number; update: number; skip: number; warnings: number; verify: number };
};

// ── File reading ─────────────────────────────────────────────────────────────

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function readSpreadsheet(file: File): Promise<unknown[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    // Prefer a sheet called "Products"; otherwise the first sheet.
    try {
      return (await readSheet(file, 'Products')) as unknown[][];
    } catch {
      return (await readSheet(file)) as unknown[][];
    }
  }
  throw new Error('Choose an .xlsx or .csv file. Old .xls files: open in Excel and "Save As" .xlsx first.');
}

// ── Column mapping ───────────────────────────────────────────────────────────

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const COLS: Record<string, (h: string) => boolean> = {
  name: h => ['item name', 'product name', 'name', 'product', 'item'].includes(h),
  code: h => ['item code', 'code', 'sku', 'product code'].includes(h),
  category: h => h === 'category' || h === 'group',
  hsn: h => ['hsn/sac', 'hsn', 'sac', 'hsn code', 'hsn/sac code'].includes(h),
  gst: h => ['gst %', 'gst', 'gst rate', 'gst%', 'tax %', 'tax rate'].includes(h),
  unit: h => ['unit', 'uom', 'units'].includes(h),
  type: h => h === 'type',
  sale: h => /^(sale rate|sale price|selling price|selling rate|mrp|rate)\b/.test(h),
  purchase: h => /^(purchase rate|purchase price|cost price|cost)\b/.test(h),
  stock: h => ['opening stock', 'stock', 'qty', 'quantity', 'current stock'].includes(h),
  low: h => ['low stock alert', 'reorder level', 'min stock', 'low stock'].includes(h),
  verify: h => h === 'verify with ca',
};

/** Unit codes used on GST portals / spreadsheets → friendly unit names. */
const UNIT_NAMES: Record<string, string> = {
  nos: 'Nos', no: 'Nos', pcs: 'Piece', pc: 'Piece', piece: 'Piece',
  mtr: 'Meter', mtrs: 'Meter', m: 'Meter', meter: 'Meter', metre: 'Meter',
  set: 'Set', sets: 'Set', rol: 'Roll', roll: 'Roll', kgs: 'Kg', kg: 'Kg',
  pac: 'Pack', pack: 'Pack', ft: 'Feet', feet: 'Feet', ltr: 'Litre', l: 'Litre', litre: 'Litre',
  box: 'Box', prs: 'Pair', pair: 'Pair', job: 'Job',
};

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  const s = String(v).replace(/[₹,\s]/g, '').replace(/rs\.?/i, '');
  if (s === '') return undefined;
  const n = Number(s);
  return isFinite(n) ? n : undefined;
};

export function buildPlan(
  raw: unknown[][],
  existing: { products: Product[]; categories: Category[]; units: Unit[] },
  opts: { saleIncludesGst?: boolean; addStockToExisting?: boolean } = {}
): ImportPlan {
  const headerIdx = raw.findIndex(r => Array.isArray(r) && r.some(c => COLS.name(norm(c))));
  if (headerIdx < 0) throw new Error('Could not find a header row with an "Item Name" (or "Product Name") column.');
  const header = raw[headerIdx].map(norm);
  const col: Record<string, number> = {};
  for (const [key, test] of Object.entries(COLS)) {
    const i = header.findIndex(h => test(h));
    if (i >= 0) col[key] = i;
  }
  const saleHeader = col.sale !== undefined ? String(raw[headerIdx][col.sale]) : '';
  const hs = norm(saleHeader);
  const saleIncludesGst = /excl|without gst|before gst/.test(hs) ? false : /incl|with gst/.test(hs) ? true : opts.saleIncludesGst ?? true;

  const catByName = new Map(existing.categories.map(c => [c.name.trim().toLowerCase(), c]));
  const unitByName = new Map(existing.units.map(u => [u.name.trim().toLowerCase(), u]));
  const byCode = new Map(existing.products.filter(p => p.itemCode).map(p => [p.itemCode!.trim().toLowerCase(), p]));
  const byName = new Map(existing.products.map(p => [p.name.trim().toLowerCase(), p]));

  const newCategories = new Set<string>();
  const newUnits = new Set<string>();
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const rows: PlannedRow[] = [];

  const get = (r: unknown[], k: string) => (col[k] === undefined ? undefined : r[col[k]]);

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i] || [];
    if (!r.some(c => String(c ?? '').trim() !== '')) continue; // blank row
    const errors: string[] = [];
    const warnings: string[] = [];

    const name = String(get(r, 'name') ?? '').trim().replace(/\s+/g, ' ');
    const itemCode = String(get(r, 'code') ?? '').trim().toUpperCase();
    const isService = norm(get(r, 'type')) === 'service';
    const categoryName = String(get(r, 'category') ?? '').trim() || (isService ? 'Services' : 'General');
    const rawUnit = String(get(r, 'unit') ?? '').trim();
    const unitName = UNIT_NAMES[rawUnit.toLowerCase()] || rawUnit || (isService ? 'Job' : 'Nos');
    const hsnCode = String(get(r, 'hsn') ?? '').replace(/\D/g, '');
    const gst = num(get(r, 'gst'));
    const sale = num(get(r, 'sale'));
    const purchase = num(get(r, 'purchase'));
    const stockRaw = get(r, 'stock');
    const stock = num(stockRaw);
    const low = num(get(r, 'low'));
    const verifyWithCA = norm(get(r, 'verify')) === 'yes';

    if (!name) errors.push('Item name is empty');
    if (name.length > 120) errors.push('Item name is longer than 120 characters');
    const gstPercentage = gst ?? 18;
    if (gst === undefined) warnings.push('No GST % — using 18%');
    else if (!GST_RATES.includes(gst)) errors.push(`GST ${gst}% is not a valid rate (use ${GST_RATES.join('/')})`);
    if (hsnCode && (hsnCode.length < 4 || hsnCode.length > 8)) warnings.push(`HSN "${hsnCode}" should be 4–8 digits`);
    if (!hsnCode) warnings.push('No HSN/SAC code');
    if (sale !== undefined && sale < 0) errors.push('Sale rate is negative');
    if (purchase !== undefined && purchase < 0) errors.push('Purchase rate is negative');
    if (stockRaw !== undefined && stockRaw !== null && String(stockRaw).trim() !== '' && stock === undefined && !isService) {
      errors.push(`Opening stock "${String(stockRaw)}" is not a number`);
    }
    if (stock !== undefined && stock < 0) errors.push('Opening stock is negative');

    const basePrice = sale === undefined ? undefined : round4(saleIncludesGst ? sale / (1 + gstPercentage / 100) : sale);
    const purchasePrice = purchase === undefined ? undefined : round2(purchase);
    if (basePrice !== undefined && purchasePrice !== undefined && basePrice > 0 && purchasePrice >= basePrice) {
      warnings.push(`Cost ₹${purchasePrice} is not below the selling rate ₹${basePrice} (excl. GST)`);
    }
    // duplicates inside the file
    const codeKey = itemCode.toLowerCase();
    const nameKey = name.toLowerCase();
    if ((codeKey && seenCodes.has(codeKey)) || (nameKey && seenNames.has(nameKey))) {
      errors.push('Duplicate of an earlier row in this file');
    }
    if (codeKey) seenCodes.add(codeKey);
    if (nameKey) seenNames.add(nameKey);

    const match = (codeKey && byCode.get(codeKey)) || byName.get(nameKey);
    if (!match && !(basePrice && basePrice > 0)) warnings.push('No sale rate — set it before billing');
    if (match && basePrice === undefined) warnings.push('No sale rate in file — current price kept');
    const openingStock = isService ? 0 : stock ?? 0;
    let addStock = 0;
    if (match && openingStock > 0 && !match.isService) {
      if (opts.addStockToExisting) addStock = openingStock;
      else warnings.push(`Already in inventory — stock stays at ${match.stockQuantity}. Tick “Add stock to existing items” to add ${openingStock}.`);
    }

    const action: PlannedRow['action'] = errors.length ? 'skip' : match ? 'update' : 'create';
    if (action !== 'skip') {
      if (!catByName.has(categoryName.toLowerCase())) newCategories.add(categoryName);
      if (!unitByName.has(unitName.toLowerCase())) newUnits.add(unitName);
    }

    rows.push({
      row: i + 1, name, itemCode, categoryName, unitName, hsnCode, gstPercentage, isService,
      basePrice, purchasePrice, openingStock, lowStockThreshold: isService ? 0 : low,
      verifyWithCA, action, existingId: match?.id, addStock, errors, warnings,
    });
  }

  // case-insensitive de-dupe of new names (keep first spelling)
  const dedupe = (s: Set<string>) => Array.from(new Map(Array.from(s).map(x => [x.toLowerCase(), x])).values());

  return {
    rows,
    newCategories: dedupe(newCategories),
    newUnits: dedupe(newUnits),
    saleIncludesGst,
    saleHeader,
    columns: Object.keys(col),
    stockForExisting: rows.filter(r => r.action === 'update' && r.openingStock > 0 && !r.isService).length,
    counts: {
      create: rows.filter(r => r.action === 'create').length,
      update: rows.filter(r => r.action === 'update').length,
      skip: rows.filter(r => r.action === 'skip').length,
      warnings: rows.filter(r => r.action !== 'skip' && r.warnings.length).length,
      verify: rows.filter(r => r.verifyWithCA && r.action !== 'skip').length,
    },
  };
}
