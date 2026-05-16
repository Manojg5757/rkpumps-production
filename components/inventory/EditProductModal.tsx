"use client";

import { useState } from "react";
import { Product, Category, Unit } from "../../types";
import { updateProduct } from "../../lib/db";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface EditProductModalProps {
  product: Product;
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditProductModal({ product, categories, units, onClose, onUpdated }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [unitId, setUnitId] = useState(product.unitId);
  const [basePrice, setBasePrice] = useState(product.basePrice);
  const [gstPercentage, setGstPercentage] = useState(product.gstPercentage);
  const [lowStockThreshold, setLowStockThreshold] = useState(product.lowStockThreshold);
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !unitId) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setLoading(true);
    try {
      const cat = categories.find(c => c.id === categoryId);
      const unt = units.find(u => u.id === unitId);

      await updateProduct(product.id, {
        name,
        categoryId,
        categoryName: cat?.name || "",
        unitId,
        unitName: unt?.name || "",
        basePrice: Number(basePrice),
        gstPercentage: Number(gstPercentage),
        lowStockThreshold: Number(lowStockThreshold),
      });
      toast.success("Product updated successfully");
      onUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const finalPrice = Number(basePrice) * (1 + Number(gstPercentage) / 100);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Edit Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert At</label>
              <input required type="number" min="0" value={lowStockThreshold === 0 ? '' : lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
              <input required type="number" min="0" step="0.01" value={basePrice === 0 ? '' : basePrice} onChange={e => setBasePrice(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
            <select value={gstPercentage} onChange={e => setGstPercentage(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Final Price (Incl. GST): <span className="font-bold text-indigo-600 text-lg">₹{finalPrice.toFixed(2)}</span></p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Saving..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
