"use client";

import { useState, useEffect } from "react";
import { StockEntry, Product, Supplier } from "../../types";
import { addStockEntry, getSuppliers } from "../../lib/db";
import toast from "react-hot-toast";

interface EntryReportProps {
  entries: StockEntry[];
  products: Product[];
  onNewEntry: () => void;
}

export function EntryReport({ entries, products, onNewEntry }: EntryReportProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const selectedProduct = products.find(p => p.id === productId) ?? null;

  useEffect(() => {
    setSupplierId(selectedProduct?.supplierId || "");
  }, [productId]);

  const effectivePurchasePrice = newPurchasePrice ? Number(newPurchasePrice) : (selectedProduct?.purchasePrice ?? 0);
  const effectiveSellingPrice = newSellingPrice ? Number(newSellingPrice) : (selectedProduct?.basePrice ?? 0);
  const isPriceBelowCost =
    type === 'IN' &&
    (newPurchasePrice || newSellingPrice) &&
    effectiveSellingPrice > 0 &&
    effectivePurchasePrice > 0 &&
    effectiveSellingPrice < effectivePurchasePrice;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || Number(quantity) <= 0) {
      toast.error("Valid product and quantity are required");
      return;
    }
    if (isPriceBelowCost) {
      toast.error("Selling price cannot be lower than purchase price");
      return;
    }

    setLoading(true);
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      const entryNote = note.trim() ||
        (type === 'IN' ? `Stock received${invoiceNumber ? ` — Bill: ${invoiceNumber}` : ''}` : 'Manual removal');

      await addStockEntry(
        {
          productId,
          productName: product.name,
          categoryName: product.categoryName,
          unitName: product.unitName,
          type,
          quantity: Number(quantity),
          purchasePrice: newPurchasePrice ? Number(newPurchasePrice) : 0,
          supplierId: supplierId || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          note: entryNote,
          date: new Date()
        },
        newSellingPrice ? Number(newSellingPrice) : undefined
      );

      toast.success("Stock entry added");
      setProductId(""); setQuantity(""); setNewPurchasePrice(""); setNewSellingPrice("");
      setSupplierId(""); setInvoiceNumber(""); setNote("");
      setShowManualForm(false);
      onNewEntry();
    } catch (error) {
      toast.error((error as Error).message || "Failed to add stock entry");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesType = filterType === "ALL" || e.type === filterType;
    const matchesSearch = !search || e.productName.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as "IN" | "OUT")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="IN">IN (Receive Stock)</option>
                <option value="OUT">OUT (Remove / Damage)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {type === 'IN' && (
              <>
                {/* Current prices info card */}
                {selectedProduct && (
                  <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Current Prices — {selectedProduct.name}</p>
                    <div className="flex gap-6 text-sm">
                      <span className="text-gray-700">Purchase Price: <span className="font-bold text-gray-900">₹{(selectedProduct.purchasePrice ?? 0).toFixed(2)}</span></span>
                      <span className="text-gray-700">Selling Price (excl. GST): <span className="font-bold text-gray-900">₹{selectedProduct.basePrice.toFixed(2)}</span></span>
                      <span className="text-gray-500">GST: <span className="font-medium">{selectedProduct.gstPercentage}%</span></span>
                    </div>
                  </div>
                )}

                {/* New price fields */}
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Update Prices <span className="font-normal text-gray-400">(optional — leave blank to keep current)</span></p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Purchase Price per Unit (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newPurchasePrice}
                        onChange={e => setNewPurchasePrice(e.target.value)}
                        placeholder={selectedProduct ? `Current: ₹${(selectedProduct.purchasePrice ?? 0).toFixed(2)}` : "Optional"}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Selling Price per Unit — Excl. GST (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newSellingPrice}
                        onChange={e => setNewSellingPrice(e.target.value)}
                        placeholder={selectedProduct ? `Current: ₹${selectedProduct.basePrice.toFixed(2)}` : "Optional"}
                        className={`w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 ${isPriceBelowCost ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      />
                    </div>
                  </div>

                  {isPriceBelowCost && (
                    <div className="mt-2 bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded-lg">
                      <span className="font-semibold">⚠ Warning:</span> Selling price (₹{effectiveSellingPrice.toFixed(2)}) is lower than purchase price (₹{effectivePurchasePrice.toFixed(2)}). You will be selling at a loss.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- No Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {selectedProduct?.supplierId && supplierId === selectedProduct.supplierId && (
                    <p className="text-xs text-indigo-600 mt-1">Current supplier for this product</p>
                  )}
                  {selectedProduct?.supplierId && supplierId !== selectedProduct.supplierId && (
                    <p className="text-xs text-amber-600 mt-1">
                      Default: {selectedProduct.supplierName || 'Unknown'} —{' '}
                      <button type="button" className="underline" onClick={() => setSupplierId(selectedProduct.supplierId!)}>restore</button>
                    </p>
                  )}
                  {!selectedProduct?.supplierId && (
                    <p className="text-xs text-gray-400 mt-1">No supplier linked to this product</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Bill / Invoice No.</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            <div className={type === 'IN' ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
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
                disabled={loading || !!isPriceBelowCost}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Submit Entry"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 print:hidden">
        <input
          type="text"
          placeholder="Search by product name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Types</option>
          <option value="IN">IN Only</option>
          <option value="OUT">OUT Only</option>
        </select>
      </div>

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
                <th className="p-4 text-right">Purchase Price</th>
                <th className="p-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
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
                  <td className="p-4 text-right text-gray-600 text-sm">
                    {entry.purchasePrice ? `₹${entry.purchasePrice.toFixed(2)}` : '-'}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{entry.note || '-'}</td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
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
