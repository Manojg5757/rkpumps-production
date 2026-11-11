"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Product, Supplier } from "../../types";
import { addStockEntry, getSuppliers } from "../../lib/db";
import { Modal } from "../ui/Modal";
import { Segmented, inr2 } from "../ui/Common";

/** Record stock received (IN) or removed / damaged (OUT). Updates purchase / selling price optionally. */
export function StockMoveModal({ products, product, initialType = "IN", onClose, onSaved }: {
  products: Product[];
  product?: Product | null;
  initialType?: "IN" | "OUT";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState(product?.id || "");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"IN" | "OUT">(initialType);
  const [qty, setQty] = useState("");
  const [purchase, setPurchase] = useState("");
  const [selling, setSelling] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState(product?.supplierId || "");
  const [billNo, setBillNo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { getSuppliers().then(setSuppliers).catch(() => {}); }, []);

  const selected = products.find(p => p.id === productId) || null;
  useEffect(() => { setSupplierId(selected?.supplierId || ""); }, [selected?.id, selected?.supplierId]);

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [products, query]);

  const effCost = purchase ? Number(purchase) : selected?.purchasePrice || 0;
  const effSell = selling ? Number(selling) : selected?.basePrice || 0;
  const belowCost = type === "IN" && (purchase || selling) && effCost > 0 && effSell > 0 && effSell < effCost;
  const after = selected ? (type === "IN" ? selected.stockQuantity + (Number(qty) || 0) : selected.stockQuantity - (Number(qty) || 0)) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return toast.error("Choose a product");
    const q = Number(qty);
    if (!(q > 0)) return toast.error("Enter the quantity");
    if (type === "OUT" && q > selected.stockQuantity) return toast.error(`Only ${selected.stockQuantity} in stock`);
    if (belowCost) return toast.error("Selling price cannot be lower than purchase price");
    setSaving(true);
    try {
      await addStockEntry(
        {
          productId: selected.id,
          productName: selected.name,
          categoryName: selected.categoryName,
          unitName: selected.unitName,
          type,
          quantity: q,
          purchasePrice: type === "IN" && purchase ? Number(purchase) : 0,
          supplierId: type === "IN" ? supplierId || undefined : undefined,
          invoiceNumber: type === "IN" ? billNo.trim() || undefined : undefined,
          note: note.trim() || (type === "IN" ? `Stock received${billNo ? ` — Bill: ${billNo.trim()}` : ""}` : "Removed / damaged"),
          date: new Date(),
        },
        type === "IN" && selling ? Number(selling) : undefined
      );
      toast.success(type === "IN" ? `Added ${q} ${selected.unitName} to stock` : `Removed ${q} ${selected.unitName}`);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={type === "IN" ? "Stock in" : "Stock out"}
      subtitle={type === "IN" ? "Purchase or goods received" : "Damage, return to supplier or own use"}
      onClose={onClose}
      fullOnMobile
      footer={
        <div className="flex items-center gap-3">
          {selected && (
            <div className="flex-1 text-sm">
              <p className="text-xs text-ink-3">Stock after</p>
              <p className={`num font-semibold ${after < 0 ? "text-red-700" : ""}`}>{after} {selected.unitName}</p>
            </div>
          )}
          <button form="stock-form" type="submit" disabled={saving || !!belowCost} className={`${type === "IN" ? "btn-success" : "btn-danger"} ${selected ? "" : "flex-1"}`}>
            {saving ? "Saving…" : type === "IN" ? "Add to stock" : "Remove from stock"}
          </button>
        </div>
      }
    >
      <form id="stock-form" onSubmit={submit} className="space-y-4">
        <Segmented<"IN" | "OUT"> value={type} onChange={setType} options={[{ value: "IN", label: "Stock in" }, { value: "OUT", label: "Stock out" }]} />

        {selected ? (
          <div className="rounded-lg border border-line p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selected.name}</p>
              <p className="text-[13px] text-ink-3 num">In stock: {selected.stockQuantity} {selected.unitName} · cost {inr2(selected.purchasePrice || 0)} · sell {inr2(selected.basePrice)}</p>
            </div>
            {!product && <button type="button" className="btn-ghost h-9 px-2 text-brand-700" onClick={() => setProductId("")}>Change</button>}
          </div>
        ) : (
          <div>
            <label className="label">Product</label>
            <input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product" autoFocus />
            <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-line border border-line rounded-lg">
              {matches.map(p => (
                <li key={p.id}>
                  <button type="button" onClick={() => setProductId(p.id)} className="w-full flex justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-[13px] text-ink-3 num shrink-0">{p.stockQuantity} {p.unitName}</span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-4 text-sm text-ink-3 text-center">No product found</li>}
            </ul>
          </div>
        )}

        <div>
          <label className="label">Quantity *</label>
          <input className="input num text-lg font-semibold" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
        </div>

        {type === "IN" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">New purchase price</label>
                <input className="input num" inputMode="decimal" value={purchase} onChange={e => setPurchase(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={selected ? `Now ${selected.purchasePrice || 0}` : "Optional"} />
              </div>
              <div>
                <label className="label">New selling price <span className="font-normal text-ink-3">excl. GST</span></label>
                <input className={`input num ${belowCost ? "border-red-400 bg-red-50" : ""}`} inputMode="decimal" value={selling} onChange={e => setSelling(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={selected ? `Now ${selected.basePrice}` : "Optional"} />
              </div>
            </div>
            {belowCost && <p className="text-sm text-red-700">Selling price ({inr2(effSell)}) is below purchase price ({inr2(effCost)}).</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supplier</label>
                <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">None</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Supplier bill no.</label>
                <input className="input" value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            {(purchase && Number(qty) > 0) ? <p className="text-sm text-ink-2">Purchase value: <b className="num">{inr2(Number(purchase) * Number(qty))}</b></p> : null}
          </>
        )}

        <div>
          <label className="label">Note</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder={type === "IN" ? "e.g. Delivered by lorry" : "e.g. Damaged during fitting"} />
        </div>
      </form>
    </Modal>
  );
}
