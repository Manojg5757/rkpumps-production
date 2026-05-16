"use client";

import { useState, useEffect } from "react";
import { ProductSearch } from "../../components/billing/ProductSearch";
import { CartPanel } from "../../components/billing/CartPanel";
import { BillSummary } from "../../components/billing/BillSummary";
import { getProducts, getCategories, completeSale } from "../../lib/db";
import { generateBillPDF } from "../../lib/pdf";
import { Product, Category, CartItem, CustomerInfo } from "../../types";
import toast from "react-hot-toast";

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", phone: "", gstin: "", address: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (error) {
      toast.error("Failed to load products");
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        toast((t) => (
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">Already added</span>
            <button 
              onClick={() => {
                handleRemoveFromCart(product.id);
                toast.dismiss(t.id);
                toast.success("Removed from cart");
              }}
              className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium hover:bg-red-200"
            >
              Remove
            </button>
          </div>
        ), { duration: 4000 });
        return prev;
      }

      const gstAmountPerUnit = product.basePrice * (product.gstPercentage / 100);
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitName: product.unitName,
        quantity: 1,
        basePrice: product.basePrice,
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
    
    setCart(prev => {
      return prev.map(item => {
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
      });
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const handleClear = () => {
    if (confirm("Clear the entire cart and customer details?")) {
      setCart([]);
      setCustomer({ name: "", phone: "", gstin: "", address: "" });
    }
  };

  const handleCompleteSale = async () => {
    if (!customer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    
    setLoading(true);
    try {
      const sale = await completeSale(cart, customer);
      
      const pdfBlob = await generateBillPDF(sale);
      const url = URL.createObjectURL(pdfBlob);
      
      const a = document.createElement('a');
      a.href = url;
      const safeName = sale.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${safeName}_${sale.billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Open in new tab
      window.open(url, '_blank');
      
      toast.success(`Sale complete — ${sale.billNumber}`);
      setCart([]);
      setCustomer({ name: "", phone: "", gstin: "", address: "" });
      loadData(); // reload stock
    } catch (error: any) {
      toast.error(error.message || "Failed to complete sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      {/* Left Panel: Products */}
      <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col h-[calc(100vh-8rem)] min-h-[600px]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Products</h2>
        <ProductSearch products={products} categories={categories} onAdd={handleAddToCart} />
      </div>

      {/* Right Panel: Cart & Customer */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col h-[calc(100vh-8rem)] min-h-[600px]">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Bill To</h2>
          <div className="space-y-3">
            <input 
              required
              type="text" 
              placeholder="Customer Name / Company *" 
              value={customer.name}
              onChange={e => setCustomer({...customer, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <div className="flex gap-3">
              <input 
                type="text" 
                maxLength={10}
                placeholder="Phone (Optional)" 
                value={customer.phone}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCustomer({...customer, phone: val});
                }}
                className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <input 
                type="text" 
                placeholder="GSTIN (Optional)" 
                value={customer.gstin}
                onChange={e => setCustomer({...customer, gstin: e.target.value.toUpperCase()})}
                className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm uppercase"
              />
            </div>
            <input 
              type="text" 
              placeholder="Address (Optional)" 
              value={customer.address}
              onChange={e => setCustomer({...customer, address: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Cart</h2>
        <CartPanel cart={cart} onSetQuantity={handleSetQuantity} onRemove={handleRemoveFromCart} />
        
        <BillSummary 
          cart={cart} 
          onClear={handleClear} 
          onComplete={handleCompleteSale} 
          loading={loading} 
          canComplete={customer.name.trim().length > 0} 
        />
      </div>
    </div>
  );
}
