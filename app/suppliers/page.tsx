"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, getProducts } from "../../lib/db";
import { Product, Supplier } from "../../types";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, Loading, PageHeader, SearchInput } from "../../components/ui/Common";
import { isValidGstin } from "../../lib/utils";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Supplier | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([getSuppliers(), getProducts()]);
      setSuppliers(s.sort((a, b) => a.name.localeCompare(b.name)));
      setProducts(p);
    } catch { toast.error("Could not load suppliers"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const shown = suppliers.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || (s.phone || "").includes(q) || (s.address || "").toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteSupplier(toDelete.id);
      setSuppliers(prev => prev.filter(s => s.id !== toDelete.id));
      toast.success("Supplier deleted");
    } catch (error) {
      toast.error((error as Error).message || "Could not delete");
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers`}
        actions={<button className="btn-primary px-3" onClick={() => setForm("new")}><Plus size={18} /><span className="hidden sm:inline">Add supplier</span></button>}
      />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or town" /></div>

      {loading ? <Loading /> : shown.length === 0 ? (
        <div className="card"><EmptyState icon={Truck} title={suppliers.length ? "No suppliers match" : "No suppliers yet"} text="Add the dealers you buy pumps, motors and pipes from."
          action={!suppliers.length ? <button className="btn-primary" onClick={() => setForm("new")}><Plus size={18} /> Add supplier</button> : undefined} /></div>
      ) : (
        <ul className="card divide-y divide-line">
          {shown.map(s => {
            const count = products.filter(p => p.supplierId === s.id).length;
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-[13px] text-ink-3 truncate flex items-center gap-3">
                    {s.phone && <span className="inline-flex items-center gap-1 num"><Phone size={12} />{s.phone}</span>}
                    {s.address && <span className="inline-flex items-center gap-1"><MapPin size={12} />{s.address}</span>}
                    <span>{count} product{count === 1 ? "" : "s"}</span>
                  </p>
                </div>
                {s.phone && <a href={`tel:${s.phone}`} className="icon-btn text-brand-700" aria-label={`Call ${s.name}`}><Phone size={17} /></a>}
                <button className="icon-btn" onClick={() => setForm(s)} aria-label="Edit supplier"><Pencil size={17} /></button>
                <button className="icon-btn text-ink-3" onClick={() => setToDelete(s)} aria-label="Delete supplier"><Trash2 size={17} /></button>
              </li>
            );
          })}
        </ul>
      )}

      {form && <SupplierForm supplier={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {toDelete && (
        <ConfirmModal
          title="Delete supplier?"
          message={`${toDelete.name} will be removed. Products linked to this supplier are not affected.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(supplier?.name || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [address, setAddress] = useState(supplier?.address || "");
  const [gstin, setGstin] = useState(supplier?.gstin || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter the supplier name");
    if (phone && phone.length !== 10) return toast.error("Phone number must be 10 digits");
    if (gstin && !isValidGstin(gstin)) return toast.error("GSTIN looks wrong — check it or leave it empty");
    setSaving(true);
    try {
      const data = { name: name.trim(), phone, address: address.trim(), gstin };
      if (supplier) await updateSupplier(supplier.id, data);
      else await addSupplier(data);
      toast.success(supplier ? "Supplier updated" : "Supplier added");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={supplier ? "Edit supplier" : "Add supplier"}
      onClose={onClose}
      footer={<div className="flex gap-3"><button className="btn-secondary flex-1" onClick={onClose}>Cancel</button><button form="sup-form" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Save supplier"}</button></div>}
    >
      <form id="sup-form" onSubmit={submit} className="space-y-3">
        <div><label className="label">Supplier name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rajesh Traders" autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone</label><input className="input num" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
          <div><label className="label">Town</label><input className="input" value={address} onChange={e => setAddress(e.target.value)} /></div>
        </div>
        <div><label className="label">GSTIN</label><input className="input uppercase placeholder:normal-case" maxLength={15} value={gstin} onChange={e => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} placeholder="Optional" /></div>
      </form>
    </Modal>
  );
}
