import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Supplier, Customer, Payment, Expense, Unit, Category, Product, Sale, StockEntry, CartItem, Quotation, QuotationItem, PaymentMethod } from '../types';
import { cartTotals, round2, round3 } from './gst';

/** Firestore rejects `undefined` values — strip them (deeply) before writing. */
export function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(v => clean(v)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

// --- Suppliers ---
export const getSuppliers = async (): Promise<Supplier[]> => {
  const q = query(collection(db, 'suppliers'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, createdAt: data.createdAt?.toDate() } as Supplier;
  });
};

export const addSupplier = async (data: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> => {
  const docRef = await addDoc(collection(db, 'suppliers'), clean({
    ...data,
    createdAt: Timestamp.now()
  }));
  return { ...data, id: docRef.id, createdAt: new Date() };
};

export const updateSupplier = async (id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Promise<void> => {
  await updateDoc(doc(db, 'suppliers', id), clean(data));
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'suppliers', id));
};

// --- Customers ---
export const getCustomers = async (): Promise<Customer[]> => {
  const q = query(collection(db, 'customers'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, createdAt: data.createdAt?.toDate(), updatedAt: data.updatedAt?.toDate() } as Customer;
  });
};

export const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
  const docRef = await addDoc(collection(db, 'customers'), {
    ...clean(data),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { ...data, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
  const ref = doc(db, 'customers', id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _omit, createdAt: _c, ...rest } = data;
  await updateDoc(ref, {
    ...clean(rest),
    updatedAt: Timestamp.now()
  });
};

// --- Payments ---
export const getPayments = async (customerId?: string): Promise<Payment[]> => {
  // Always fetch all payments and filter client-side to avoid composite index requirements
  const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  let results = snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, createdAt: data.createdAt?.toDate() } as Payment;
  });
  if (customerId) {
    results = results.filter(p => p.customerId === customerId);
  }
  return results;
};

export const addPayment = async (data: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> => {
  return await runTransaction(db, async (transaction) => {
    // ALL READS FIRST (Firestore requirement)
    const saleRef = doc(db, 'sales', data.invoiceId);
    const saleDoc = await transaction.get(saleRef);
    if (!saleDoc.exists()) throw new Error('Invoice not found');

    // THEN WRITES
    const saleData = saleDoc.data() as Sale;
    // Use finalTotal for new invoices; fall back to grandTotal for legacy records
    const baseTotal = saleData.finalTotal ?? Math.floor(saleData.grandTotal);
    const currentPending = round2(baseTotal - (saleData.paidAmount || 0));
    if (data.amount <= 0) throw new Error('Enter a valid amount');
    if (round2(data.amount) > currentPending + 0.001) {
      throw new Error(`Amount is more than the pending balance of ₹${currentPending}`);
    }
    const newPaidAmount = round2((saleData.paidAmount || 0) + data.amount);
    const newPendingAmount = Math.max(0, round2(baseTotal - newPaidAmount));
    let status: 'paid' | 'partial' | 'unpaid' = 'partial';
    if (newPendingAmount <= 0) status = 'paid';

    const paymentRef = doc(collection(db, 'payments'));
    transaction.set(paymentRef, clean({ ...data, createdAt: Timestamp.now() }));
    transaction.update(saleRef, {
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      paymentStatus: status
    });

    return { id: paymentRef.id, ...data, createdAt: new Date() } as Payment;
  });
};

// --- Expenses ---
export const getExpenses = async (): Promise<Expense[]> => {
  const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, createdAt: data.createdAt?.toDate() } as Expense;
  });
};

export const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>, date?: Date): Promise<Expense> => {
  const when = date ?? new Date();
  const docRef = await addDoc(collection(db, 'expenses'), clean({
    ...data,
    createdAt: Timestamp.fromDate(when)
  }));
  return { ...data, id: docRef.id, createdAt: when };
};

export const deleteExpense = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', id));
};

// --- Units ---
export const getUnits = async (): Promise<Unit[]> => {
  const q = query(collection(db, 'units'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Unit));
};

export const addUnit = async (name: string): Promise<Unit> => {
  const docRef = await addDoc(collection(db, 'units'), { name });
  return { id: docRef.id, name };
};

export const deleteUnit = async (id: string): Promise<void> => {
  const q = query(collection(db, 'products'), where('unitId', '==', id));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error('Cannot delete unit because it is used by one or more products.');
  }
  await deleteDoc(doc(db, 'units', id));
};

// --- Categories ---
export const getCategories = async (): Promise<Category[]> => {
  const q = query(collection(db, 'categories'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
};

export const addCategory = async (name: string): Promise<Category> => {
  const docRef = await addDoc(collection(db, 'categories'), { name });
  return { id: docRef.id, name };
};

export const deleteCategory = async (id: string): Promise<void> => {
  const q = query(collection(db, 'products'), where('categoryId', '==', id));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error(`${snap.size} products are assigned to this category. Please reassign them before deleting.`);
  }
  await deleteDoc(doc(db, 'categories', id));
};

// --- Products ---
export const getProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, 'products'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, updatedAt: data.updatedAt?.toDate() } as Product;
  });
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  const q = query(collection(db, 'products'), where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, updatedAt: data.updatedAt?.toDate() } as Product;
  });
};

export const addProduct = async (data: Omit<Product, 'id' | 'updatedAt'>): Promise<Product> => {
  const docRef = await addDoc(collection(db, 'products'), clean({
    ...data,
    updatedAt: Timestamp.now()
  }));
  return { ...data, id: docRef.id, updatedAt: new Date() };
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  const ref = doc(db, 'products', id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _omit, updatedAt: _u, ...rest } = data;
  await updateDoc(ref, clean({
    ...rest,
    updatedAt: Timestamp.now()
  }));
};

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'products', id));
};

export const getLowStockProducts = async (): Promise<Product[]> => {
  const products = await getProducts();
  return products.filter(p => p.stockQuantity <= p.lowStockThreshold);
};

// --- Sales ---
export const getSales = async (limitCount?: number): Promise<Sale[]> => {
  let q = query(collection(db, 'sales'), orderBy('date', 'desc'));
  if (limitCount) {
    q = query(collection(db, 'sales'), orderBy('date', 'desc'), limit(limitCount));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, date: data.date?.toDate() } as Sale;
  });
};

export const searchSales = async (qParams: { customerName?: string; customerGstin?: string; billNumber?: string; fromDate?: Date; toDate?: Date }): Promise<Sale[]> => {
  // In a real implementation with limited Firestore indexing, we fetch a date range and filter on the client.
  let q = query(collection(db, 'sales'), orderBy('date', 'desc'));
  if (qParams.fromDate && qParams.toDate) {
    q = query(collection(db, 'sales'), where('date', '>=', Timestamp.fromDate(qParams.fromDate)), where('date', '<=', Timestamp.fromDate(qParams.toDate)), orderBy('date', 'desc'));
  }
  const snap = await getDocs(q);
  let results = snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, date: data.date?.toDate() } as Sale;
  });

  if (qParams.customerName) {
    const search = qParams.customerName.toLowerCase();
    results = results.filter(r => r.customer.name.toLowerCase().includes(search));
  }
  if (qParams.customerGstin) {
    const search = qParams.customerGstin.toLowerCase();
    results = results.filter(r => r.customer.gstin?.toLowerCase().includes(search));
  }
  if (qParams.billNumber) {
    const search = qParams.billNumber.toLowerCase();
    results = results.filter(r => r.billNumber.toLowerCase().includes(search));
  }
  
  return results;
};

export const getSaleById = async (id: string): Promise<Sale> => {
  const d = await getDoc(doc(db, 'sales', id));
  if (!d.exists()) throw new Error('Sale not found');
  const data = d.data();
  return { ...data, id: d.id, date: data.date?.toDate() } as Sale;
};

export const getSalesByCustomer = async (customerId: string): Promise<Sale[]> => {
  const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => {
      const data = d.data();
      return { ...data, id: d.id, date: data.date?.toDate() } as Sale;
    })
    .filter(s => s.customerId === customerId);
};

export const getPendingSales = async (): Promise<Sale[]> => {
  const q = query(collection(db, 'sales'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => {
      const data = d.data();
      return { ...data, id: d.id, date: data.date?.toDate() } as Sale;
    })
    .filter(s => s.paymentStatus === 'partial' || s.paymentStatus === 'unpaid');
};

export type SaleOptions = {
  date?: Date;              // invoice date (defaults to now)
  isInterState?: boolean;   // IGST instead of CGST + SGST
  placeOfSupply?: string;
  notes?: string;
  quotationId?: string;     // mark this quotation as converted
};

export const completeSale = async (
  cart: CartItem[],
  customerId: string,
  customerData: { name: string; phone: string; gstin?: string; address?: string },
  paidAmount: number,
  paymentMethod: PaymentMethod,
  opts: SaleOptions = {}
): Promise<Sale> => {
  if (cart.length === 0) throw new Error('Add at least one item');
  return await runTransaction(db, async (transaction) => {
    // ── ALL READS FIRST (Firestore requirement) ──
    const stockItems = cart.filter(i => !i.isService);
    const productRefs = stockItems.map(item => doc(db, 'products', item.productId));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

    productDocs.forEach((pDoc, index) => {
      if (!pDoc.exists()) throw new Error(`Product ${stockItems[index].name} not found`);
      const data = pDoc.data() as Product;
      if (round3(data.stockQuantity) < round3(stockItems[index].quantity)) {
        throw new Error(`Not enough stock: ${data.name} (available ${data.stockQuantity}, needed ${stockItems[index].quantity})`);
      }
    });

    const counterRef = doc(db, 'meta', 'counters');
    const counterDoc = await transaction.get(counterRef);

    // ── WRITES ──
    const lastInvoiceNumber = counterDoc.exists() ? (counterDoc.data().lastInvoiceNumber || 0) : 0;
    const nextInvoiceNumber = lastInvoiceNumber + 1;
    const invoiceDate = opts.date ?? new Date();
    const year = invoiceDate.getFullYear();
    const billNumber = `INV-${year}-${nextInvoiceNumber.toString().padStart(4, '0')}`;
    transaction.set(counterRef, { lastInvoiceNumber: nextInvoiceNumber }, { merge: true });

    stockItems.forEach((item, index) => {
      const newStock = round3(productDocs[index].data()!.stockQuantity - item.quantity);
      transaction.update(productRefs[index], { stockQuantity: newStock, updatedAt: Timestamp.now() });
    });

    const saleRef = doc(collection(db, 'sales'));
    const { taxable, gst, grandTotal, finalTotal, roundOff } = cartTotals(cart);

    const paid = Math.min(Math.max(round2(paidAmount), 0), finalTotal);
    const pendingAmount = round2(finalTotal - paid);
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'partial';
    if (pendingAmount <= 0) paymentStatus = 'paid';
    else if (paid === 0) paymentStatus = 'unpaid';

    const saleData = clean({
      billNumber,
      date: Timestamp.fromDate(invoiceDate),
      customerId,
      customer: customerData,
      items: cart,
      totalTaxableAmount: taxable,
      totalGSTAmount: gst,
      grandTotal,
      roundOff,
      finalTotal,
      paidAmount: paid,
      pendingAmount,
      paymentStatus,
      isInterState: !!opts.isInterState,
      placeOfSupply: opts.placeOfSupply || undefined,
      notes: opts.notes?.trim() || undefined,
      quotationId: opts.quotationId || undefined,
    });

    transaction.set(saleRef, saleData);

    stockItems.forEach((item, index) => {
      const entryRef = doc(collection(db, 'stockEntries'));
      transaction.set(entryRef, {
        productId: item.productId,
        productName: item.name,
        categoryName: productDocs[index].data()!.categoryName || '',
        unitName: item.unitName,
        type: 'OUT',
        quantity: item.quantity,
        note: `Sale ${billNumber}`,
        date: Timestamp.now()
      });
    });

    if (paid > 0) {
      const paymentRef = doc(collection(db, 'payments'));
      transaction.set(paymentRef, {
        invoiceId: saleRef.id,
        customerId,
        amount: paid,
        method: paymentMethod,
        note: `Paid at billing — ${billNumber}`,
        createdAt: Timestamp.now()
      });
    }

    if (opts.quotationId) {
      transaction.set(doc(db, 'quotations', opts.quotationId), {
        status: 'converted',
        convertedInvoiceId: saleRef.id,
        convertedBillNumber: billNumber,
      }, { merge: true });
    }

    return { ...saleData, id: saleRef.id, date: invoiceDate } as unknown as Sale;
  });
};

// --- Stock Entries ---
export const getStockEntries = async (filters?: { productId?: string; type?: 'IN' | 'OUT'; fromDate?: Date; toDate?: Date }): Promise<StockEntry[]> => {
  const q = query(collection(db, 'stockEntries'), orderBy('date', 'desc'));
  
  // Note: Client-side filtering for simplicity in this implementation
  const snap = await getDocs(q);
  let results = snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, date: data.date?.toDate() } as StockEntry;
  });

  if (filters) {
    if (filters.productId) results = results.filter(r => r.productId === filters.productId);
    if (filters.type) results = results.filter(r => r.type === filters.type);
    if (filters.fromDate) results = results.filter(r => r.date >= filters.fromDate!);
    if (filters.toDate) results = results.filter(r => r.date <= filters.toDate!);
  }

  return results;
};

export const addStockEntry = async (entry: Omit<StockEntry, 'id'>, newBasePrice?: number): Promise<StockEntry> => {
  return await runTransaction(db, async (transaction) => {
    const productRef = doc(db, 'products', entry.productId);
    const pDoc = await transaction.get(productRef);
    if (!pDoc.exists()) throw new Error('Product not found');

    const pData = pDoc.data() as Product;
    let newStock = pData.stockQuantity;

    if (entry.type === 'IN') {
      newStock = round3(newStock + entry.quantity);
    } else {
      newStock = round3(newStock - entry.quantity);
      if (newStock < 0) throw new Error(`Stock cannot go below 0 (available ${pData.stockQuantity})`);
    }

    const productUpdate: Record<string, unknown> = { stockQuantity: newStock, updatedAt: Timestamp.now() };
    if (entry.type === 'IN' && entry.purchasePrice && entry.purchasePrice > 0) {
      productUpdate.purchasePrice = entry.purchasePrice;
    }
    if (entry.type === 'IN' && newBasePrice && newBasePrice > 0) {
      productUpdate.basePrice = newBasePrice;
    }
    transaction.update(productRef, productUpdate);

    const entryRef = doc(collection(db, 'stockEntries'));
    const entryData = Object.fromEntries(
      Object.entries({ ...entry, date: Timestamp.now() }).filter(([, v]) => v !== undefined)
    );
    transaction.set(entryRef, entryData);

    return { id: entryRef.id, ...entry } as StockEntry;
  });
};

// --- Invoice Numbering ---
export const getNextInvoiceNumber = async (): Promise<string> => {
  // Read-only logic, the real increment happens in completeSale transaction
  const counterDoc = await getDoc(doc(db, 'meta', 'counters'));
  const lastInvoiceNumber = counterDoc.exists() ? (counterDoc.data().lastInvoiceNumber || 0) : 0;
  const nextInvoiceNumber = lastInvoiceNumber + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${nextInvoiceNumber.toString().padStart(4, '0')}`;
};

// --- Quotations ---
export const saveQuotation = async (
  items: QuotationItem[],
  customer: { name: string; phone?: string; address?: string },
  validDays: number,
  notes?: string
): Promise<Quotation> => {
  return await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'meta', 'counters');
    const counterDoc = await transaction.get(counterRef);
    const lastNum = counterDoc.exists() ? (counterDoc.data().lastQuotationNumber || 0) : 0;
    const nextNum = lastNum + 1;
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${nextNum.toString().padStart(4, '0')}`;

    transaction.set(counterRef, { lastQuotationNumber: nextNum }, { merge: true });

    const grandTotal = Math.floor(round2(items.reduce((sum, item) => sum + item.lineTotal, 0)));
    const quotRef = doc(collection(db, 'quotations'));

    // Strip undefined fields — Firestore rejects undefined values
    const cleanCustomer: { name: string; phone?: string; address?: string } = { name: customer.name };
    if (customer.phone) cleanCustomer.phone = customer.phone;
    if (customer.address) cleanCustomer.address = customer.address;

    const data = clean({
      quotationNumber,
      date: Timestamp.now(),
      customer: cleanCustomer,
      items,
      grandTotal,
      validDays,
      notes: notes?.trim() || undefined,
      status: 'open' as const,
    });

    transaction.set(quotRef, data);
    return { id: quotRef.id, ...data, date: new Date() } as Quotation;
  });
};

export const getQuotations = async (): Promise<Quotation[]> => {
  const q = query(collection(db, 'quotations'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { ...data, id: d.id, date: data.date?.toDate() } as Quotation;
  });
};

export const getQuotationById = async (id: string): Promise<Quotation> => {
  const d = await getDoc(doc(db, 'quotations', id));
  if (!d.exists()) throw new Error('Quotation not found');
  const data = d.data();
  return { ...data, id: d.id, date: data.date?.toDate() } as Quotation;
};

// --- Bulk product import ---
export type ImportRow = {
  name: string; itemCode: string; categoryName: string; unitName: string; hsnCode: string;
  gstPercentage: number; isService: boolean; basePrice?: number; purchasePrice?: number;
  openingStock: number; lowStockThreshold?: number; existingId?: string; action: 'create' | 'update' | 'skip';
  addStock?: number;
};

/**
 * Create missing categories/units, then write products in batches.
 * New products get their opening stock recorded as a Stock-in entry.
 * Existing products are updated (stock is never changed; empty prices keep the current price).
 */
export const importProducts = async (
  rows: ImportRow[],
  existing: { categories: Category[]; units: Unit[] },
  onProgress?: (done: number, total: number) => void,
  columns?: string[] // columns present in the file — updates only touch these
): Promise<{ created: number; updated: number; categoriesAdded: number; unitsAdded: number; stockAdded: number }> => {
  const has = (k: string) => !columns || columns.includes(k);
  const todo = rows.filter(r => r.action !== 'skip');
  const cats = new Map(existing.categories.map(c => [c.name.trim().toLowerCase(), c]));
  const units = new Map(existing.units.map(u => [u.name.trim().toLowerCase(), u]));
  let categoriesAdded = 0, unitsAdded = 0;

  for (const r of todo) {
    const isUpd = r.action === 'update';
    const ck = r.categoryName.toLowerCase();
    if ((!isUpd || has('category')) && !cats.has(ck)) { cats.set(ck, await addCategory(r.categoryName)); categoriesAdded++; }
    const uk = r.unitName.toLowerCase();
    if ((!isUpd || has('unit')) && !units.has(uk)) { units.set(uk, await addUnit(r.unitName)); unitsAdded++; }
  }

  const CHUNK = 200; // ≤ 2 writes per row → stays under Firestore's 500-write batch limit
  let created = 0, updated = 0, stockAdded = 0;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    for (const r of todo.slice(i, i + CHUNK)) {
      const cat = cats.get(r.categoryName.toLowerCase()) ?? { id: '', name: '' };
      const unit = units.get(r.unitName.toLowerCase()) ?? { id: '', name: '' };
      const common = clean({
        name: r.name,
        itemCode: r.itemCode || undefined,
        categoryId: cat.id,
        categoryName: cat.name,
        unitId: unit.id,
        unitName: unit.name,
        hsnCode: r.hsnCode || undefined,
        gstPercentage: r.gstPercentage,
        isService: r.isService,
        basePrice: r.basePrice,
        purchasePrice: r.purchasePrice,
        lowStockThreshold: r.lowStockThreshold,
        updatedAt: now,
      });
      if (r.action === 'update' && r.existingId) {
        // only change what the file actually contains
        const upd: Record<string, unknown> = { name: r.name, updatedAt: now };
        if (has('code') && r.itemCode) upd.itemCode = r.itemCode;
        if (has('category') && cat.id) { upd.categoryId = cat.id; upd.categoryName = cat.name; }
        if (has('unit') && unit.id) { upd.unitId = unit.id; upd.unitName = unit.name; }
        if (has('hsn') && r.hsnCode) upd.hsnCode = r.hsnCode;
        if (has('gst')) upd.gstPercentage = r.gstPercentage;
        if (has('type')) upd.isService = r.isService;
        if (r.basePrice !== undefined) upd.basePrice = r.basePrice;
        if (r.purchasePrice !== undefined) upd.purchasePrice = r.purchasePrice;
        if (has('low') && r.lowStockThreshold !== undefined) upd.lowStockThreshold = r.lowStockThreshold;
        if (r.addStock && r.addStock > 0 && !r.isService) {
          upd.stockQuantity = increment(r.addStock);
          batch.set(doc(collection(db, 'stockEntries')), clean({
            productId: r.existingId,
            productName: r.name,
            categoryName: cat.name,
            unitName: unit.name,
            type: 'IN',
            quantity: r.addStock,
            purchasePrice: r.purchasePrice || 0,
            note: 'Stock added (import)',
            date: now,
          }));
          stockAdded++;
        }
        batch.update(doc(db, 'products', r.existingId), upd);
        updated++;
      } else {
        const ref = doc(collection(db, 'products'));
        batch.set(ref, {
          ...common,
          basePrice: r.basePrice ?? 0,
          purchasePrice: r.purchasePrice ?? 0,
          lowStockThreshold: r.lowStockThreshold ?? (r.isService ? 0 : 2),
          supplierId: '',
          supplierName: '',
          stockQuantity: r.isService ? 0 : r.openingStock,
        });
        if (!r.isService && r.openingStock > 0) {
          batch.set(doc(collection(db, 'stockEntries')), clean({
            productId: ref.id,
            productName: r.name,
            categoryName: cat.name,
            unitName: unit.name,
            type: 'IN',
            quantity: r.openingStock,
            purchasePrice: r.purchasePrice || 0,
            note: 'Opening stock (imported)',
            date: now,
          }));
        }
        created++;
      }
    }
    await batch.commit();
    onProgress?.(Math.min(i + CHUNK, todo.length), todo.length);
  }
  return { created, updated, categoriesAdded, unitsAdded, stockAdded };
};

export const deleteQuotation = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'quotations', id));
};

// --- Backup ---
export const exportAllData = async (): Promise<Record<string, unknown[]>> => {
  const names = ['products', 'categories', 'units', 'customers', 'suppliers', 'sales', 'payments', 'stockEntries', 'expenses', 'quotations', 'meta'];
  const out: Record<string, unknown[]> = {};
  for (const name of names) {
    const snap = await getDocs(collection(db, name));
    out[name] = snap.docs.map(d => {
      const data = d.data();
      const conv: Record<string, unknown> = { id: d.id };
      for (const [k, v] of Object.entries(data)) conv[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
      return conv;
    });
  }
  return out;
};

// --- Seeding ---
export const seedDefaultData = async (): Promise<void> => {
  const unitsSnap = await getDocs(query(collection(db, 'units'), limit(1)));
  const categoriesSnap = await getDocs(query(collection(db, 'categories'), limit(1)));

  if (unitsSnap.empty) {
    const defaultUnits = ['Piece', 'Set', 'Meter', 'Kg', 'Box', 'Pair', 'Roll', 'Litre'];
    for (const name of defaultUnits) {
      await addDoc(collection(db, 'units'), { name });
    }
  }

  if (categoriesSnap.empty) {
    const defaultCategories = ['Fasteners', 'Motor Parts', 'Wiring & Cable', 'Seals & Gaskets', 'Bearings', 'Capacitors', 'Miscellaneous'];
    for (const name of defaultCategories) {
      await addDoc(collection(db, 'categories'), { name });
    }
  }
};
