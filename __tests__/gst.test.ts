import { cartTotals, computeLine, lineFromProduct, serviceLine, saleTotal, saleProfit } from '../lib/gst';
import { stateFromGstin } from '../lib/states';
import { Product, Sale } from '../types';

const product: Product = {
  id: 'p1', name: '1 HP Pump', categoryId: 'c', categoryName: 'Pumps', unitId: 'u', unitName: 'Piece',
  stockQuantity: 5, basePrice: 1000, purchasePrice: 800, gstPercentage: 18, lowStockThreshold: 1, hsnCode: '8413', updatedAt: new Date(),
};

describe('GST calculations', () => {
  it('computes a product line with GST', () => {
    const l = lineFromProduct(product, 2);
    expect(l.lineTaxableAmount).toBe(2000);
    expect(l.lineGSTAmount).toBe(360);
    expect(l.lineTotal).toBe(2360);
    expect(l.hsnCode).toBe('8413');
  });

  it('applies line discount before GST', () => {
    const l = computeLine({ ...lineFromProduct(product, 1), discountPercent: 10 });
    expect(l.lineTaxableAmount).toBe(900);
    expect(l.lineGSTAmount).toBe(162);
    expect(l.lineTotal).toBe(1062);
  });

  it('supports decimal quantities (pipes / cable in metres)', () => {
    const l = lineFromProduct({ ...product, basePrice: 120, gstPercentage: 18 }, 12.5);
    expect(l.lineTaxableAmount).toBe(1500);
    expect(l.lineTotal).toBe(1770);
  });

  it('service lines carry no cost and are flagged', () => {
    const s = serviceLine('Pump lowering', 1000, 18);
    expect(s.isService).toBe(true);
    expect(s.purchasePrice).toBe(0);
    expect(s.lineTotal).toBe(1180);
  });

  it('rounds the invoice total down to the rupee', () => {
    const items = [lineFromProduct({ ...product, basePrice: 99.99 }, 1)];
    const t = cartTotals(items);
    expect(t.grandTotal).toBeCloseTo(117.99, 2);
    expect(t.finalTotal).toBe(117);
    expect(t.roundOff).toBeCloseTo(-0.99, 2);
  });

  it('profit excludes service lines from cost', () => {
    const sale = {
      items: [lineFromProduct(product, 1), serviceLine('Labour', 500, 18)],
      totalTaxableAmount: 1500, grandTotal: 1770, finalTotal: 1770,
    } as unknown as Sale;
    expect(saleProfit(sale)).toBe(700);
    expect(saleTotal(sale)).toBe(1770);
  });

  it('legacy invoices without finalTotal fall back to floored grandTotal', () => {
    expect(saleTotal({ grandTotal: 1500.75 } as Sale)).toBe(1500);
  });

  it('reads the state code from a GSTIN', () => {
    expect(stateFromGstin('33ABCDE1234F1Z5')).toBe('33');
    expect(stateFromGstin('29ABCDE1234F1Z5')).toBe('29');
    expect(stateFromGstin('')).toBe('');
  });
});

describe('GST-inclusive prices stay exact', () => {
  it('₹120 incl 18% bills as ₹120.00, not ₹119.99', () => {
    const { round4 } = jest.requireActual('../lib/gst');
    const base = round4(120 / 1.18);
    const l = lineFromProduct({ ...product, basePrice: base, gstPercentage: 18 }, 1);
    expect(l.lineTotal).toBe(120);
    const l10 = lineFromProduct({ ...product, basePrice: round4(6000 / 1.18), gstPercentage: 18 }, 1);
    expect(l10.lineTotal).toBe(6000);
  });
});
