"use client";

import { useState } from "react";
import { StockEntry, Product } from "../../types";
import { addStockEntry } from "../../lib/db";
import toast from "react-hot-toast";

interface EntryReportProps {
  entries: StockEntry[];
  products: Product[];
  onNewEntry: () => void;
}

export function EntryReport({ entries, products, onNewEntry }: EntryReportProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  
  // Manual form state
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || Number(quantity) <= 0) {
      toast.error("Valid product and quantity are required");
      return;
    }

    setLoading(true);
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      await addStockEntry({
        productId,
        productName: product.name,
        categoryName: product.categoryName,
        unitName: product.unitName,
        type,
        quantity: Number(quantity),
        note: note.trim() || "Manual Entry",
        date: new Date()
      });
      
      toast.success("Stock entry added");
      setProductId("");
      setQuantity("");
      setNote("");
      setShowManualForm(false);
      onNewEntry();
    } catch (error: any) {
      toast.error(error.message || "Failed to add stock entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4 print:hidden">
        <button 
          onClick={() => setShowManualForm(!showManualForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          {showManualForm ? "Cancel Manual Entry" : "+ Manual Stock Entry"}
        </button>
      </div>

      {showManualForm && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 print:hidden">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Manual Stock Entry</h3>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select 
                value={productId} 
                onChange={e => setProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as "IN" | "OUT")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IN">IN (Receive Stock)</option>
                <option value="OUT">OUT (Remove Stock / Damage)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input 
                type="number" 
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Supplier delivery, damage write-off"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div className="md:col-span-2 flex justify-end mt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Submit Entry"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4">Date & Time</th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Type</th>
                <th className="p-4 text-right">Qty</th>
                <th className="p-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">{new Date(entry.date).toLocaleString('en-IN')}</td>
                  <td className="p-4 font-medium text-gray-900">{entry.productName}</td>
                  <td className="p-4 text-gray-600">{entry.categoryName}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${entry.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-gray-900">{entry.quantity} {entry.unitName}</td>
                  <td className="p-4 text-gray-500 text-sm">{entry.note || '-'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No stock entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
