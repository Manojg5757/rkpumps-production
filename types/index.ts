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
  gstin?: string;
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
  hsnCode?: string;
  itemCode?: string;      // your own code / SKU, e.g. BW-SP-001
  isService?: boolean;    // labour / service item — billed without stock
  updatedAt: Date;
};

export type CartItem = {
  productId: string;      // product id, or "svc-…" for service / labour lines
  name: string;
  unitName: string;
  quantity: number;
  basePrice: number;      // rate per unit excl. GST (before discount)
  purchasePrice: number;  // cost captured at time of sale
  gstPercentage: number;
  gstAmountPerUnit: number;
  lineTaxableAmount: number;
  lineGSTAmount: number;
  lineTotal: number;
  hsnCode?: string;
  discountPercent?: number;
  isService?: boolean;    // labour / service charge — no stock movement
};

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank' | 'Cheque';

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
  roundOff?: number;     // finalTotal - grandTotal
  finalTotal?: number;   // amount customer actually pays
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  isInterState?: boolean;   // IGST instead of CGST+SGST
  placeOfSupply?: string;   // e.g. "33-Tamil Nadu"
  notes?: string;
  quotationId?: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
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
  unitPrice: number;  // price incl. GST — GST is never shown separately on a quotation
  lineTotal: number;  // unitPrice * quantity
  isService?: boolean;
  gstPercentage?: number; // remembered so the quote can be converted to an invoice
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
  notes?: string;
  status?: 'open' | 'converted';
  convertedInvoiceId?: string;
  convertedBillNumber?: string;
};

export type BusinessSettings = {
  name: string;
  address1: string;
  address2: string;
  phone: string;
  email: string;
  gstin: string;
  stateCode: string;      // 2-digit GST state code, e.g. "33"
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  invoiceTerms: string;   // one term per line
  quotationTerms: string; // one term per line
};
