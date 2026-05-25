export type Unit = {
  id: string;
  name: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: Date;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  stockQuantity: number;
  basePrice: number; // selling price without GST
  purchasePrice: number; // cost price
  supplierId?: string;
  supplierName?: string;
  gstPercentage: number;
  lowStockThreshold: number;
  updatedAt: Date;
};

export type CartItem = {
  productId: string;
  name: string;
  unitName: string;
  quantity: number;
  basePrice: number;
  purchasePrice: number; // capture at time of sale
  gstPercentage: number;
  gstAmountPerUnit: number;
  lineTaxableAmount: number;
  lineGSTAmount: number;
  lineTotal: number;
};

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export type Sale = {
  id: string;
  billNumber: string;
  date: Date;
  customerId: string;
  customer: {
    name: string;
    phone: string;
    gstin?: string;
    address?: string;
  };
  items: CartItem[];
  totalTaxableAmount: number;
  totalGSTAmount: number;
  grandTotal: number;    // raw sum before rounding
  roundOff?: number;     // finalTotal - grandTotal (positive or negative)
  finalTotal?: number;   // Math.round(grandTotal) — the amount customer actually pays
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
};

export type Payment = {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Bank';
  note?: string;
  createdAt: Date;
};

export type StockEntry = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  unitName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  purchasePrice?: number;
  supplierId?: string;
  invoiceNumber?: string;
  note?: string;
  date: Date;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  note?: string;
  createdAt: Date;
};

export type QuotationItem = {
  productId: string;
  name: string;
  unitName: string;
  quantity: number;
  unitPrice: number;  // basePrice * (1 + gstPercentage/100) — GST baked in, never shown separately
  lineTotal: number;  // unitPrice * quantity
};

export type Quotation = {
  id: string;
  quotationNumber: string;
  date: Date;
  customer: {
    name: string;
    phone?: string;
    address?: string;
  };
  items: QuotationItem[];
  grandTotal: number;
  validDays: number;
};
