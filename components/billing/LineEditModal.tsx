"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { CartItem } from "../../types";
import { computeLine, GST_RATES, round2 } from "../../lib/gst";
import { inr2 } from "../ui/Common";

/** Edit one invoice line: quantity, rate, discount (and GST for service lines). */
export function LineEditModal({ item, maxQty, onSave, onRemove, onClose }: {
  item: CartItem;
  maxQty?: number;
  onSave: (item: CartItem) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(String(item.quantity));
  const [inclusive, setInclusive] = useState(false);
  const [rate, setRate] = useState(String(round2(item.basePrice)));
  const [disc, setDisc] = useState(item.discountPercent ? String(item.discountPercent) : "");
  const [gst, setGst] = useState(item.gstPercentage);

  const rateNum = Number(rate) || 0;
  const rateExcl = inclusive ? rateNum / (1 + gst / 100) : rateNum;
  const preview = computeLine({ ...item, quantity: Number(qty) || 0, basePrice: rateExcl, discountPercent: Number(disc) || 0, gstPercentage: gst });
  const overStock = maxQty !== undefined && preview.quantity > maxQty;
  const belowCost = !item.isService && item.purchasePrice > 0 && rateExcl * (1 - (Number(disc) || 0) / 100) < item.purchasePrice;

  const toggleInclusive = (v: boolean) => {
    // convert the displayed number so the price itself doesn't change
    const n = Number(rate) || 0;
    setRate(String(round2(v ? n * (1 + gst / 100) : n / (1 + gst / 100))));
    setInclusive(v);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(preview.quantity > 0) || overStock) return;
    onSave(preview);
  };

  return (
    <Modal
      title={item.name}
      subtitle={item.isService ? "Labour / service" : `${item.unitName}${item.hsnCode ? ` · HSN ${item.hsnCode}` : ""}`}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRemove} className="btn-ghost text-red-600 px-3" aria-label="Remove item"><Trash2 size={18} /> Remove</button>
          <div className="flex-1 text-right pr-2">
            <p className="text-xs text-ink-3">Line total</p>
            <p className="num font-semibold">{inr2(preview.lineTotal)}</p>
          </div>
          <button form="line-form" type="submit" className="btn-primary" disabled={overStock || !(preview.quantity > 0)}>Update</button>
        </div>
      }
    >
      <form id="line-form" onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Quantity {maxQty !== undefined && <span className="text-ink-3 font-normal">· {maxQty} in stock</span>}</label>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary w-12 px-0 text-lg" onClick={() => setQty(String(Math.max(1, round2((Number(qty) || 0) - 1))))}>−</button>
            <input className="input num text-center text-lg font-semibold" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ""))} autoFocus />
            <button type="button" className="btn-secondary w-12 px-0 text-lg" onClick={() => setQty(String(round2((Number(qty) || 0) + 1)))}>+</button>
          </div>
          {overStock && <p className="text-xs text-red-600 mt-1">Only {maxQty} {item.unitName} in stock.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rate {inclusive ? "(incl. GST)" : "(excl. GST)"}</label>
            <input className="input num" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div>
            <label className="label">Discount %</label>
            <input className="input num" inputMode="decimal" value={disc} onChange={e => setDisc(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={inclusive} onChange={e => toggleInclusive(e.target.checked)} className="w-4 h-4 accent-brand-600" />
          I&apos;m entering the price including GST
        </label>

        {item.isService && (
          <div>
            <label className="label">GST %</label>
            <select className="input" value={gst} onChange={e => setGst(Number(e.target.value))}>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
        )}

        {belowCost && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            This rate is below your purchase price ({inr2(item.purchasePrice)}). You will make a loss on this item.
          </p>
        )}

        <div className="rounded-lg bg-surface p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-ink-3">Taxable value</span><span className="num">{inr2(preview.lineTaxableAmount)}</span></div>
          <div className="flex justify-between"><span className="text-ink-3">GST {gst}%</span><span className="num">{inr2(preview.lineGSTAmount)}</span></div>
        </div>
      </form>
    </Modal>
  );
}
