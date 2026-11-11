import { CartItem, Product, Sale } from '../types';

export const GST_RATES = [0, 5, 12, 18, 28];

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const round4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

/** Rounding rule used for every invoice / quotation total: always round down to the rupee. */
export const roundTotal = (n: number) => Math.floor(round2(n));

/** Recalculate the derived amounts of a cart line. */
export function computeLine(item: CartItem): CartItem {
  const qty = round3(item.quantity);
  const disc = Math.min(Math.max(item.discountPercent || 0, 0), 100);
  const netRate = item.basePrice * (1 - disc / 100);
  const gstPerUnit = netRate * (item.gstPercentage / 100);
  const lineTaxableAmount = round2(netRate * qty);
  const lineGSTAmount = round2(gstPerUnit * qty);
  return {
    ...item,
    quantity: qty,
    discountPercent: disc || undefined,
    gstAmountPerUnit: gstPerUnit,
    lineTaxableAmount,
    lineGSTAmount,
    lineTotal: round2(lineTaxableAmount + lineGSTAmount),
  };
}

export function lineFromProduct(p: Product, quantity = 1): CartItem {
  return computeLine({
    productId: p.id,
    name: p.name,
    unitName: p.unitName,
    quantity,
    basePrice: p.basePrice,
    purchasePrice: p.purchasePrice || 0,
    gstPercentage: p.gstPercentage,
    gstAmountPerUnit: 0,
    lineTaxableAmount: 0,
    lineGSTAmount: 0,
    lineTotal: 0,
    hsnCode: p.hsnCode || undefined,
    isService: p.isService || undefined,
  });
}

/** Stock-tracked product (not a service). */
export const tracksStock = (p: Pick<Product, 'isService'>) => !p.isService;

export function serviceLine(name: string, rateExclGst: number, gst: number, qty = 1, sac?: string, unitName = 'Job'): CartItem {
  return computeLine({
    productId: `svc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    unitName,
    quantity: qty,
    basePrice: rateExclGst,
    purchasePrice: 0,
    gstPercentage: gst,
    gstAmountPerUnit: 0,
    lineTaxableAmount: 0,
    lineGSTAmount: 0,
    lineTotal: 0,
    hsnCode: sac || undefined,
    isService: true,
  });
}

export function cartTotals(items: CartItem[]) {
  const taxable = round2(items.reduce((s, i) => s + i.lineTaxableAmount, 0));
  const gst = round2(items.reduce((s, i) => s + i.lineGSTAmount, 0));
  const grandTotal = round2(taxable + gst);
  const finalTotal = roundTotal(grandTotal);
  const roundOff = round2(finalTotal - grandTotal);
  return { taxable, gst, grandTotal, finalTotal, roundOff };
}

/** The amount the customer owes for an invoice (handles legacy records without finalTotal). */
export const saleTotal = (s: Sale) => s.finalTotal ?? Math.floor(s.grandTotal);

/** Cost of goods for a sale (service lines have no cost). */
export const saleCost = (s: Sale) =>
  s.items.reduce((sum, it) => sum + (it.isService ? 0 : (it.purchasePrice || 0) * it.quantity), 0);

/** Gross profit on a sale = taxable value − cost of goods. */
export const saleProfit = (s: Sale) => s.totalTaxableAmount - saleCost(s);

/** GST split for display: { cgst, sgst, igst } */
export function gstSplit(gstAmount: number, interState?: boolean) {
  if (interState) return { cgst: 0, sgst: 0, igst: gstAmount };
  return { cgst: gstAmount / 2, sgst: gstAmount / 2, igst: 0 };
}

/** Days between a date and now. */
export const daysSince = (d: Date) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
