import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Supplier, Customer, Payment, Expense, Unit, Category, Product, Sale, StockEntry, CartItem, Quotation, QuotationItem } from '../types';

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
  const docRef = await addDoc(collection(db, 'suppliers'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return { ...data, id: docRef.id, createdAt: new Date() };
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
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return { ...data, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
  const ref = doc(db, 'customers', id);
  await updateDoc(ref, {
    ...data,
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
    const newPaidAmount = (saleData.paidAmount || 0) + data.amount;
    const newPendingAmount = baseTotal - newPaidAmount;
    let status: 'paid' | 'partial' | 'unpaid' = 'partial';
    if (newPendingAmount <= 0) status = 'paid';

    const paymentRef = doc(collection(db, 'payments'));
    transaction.set(paymentRef, { ...data, createdAt: Timestamp.now() });
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

export const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> => {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...data,
    createdAt: Timestamp.now()
  });
  return { ...data, id: docRef.id, createdAt: new Date() };
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
  const docRef = await addDoc(collection(db, 'products'), {
    ...data,
    updatedAt: Timestamp.now()
  });
  return { ...data, id: docRef.id, updatedAt: new Date() };
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  const ref = doc(db, 'products', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now()
  });
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

export const completeSale = async (
  cart: CartItem[], 
  customerId: string,
  customerData: { name: string; phone: string; gstin?: string; address?: string },
  paidAmount: number,
  paymentMethod: 'Cash' | 'UPI' | 'Bank'
): Promise<Sale> => {
  return await runTransaction(db, async (transaction) => {
    // 1. Verify stock
    const productRefs = cart.map(item => doc(db, 'products', item.productId));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
    
    productDocs.forEach((pDoc, index) => {
      if (!pDoc.exists()) throw new Error(`Product ${cart[index].name} not found`);
      const data = pDoc.data() as Product;
      if (data.stockQuantity < cart[index].quantity) {
        throw new Error(`Insufficient stock: ${data.name} (available: ${data.stockQuantity}, requested: ${cart[index].quantity})`);
      }
    });

    // 2. Increment Invoice Number
    const counterRef = doc(db, 'meta', 'counters');
    const counterDoc = await transaction.get(counterRef);
    let lastInvoiceNumber = 0;
    if (counterDoc.exists()) {
      lastInvoiceNumber = counterDoc.data().lastInvoiceNumber || 0;
    }
    const nextInvoiceNumber = lastInvoiceNumber + 1;
    const year = new Date().getFullYear();
    const billNumber = `INV-${year}-${nextInvoiceNumber.toString().padStart(4, '0')}`;

    // Update Counter
    transaction.set(counterRef, { lastInvoiceNumber: nextInvoiceNumber }, { merge: true });

    // 3. Deduct Stock
    cart.forEach((item, index) => {
      const pDoc = productDocs[index];
      const newStock = pDoc.data()!.stockQuantity - item.quantity;
      transaction.update(productRefs[index], { stockQuantity: newStock, updatedAt: Timestamp.now() });
    });

    // 4. Create Sale Record
    const saleRef = doc(collection(db, 'sales'));
    const totalTaxableAmount = cart.reduce((sum, item) => sum + item.lineTaxableAmount, 0);
    const totalGSTAmount = cart.reduce((sum, item) => sum + item.lineGSTAmount, 0);
    const grandTotal = totalTaxableAmount + totalGSTAmount;      // raw, full precision
    const finalTotal = Math.floor(grandTotal);                   // what customer actually pays (always round down)
    const roundOff = finalTotal - grandTotal;                    // always negative (floor truncates)

    const pendingAmount = finalTotal - paidAmount;
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'partial';
    if (pendingAmount <= 0) paymentStatus = 'paid';
    else if (paidAmount === 0) paymentStatus = 'unpaid';

    const saleData = {
      billNumber,
      date: Timestamp.now(),
      customerId,
      customer: customerData,
      items: cart,
      totalTaxableAmount,
      totalGSTAmount,
      grandTotal,
      roundOff,
      finalTotal,
      paidAmount,
      pendingAmount,
      paymentStatus
    };
    
    transaction.set(saleRef, saleData);

    // 5. Stock Entries
    cart.forEach(item => {
      const entryRef = doc(collection(db, 'stockEntries'));
      const pDoc = productDocs.find(p => p.id === item.productId)!.data()!;
      transaction.set(entryRef, {
        productId: item.productId,
        productName: item.name,
        categoryName: pDoc.categoryName,
        unitName: item.unitName,
        type: 'OUT',
        quantity: item.quantity,
        note: `Sale ${billNumber}`,
        date: Timestamp.now()
      });
    });

    // 6. Create Initial Payment Record (if paidAmount > 0)
    if (paidAmount > 0) {
      const paymentRef = doc(collection(db, 'payments'));
      transaction.set(paymentRef, {
        invoiceId: saleRef.id,
        customerId,
        amount: paidAmount,
        method: paymentMethod,
        note: `Initial payment for ${billNumber}`,
        createdAt: Timestamp.now()
      });
    }

    return { id: saleRef.id, ...saleData, date: new Date() } as Sale;
  });
};

// --- Stock Entries ---
export const getStockEntries = async (filters?: { productId?: string; type?: 'IN' | 'OUT'; fromDate?: Date; toDate?: Date }): Promise<StockEntry[]> => {
  let q = query(collection(db, 'stockEntries'), orderBy('date', 'desc'));
  
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
      newStock += entry.quantity;
    } else {
      newStock -= entry.quantity;
      if (newStock < 0) throw new Error('Stock cannot go below 0');
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
  validDays: number
): Promise<Quotation> => {
  return await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, 'meta', 'counters');
    const counterDoc = await transaction.get(counterRef);
    const lastNum = counterDoc.exists() ? (counterDoc.data().lastQuotationNumber || 0) : 0;
    const nextNum = lastNum + 1;
    const year = new Date().getFullYear();
    const quotationNumber = `QT-${year}-${nextNum.toString().padStart(4, '0')}`;

    transaction.set(counterRef, { lastQuotationNumber: nextNum }, { merge: true });

    const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const quotRef = doc(collection(db, 'quotations'));

    const data = {
      quotationNumber,
      date: Timestamp.now(),
      customer,
      items,
      grandTotal,
      validDays,
    };

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
