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
import { Unit, Category, Product, Sale, StockEntry, CartItem, CustomerInfo } from '../types';

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

export const completeSale = async (cart: CartItem[], customer: CustomerInfo): Promise<Sale> => {
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
    const grandTotal = totalTaxableAmount + totalGSTAmount;
    
    const saleData = {
      billNumber,
      date: Timestamp.now(),
      customer,
      items: cart,
      totalTaxableAmount,
      totalGSTAmount,
      grandTotal
    };
    
    transaction.set(saleRef, saleData);

    // 5. Stock Entries
    cart.forEach(item => {
      const entryRef = doc(collection(db, 'stockEntries'));
      const pDoc = productDocs.find(p => p.id === item.productId)!.data()!;
      transaction.set(entryRef, {
        productId: item.productId,
        productName: item.name,
        categoryName: pDoc.categoryId, // Ideally denormalized name
        unitName: item.unitName,
        type: 'OUT',
        quantity: item.quantity,
        note: `Sale ${billNumber}`,
        date: Timestamp.now()
      });
    });

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

export const addStockEntry = async (entry: Omit<StockEntry, 'id'>): Promise<StockEntry> => {
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

    transaction.update(productRef, { stockQuantity: newStock, updatedAt: Timestamp.now() });

    const entryRef = doc(collection(db, 'stockEntries'));
    const entryData = { ...entry, date: Timestamp.now() };
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
