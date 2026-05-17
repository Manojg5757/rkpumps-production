"use client";

import { useState, useEffect } from "react";
import { ProductSearch } from "../../components/billing/ProductSearch";
import { CartPanel } from "../../components/billing/CartPanel";
import { BillSummary } from "../../components/billing/BillSummary";
import { getProducts, getCategories, completeSale, getCustomers, addCustomer } from "../../lib/db";
import { generateBillPDF } from "../../lib/pdf";
import { Product, Category, CartItem, Customer } from "../../types";
import toast from "react-hot-toast";

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Payment State
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, c, custs] = await Promise.all([getProducts(), getCategories(), getCustomers()]);
      setProducts(p);
      setCategories(c);
      setCustomers(custs);
    } catch (error) {
      toast.error("Failed to load data");
    }
  };

  const handleCustomerPhoneChange = (val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setCustomerPhone(cleanVal);
    setShowSuggestions(true);
    
    // Auto match if exactly equal
    const existing = customers.find(c => c.phone === cleanVal);
    if (existing) {
      setSelectedCustomerId(existing.id);
      setCustomerName(existing.name);
      setCustomerGstin(existing.gstin || "");
      setCustomerAddress(existing.address || "");
    } else {
      setSelectedCustomerId(null);
    }
  };

  const selectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setSelectedCustomerId(c.id);
    setCustomerPhone(c.phone);
    setCustomerGstin(c.gstin || "");
    setCustomerAddress(c.address || "");
    setShowSuggestions(false);
    toast.success("Existing customer loaded");
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        toast.error("Already added");
        return prev;
      }
      const gstAmountPerUnit = product.basePrice * (product.gstPercentage / 100);
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitName: product.unitName,
        quantity: 1,
        basePrice: product.basePrice,
        purchasePrice: product.purchasePrice || 0,
        gstPercentage: product.gstPercentage,
        gstAmountPerUnit,
        lineTaxableAmount: product.basePrice,
        lineGSTAmount: gstAmountPerUnit,
        lineTotal: product.basePrice + gstAmountPerUnit
      }];
    });
  };

  const handleSetQuantity = (productId: string, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) newQty = 1;
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        if (product && newQty > product.stockQuantity) {
          toast.error(`Only ${product.stockQuantity} available in stock`);
          newQty = product.stockQuantity;
        }
        return {
          ...item,
          quantity: newQty,
          lineTaxableAmount: item.basePrice * newQty,
          lineGSTAmount: item.gstAmountPerUnit * newQty,
          lineTotal: (item.basePrice + item.gstAmountPerUnit) * newQty
        };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const resetFormSilently = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerGstin("");
    setCustomerAddress("");
    setSelectedCustomerId(null);
    setPaidAmount("");
    setShowSuggestions(false);
  };

  const handleClear = () => {
    if (confirm("Clear the entire cart and customer details?")) {
      resetFormSilently();
    }
  };

  const grandTotal = cart.reduce((sum, item) => sum + item.lineTaxableAmount + item.lineGSTAmount, 0);
  const finalTotal = Math.round(grandTotal);
  const roundOff = finalTotal - grandTotal;

  const handleCompleteSale = async () => {
    if (!customerPhone.trim()) {
      toast.error("Customer phone is required");
      return;
    }
    if (customerPhone.length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    
    // Check if phone already exists for a different user
    if (!selectedCustomerId) {
      const existingPhone = customers.find(c => c.phone === customerPhone);
      if (existingPhone) {
        toast.error("This phone number is already registered. Please select the existing customer.");
        return;
      }
    }
    
    setLoading(true);
    try {
      let finalCustId = selectedCustomerId;
      let finalCustData = {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        gstin: customerGstin.trim() || "",
        address: customerAddress.trim() || ""
      };

      if (!finalCustId) {
        const newCust = await addCustomer(finalCustData);
        finalCustId = newCust.id;
      }

      const finalPaidAmount = paidAmount === "" ? finalTotal : Number(paidAmount);

      const sale = await completeSale(
        cart, 
        finalCustId, 
        finalCustData,
        finalPaidAmount,
        paymentMethod
      );
      
      const pdfBlob = await generateBillPDF(sale);
      const url = URL.createObjectURL(pdfBlob);
      
      const a = document.createElement('a');
      a.href = url;
      const safeName = sale.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${safeName}_${sale.billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      window.open(url, '_blank');
      
      toast.success(`Sale complete — ${sale.billNumber}`);
      resetFormSilently();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete sale");
    } finally {
      setLoading(false);
    }
  };

  const matchingCustomers = customers.filter(c => c.phone.includes(customerPhone) && customerPhone.length > 2);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col h-[calc(100vh-8rem)] min-h-[600px]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Products</h2>
        <ProductSearch products={products} categories={categories} onAdd={handleAddToCart} />
      </div>

      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col h-[calc(100vh-8rem)] min-h-[600px] overflow-y-auto pr-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 relative">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2 flex justify-between">
            <span>Bill To</span>
            {selectedCustomerId && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Existing Customer</span>}
          </h2>
          <div className="space-y-3">
            <div className="relative">
              <input 
                required
                type="text" 
                maxLength={10}
                placeholder="Search Phone Number *" 
                value={customerPhone}
                onChange={e => handleCustomerPhoneChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold tracking-wide"
              />
              {showSuggestions && customerPhone.length > 2 && !selectedCustomerId && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto mt-1">
                  {matchingCustomers.map(c => (
                    <div 
                      key={c.id} 
                      className="p-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                      onClick={() => selectCustomer(c)}
                    >
                      <div className="font-bold text-indigo-700">{c.phone}</div>
                      <div className="text-gray-600 font-medium">{c.name}</div>
                    </div>
                  ))}
                  {matchingCustomers.length === 0 && (
                    <div className="p-2 text-sm text-gray-500 bg-gray-50">No matching phone numbers. A new customer will be created.</div>
                  )}
                </div>
              )}
            </div>
            
            <input 
              required
              type="text" 
              placeholder="Customer Name / Company *" 
              value={customerName}
              onChange={e => {
                setCustomerName(e.target.value);
                if (selectedCustomerId) setSelectedCustomerId(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />

            <input 
              type="text" 
              placeholder="GSTIN (Optional)" 
              value={customerGstin}
              onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm uppercase"
            />
            <input 
              type="text" 
              placeholder="Address (Optional)" 
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Payment Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-gray-600 px-1">
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            {Math.abs(roundOff) >= 0.01 && (
              <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                <span>Round Off</span>
                <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Final Total (Payable)</span>
              <span className="font-bold text-gray-900">₹{finalTotal}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid Now (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  max={finalTotal}
                  placeholder={`Default: ₹${finalTotal}`}
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-green-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>
            </div>

            {paidAmount !== "" && Number(paidAmount) < finalTotal && (
              <div className="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="text-sm font-medium text-amber-800">Pending Balance</span>
                <span className="font-bold text-amber-900">₹{finalTotal - Number(paidAmount)}</span>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Cart</h2>
        <CartPanel cart={cart} onSetQuantity={handleSetQuantity} onRemove={handleRemoveFromCart} />
        
        <BillSummary 
          cart={cart} 
          onClear={handleClear} 
          onComplete={handleCompleteSale} 
          loading={loading} 
          canComplete={customerName.trim().length > 0 && customerPhone.trim().length === 10} 
        />
      </div>
    </div>
  );
}
