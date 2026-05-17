"use client";

import { useState, useEffect } from "react";
import { getSuppliers, addSupplier, deleteSupplier } from "../../lib/db";
import { Supplier } from "../../types";
import { Truck, Plus, Trash2, Phone, MapPin } from "lucide-react";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import toast from "react-hot-toast";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (phone.trim() && phone.trim().length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    setAdding(true);
    try {
      const sup = await addSupplier({ name: name.trim(), phone: phone.trim(), address: address.trim() });
      setSuppliers(prev => [sup, ...prev]);
      setName(""); setPhone(""); setAddress("");
      setShowForm(false);
      toast.success("Supplier added");
    } catch (error) {
      console.error("Add supplier error:", error);
      toast.error((error as Error).message || "Failed to add supplier");
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete);
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete));
      toast.success("Supplier deleted");
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete supplier");
    } finally {
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck size={24} className="text-indigo-600" />
          Suppliers
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Supplier</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rajesh Traders"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="10-digit number"
                maxLength={10}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="City, State"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {adding ? "Saving..." : "Add Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading suppliers...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {suppliers.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <Truck size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No suppliers added yet. Add your first supplier above.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                  <th className="p-4">Supplier Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Address</th>
                  <th className="p-4">Added On</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{s.name}</td>
                    <td className="p-4 text-gray-600">
                      {s.phone ? <span className="flex items-center gap-1"><Phone size={14} className="text-gray-400" />{s.phone}</span> : '-'}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {s.address ? <span className="flex items-center gap-1"><MapPin size={14} className="text-gray-400" />{s.address}</span> : '-'}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSupplierToDelete(s.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Supplier"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {supplierToDelete && (
        <ConfirmModal
          title="Delete Supplier"
          message="Are you sure you want to delete this supplier? This will not affect products linked to this supplier."
          onConfirm={confirmDelete}
          onCancel={() => setSupplierToDelete(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
