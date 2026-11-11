import fs from 'fs';
import { buildPlan, parseCsv } from '../lib/importProducts';
import { Category, Product, Unit } from '../types';

const SHEET = 'C:/Users/user/OneDrive/Desktop/borewell-gst-products/Borewell_Products_GST_TN_priced.xlsx';
const hasSheet = fs.existsSync(SHEET);

const units: Unit[] = [{ id: 'u1', name: 'Piece' }, { id: 'u2', name: 'Meter' }, { id: 'u3', name: 'Set' }, { id: 'u4', name: 'Kg' }, { id: 'u5', name: 'Roll' }];
const categories: Category[] = [{ id: 'c1', name: 'Fasteners' }, { id: 'c2', name: 'Valves' }];

describe('parseCsv', () => {
  it('handles quotes, commas and escaped quotes', () => {
    expect(parseCsv('a,b\n"1"" pipe, long",2\n')).toEqual([['a', 'b'], ['1" pipe, long', '2']]);
  });
});

describe('buildPlan (synthetic)', () => {
  const raw = [
    ['Item Code', 'Item Name', 'Category', 'HSN/SAC', 'GST %', 'Unit', 'Type', 'Sale Rate incl GST (Rs)', 'Purchase Rate (Rs)', 'Opening Stock'],
    ['X-1', 'Pump A', 'Pumps', '841370', 5, 'NOS', 'Goods', 10500, 8000, 3],
    ['X-2', 'Drilling', 'Services', '995434', 18, 'FT', 'Service', 118, '', 'n/a (service)'],
    ['X-3', 'Bad GST', 'Pumps', '841370', 7, 'NOS', 'Goods', 100, '', ''],
    ['X-1', 'Pump A copy', 'Pumps', '841370', 5, 'NOS', 'Goods', 100, '', ''],
    ['', 'Existing Valve', 'Valves', '848180', 18, 'NOS', 'Goods', '', '', 5],
  ];
  const existing: Product[] = [{ id: 'p9', name: 'Existing Valve', stockQuantity: 4 } as Product];
  const plan = buildPlan(raw, { products: existing, categories, units });

  it('reads incl-GST sale rate and converts to base price', () => {
    expect(plan.saleIncludesGst).toBe(true);
    expect(plan.rows[0].basePrice).toBe(10000);
    expect(plan.rows[0].openingStock).toBe(3);
    expect(plan.rows[0].unitName).toBe('Nos');
  });
  it('treats services as no-stock items', () => {
    expect(plan.rows[1].isService).toBe(true);
    expect(plan.rows[1].openingStock).toBe(0);
    expect(plan.rows[1].errors).toEqual([]);
    expect(plan.rows[1].basePrice).toBe(100);
  });
  it('skips invalid GST and duplicate codes', () => {
    expect(plan.rows[2].action).toBe('skip');
    expect(plan.rows[3].action).toBe('skip');
  });
  it('updates existing products by name and never changes their stock', () => {
    expect(plan.rows[4].action).toBe('update');
    expect(plan.rows[4].existingId).toBe('p9');
    expect(plan.rows[4].warnings.join(' ')).toMatch(/stock stays at 4/);
  });
  it('lists new categories and units', () => {
    expect(plan.newCategories.sort()).toEqual(['Pumps', 'Services']);
    expect(plan.newUnits.sort()).toEqual(['Feet', 'Nos']);
  });
});

(hasSheet ? describe : describe.skip)('buildPlan on the real borewell sheet', () => {
  it('plans every row in the sheet with no errors', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readSheet } = require('read-excel-file/node');
    const raw = (await readSheet(SHEET, 'Products')) as unknown[][];
    const header = (raw[0] as unknown[]).map(String);
    const body = raw.slice(1).filter(r => r.some(c => c !== null && c !== ''));
    const col = (name: string) => header.indexOf(name);
    const services = body.filter(r => r[col('Type')] === 'Service').length;
    const verify = body.filter(r => r[col('Verify with CA')] === 'Yes').length;

    const plan = buildPlan(raw, { products: [], categories, units });
    const skipped = plan.rows.filter(r => r.action === 'skip');
    if (skipped.length) console.log(skipped.map(r => `${r.row}: ${r.errors.join('; ')}`));
    expect(plan.rows.length).toBe(body.length);
    expect(plan.counts.skip).toBe(0);
    expect(plan.counts.create).toBe(body.length);
    expect(plan.rows.filter(r => r.isService).length).toBe(services);
    expect(plan.counts.verify).toBe(verify);
    expect(plan.saleIncludesGst).toBe(true);
    expect(plan.rows.some(r => /drilling/i.test(r.name))).toBe(false);
    const pump = plan.rows.find(r => r.itemCode === 'BW-SP-002')!;
    expect(pump.basePrice).toBeCloseTo(12500 / 1.05, 2);
    expect(pump.purchasePrice! < pump.basePrice!).toBe(true);
    console.log('new categories:', plan.newCategories.length, '| new units:', plan.newUnits.join(', '));
    console.log('warnings sample:', Array.from(new Set(plan.rows.flatMap(r => r.warnings))).slice(0, 5));
  });
});

describe('adding stock to existing products', () => {
  const raw = [
    ['Item Code', 'Item Name', 'Opening Stock'],
    ['A-1', 'Pump A', 10],
  ];
  const existing = [{ id: 'p1', name: 'Pump A', itemCode: 'A-1', stockQuantity: 0 } as Product];
  it('does not add stock unless asked', () => {
    const plan = buildPlan(raw, { products: existing, categories, units });
    expect(plan.rows[0].action).toBe('update');
    expect(plan.rows[0].addStock).toBe(0);
    expect(plan.stockForExisting).toBe(1);
  });
  it('adds stock when the option is ticked, and records which columns exist', () => {
    const plan = buildPlan(raw, { products: existing, categories, units }, { addStockToExisting: true });
    expect(plan.rows[0].addStock).toBe(10);
    expect(plan.columns.sort()).toEqual(['code', 'name', 'stock']);
  });
});
