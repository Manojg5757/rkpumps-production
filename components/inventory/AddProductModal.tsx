"use client";

import { useState, useEffect } from "react";
import { Product, Category, Unit, Supplier } from "../../types";
import { addProduct, getSuppliers, addSupplier } from "../../lib/db";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface AddProductModalProps {
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onAdded: (product: Product) => void;
}

export function AddProductModal({ categories, units, onClose, onAdded }: AddProductModalProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [stockQuantity, setStockQuantity] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  
  // Supplier State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [isNewSupplier, setIsNewSupplier] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categories.length > 0) setCategoryId(categories[0].id);
    if (units.length > 0) setUnitId(units[0].id);
    
    getSuppliers().then(data => setSuppliers(data)).catch(console.error);
  }, [categories, units]);

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSupplierId(val);
    if (val === "new") {
      setIsNewSupplier(true);
      setSupplierName("");
    } else {
      setIsNewSupplier(false);
      const sup = suppliers.find(s => s.id === val);
      if (sup) setSupplierName(sup.name);
    }
  };

  const isPriceBelowCost = Number(basePrice) > 0 && Number(purchasePrice) > 0 && Number(basePrice) < Number(purchasePrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId || !unitId) {
      toast.error("Please fill all required fields");
      return;
    }
    if (isPriceBelowCost) {
      toast.error("Selling price cannot be lower than purchase price");
      return;
    }
    
    setLoading(true);
    try {
      let finalSupplierId = supplierId;
      let finalSupplierName = supplierName;

      // Handle new supplier creation
      if (isNewSupplier && supplierName.trim() !== "") {
        const newSup = await addSupplier({
          name: supplierName.trim(),
          phone: supplierPhone.trim(),
          address: supplierAddress.trim()
        });
        finalSupplierId = newSup.id;
        finalSupplierName = newSup.name;
      }

      const cat = categories.find(c => c.id === categoryId);
      const unt = units.find(u => u.id === unitId);

      const newProduct = await addProduct({
        name,
        categoryId,
        categoryName: cat?.name || "",
        unitId,
        unitName: unt?.name || "",
        stockQuantity: Number(stockQuantity),
        purchasePrice: Number(purchasePrice),
        basePrice: Number(basePrice),
        supplierId: finalSupplierId !== "new" && finalSupplierId !== "" ? finalSupplierId : "",
        supplierName: finalSupplierName || "",
        gstPercentage: Number(gstPercentage),
        lowStockThreshold: Number(lowStockThreshold),
      });
      toast.success("Product added successfully");
      onAdded(newProduct);
    } catch (error) {
      toast.error((error as Error).message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const finalPrice = Number(basePrice) * (1 + Number(gstPercentage) / 100);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Details</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock Quantity</label>
                <input required type="number" min="0" value={stockQuantity === 0 ? '' : stockQuantity} onChange={e => setStockQuantity(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert At</label>
                <input required type="number" min="0" value={lowStockThreshold === 0 ? '' : lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Pricing & Supplier</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (₹)</label>
                <input required type="number" min="0" step="0.01" value={purchasePrice === 0 ? '' : purchasePrice} onChange={e => setPurchasePrice(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹) - Excl. GST</label>
                <input required type="number" min="0" step="0.01" value={basePrice === 0 ? '' : basePrice} onChange={e => setBasePrice(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
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
            </div>

            {isPriceBelowCost && (
              <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                <span className="font-semibold">⚠ Warning:</span> Selling price is lower than purchase price. You will be selling at a loss.
              </div>
            )}
            <div className={`p-3 rounded-lg border flex justify-between items-center ${isPriceBelowCost ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <span className="text-sm font-medium text-gray-600">Profit Margin: <span className={isPriceBelowCost ? 'text-red-600 font-bold' : 'text-green-600'}>₹{(Number(basePrice) - Number(purchasePrice)).toFixed(2)}</span></span>
              <p className="text-sm text-gray-500">Final Selling Price (Incl. GST): <span className="font-bold text-indigo-600 text-lg">₹{finalPrice.toFixed(2)}</span></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier</label>
              <select value={supplierId} onChange={handleSupplierChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 mb-3">
                <option value="">-- No Supplier --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="new">+ Add New Supplier</option>
              </select>

              {isNewSupplier && (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-3">
                  <h4 className="font-medium text-indigo-900 text-sm">New Supplier Details</h4>
                  <input required type="text" placeholder="Supplier Name" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Phone (Optional)" maxLength={10} value={supplierPhone} onChange={e => setSupplierPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                    <input type="text" placeholder="Address (Optional)" value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading || isPriceBelowCost} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Saving..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
