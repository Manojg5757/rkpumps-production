"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Product, Category, Unit, Supplier } from "../../types";
import { addProduct, updateProduct, getSuppliers, addSupplier } from "../../lib/db";
import { GST_RATES, round2, round4 } from "../../lib/gst";
import { Modal } from "../ui/Modal";
import { inr2 } from "../ui/Common";

interface Props {
  product?: Product | null; // edit when provided
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, categories, units, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || "");
  const [unitId, setUnitId] = useState(product?.unitId || units[0]?.id || "");
  const [hsnCode, setHsnCode] = useState(product?.hsnCode || "");
  const [itemCode, setItemCode] = useState(product?.itemCode || "");
  const [isService, setIsService] = useState(!!product?.isService);
  const [stock, setStock] = useState(product ? String(product.stockQuantity) : "");
  const [lowAt, setLowAt] = useState(product ? String(product.lowStockThreshold) : "2");
  const [purchase, setPurchase] = useState(product ? String(product.purchasePrice || "") : "");
  const [gst, setGst] = useState(product?.gstPercentage ?? 18);
  const [priceMode, setPriceMode] = useState<"excl" | "incl">("excl");
  const [price, setPrice] = useState(product ? String(product.basePrice) : "");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState(product?.supplierId || "");
  const [newSup, setNewSup] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { getSuppliers().then(setSuppliers).catch(() => {}); }, []);
  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(categories[0].id);
    if (!unitId && units[0]) setUnitId(units[0].id);
  }, [categories, units, categoryId, unitId]);

  const priceNum = Number(price) || 0;
  const baseExcl = priceMode === "incl" ? priceNum / (1 + gst / 100) : priceNum;
  const finalIncl = baseExcl * (1 + gst / 100);
  const cost = Number(purchase) || 0;
  const margin = baseExcl - cost;
  const marginPct = cost > 0 ? (margin / cost) * 100 : 0;
  const belowCost = baseExcl > 0 && cost > 0 && baseExcl < cost;

  const switchMode = (m: "excl" | "incl") => {
    if (m === priceMode) return;
    setPrice(priceNum ? String(round2(m === "incl" ? priceNum * (1 + gst / 100) : priceNum / (1 + gst / 100))) : "");
    setPriceMode(m);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !unitId) return toast.error("Fill in name, category and unit");
    if (!(baseExcl > 0)) return toast.error("Enter the selling price");
    if (belowCost) return toast.error("Selling price cannot be lower than purchase price");
    setSaving(true);
    try {
      let supId = supplierId === "new" ? "" : supplierId;
      let supName = suppliers.find(s => s.id === supId)?.name || "";
      if (supplierId === "new" && newSup.name.trim()) {
        const s = await addSupplier({ name: newSup.name.trim(), phone: newSup.phone.trim(), address: newSup.address.trim() });
        supId = s.id;
        supName = s.name;
      }
      const cat = categories.find(c => c.id === categoryId);
      const unit = units.find(u => u.id === unitId);
      const data = {
        name: name.trim(),
        categoryId,
        categoryName: cat?.name || "",
        unitId,
        unitName: unit?.name || "",
        hsnCode: hsnCode.trim(),
        itemCode: itemCode.trim(),
        isService,
        stockQuantity: isService ? 0 : Number(stock) || 0,
        lowStockThreshold: isService ? 0 : Number(lowAt) || 0,
        purchasePrice: cost,
        basePrice: round4(baseExcl),
        gstPercentage: gst,
        supplierId: supId,
        supplierName: supName,
      };
      if (isEdit) await updateProduct(product!.id, data);
      else await addProduct(data);
      toast.success(isEdit ? "Product updated" : "Product added");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Could not save the product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit product" : "Add product"}
      onClose={onClose}
      size="lg"
      fullOnMobile
      footer={
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button form="product-form" type="submit" className="btn-primary flex-1" disabled={saving || belowCost}>{saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}</button>
        </div>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-5">
        <section className="space-y-3">
          <div>
            <label className="label">Product name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 1 HP V4 Submersible Pump" autoFocus={!isEdit} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Item code</label>
              <input className="input num" value={itemCode} onChange={e => setItemCode(e.target.value.toUpperCase())} placeholder="Optional, e.g. BW-SP-001" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-2 mt-6">
              <input type="checkbox" checked={isService} onChange={e => setIsService(e.target.checked)} className="w-4 h-4 accent-brand-600" />
              Service / labour (no stock)
            </label>
          </div>
          <div className={`grid gap-3 ${isService ? "grid-cols-1" : "grid-cols-3"}`}>
            {!isService && <>
            <div>
              <label className="label">{isEdit ? "Stock" : "Opening stock"}</label>
              <input className="input num" inputMode="decimal" value={stock} onChange={e => setStock(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
            </div>
            <div>
              <label className="label">Alert below</label>
              <input className="input num" inputMode="decimal" value={lowAt} onChange={e => setLowAt(e.target.value.replace(/[^0-9.]/g, ""))} />
            </div>
            </>}
            <div>
              <label className="label">{isService ? "SAC code" : "HSN code"}</label>
              <input className="input num" inputMode="numeric" value={hsnCode} onChange={e => setHsnCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="8413" />
            </div>
          </div>
          {isEdit && <p className="text-xs text-ink-3">Tip: use <b>Stock in / out</b> for purchases and damages so they appear in the stock register.</p>}
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-ink">Pricing</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Purchase price (₹)</label>
              <input className="input num" inputMode="decimal" value={purchase} onChange={e => setPurchase(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Cost per unit" />
            </div>
            <div>
              <label className="label">GST rate</label>
              <select className="input" value={gst} onChange={e => setGst(Number(e.target.value))}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Selling price (₹) *</label>
              <div className="inline-flex text-xs border border-line rounded-md overflow-hidden">
                <button type="button" onClick={() => switchMode("excl")} className={`px-2 py-1 ${priceMode === "excl" ? "bg-ink text-white" : "text-ink-2"}`}>Excl. GST</button>
                <button type="button" onClick={() => switchMode("incl")} className={`px-2 py-1 ${priceMode === "incl" ? "bg-ink text-white" : "text-ink-2"}`}>Incl. GST</button>
              </div>
            </div>
            <input className={`input num ${belowCost ? "border-red-400 bg-red-50" : ""}`} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div className={`rounded-lg p-3 text-sm grid grid-cols-2 gap-2 ${belowCost ? "bg-red-50 text-red-800" : "bg-surface"}`}>
            <div><p className="text-xs text-ink-3">Customer pays</p><p className="num font-semibold">{inr2(finalIncl)}</p></div>
            <div><p className="text-xs text-ink-3">Your margin</p><p className={`num font-semibold ${margin < 0 ? "text-red-700" : "text-emerald-700"}`}>{inr2(margin)}{cost > 0 && <span className="text-xs font-normal"> ({marginPct.toFixed(0)}%)</span>}</p></div>
            {belowCost && <p className="col-span-2 text-xs">Selling price is below the purchase price — you would sell at a loss.</p>}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-ink">Supplier</h3>
          <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">No supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="new">+ Add new supplier</option>
          </select>
          {supplierId === "new" && (
            <div className="rounded-lg border border-line p-3 space-y-2">
              <input className="input" placeholder="Supplier name" value={newSup.name} onChange={e => setNewSup({ ...newSup, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input num" placeholder="Phone" inputMode="numeric" value={newSup.phone} onChange={e => setNewSup({ ...newSup, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                <input className="input" placeholder="Town" value={newSup.address} onChange={e => setNewSup({ ...newSup, address: e.target.value })} />
              </div>
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}
