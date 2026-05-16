export type Unit = {
  id: string;
  name: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  stockQuantity: number;
  basePrice: number;
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
  gstPercentage: number;
  gstAmountPerUnit: number;
  lineTaxableAmount: number;
  lineGSTAmount: number;
  lineTotal: number;
};

export type CustomerInfo = {
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
};

export type Sale = {
  id: string;
  billNumber: string;
  date: Date;
  customer: CustomerInfo;
  items: CartItem[];
  totalTaxableAmount: number;
  totalGSTAmount: number;
  grandTotal: number;
};

export type StockEntry = {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  unitName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  note?: string;
  date: Date;
};
