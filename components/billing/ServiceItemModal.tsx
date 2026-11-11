"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { GST_RATES } from "../../lib/gst";
import { inr2 } from "../ui/Common";

export const SERVICE_PRESETS = [
  "Pump installation / lowering charges",
  "Borewell pipe fitting labour",
  "Old pump removal (lifting)",
  "Motor rewinding",
  "Pump servicing / repair",
  "Electrical wiring & starter panel fitting",
  "Transport charges",
  "Borewell flushing / cleaning",
];

export type ServiceInput = { name: string; rateExclGst: number; gst: number; qty: number; sac?: string; unitName: string };

/** Add a labour / service charge line (no stock). */
export function ServiceItemModal({ onClose, onAdd, accent = "brand" }: {
  onClose: () => void;
  onAdd: (s: ServiceInput) => void;
  accent?: "brand" | "emerald";
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [inclusive, setInclusive] = useState(true);
  const [gst, setGst] = useState(18);
  const [qty, setQty] = useState("1");
  const [sac, setSac] = useState("9987");

  const amt = Number(amount) || 0;
  const rateExcl = inclusive ? amt / (1 + gst / 100) : amt;
  const total = rateExcl * (1 + gst / 100) * (Number(qty) || 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amt <= 0 || !(Number(qty) > 0)) return;
    onAdd({ name: name.trim(), rateExclGst: rateExcl, gst, qty: Number(qty), sac: sac.trim() || undefined, unitName: "Job" });
  };

  const btn = accent === "emerald" ? "btn-success" : "btn-primary";

  return (
    <Modal
      title="Add labour / service charge"
      subtitle="For work done — no stock is used"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-ink-3">Line total</p>
            <p className="num font-semibold text-ink">{inr2(total)}</p>
          </div>
          <button form="svc-form" type="submit" className={btn} disabled={!name.trim() || amt <= 0}>Add to bill</button>
        </div>
      }
    >
      <form id="svc-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Description</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pump installation charges" autoFocus />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SERVICE_PRESETS.map(p => (
              <button type="button" key={p} onClick={() => setName(p)} className={`text-xs px-2.5 py-1.5 rounded-full border ${name === p ? "bg-ink text-white border-ink" : "border-line text-ink-2"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Amount (₹)</label>
            <input className="input num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input className="input num" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={inclusive} onChange={e => setInclusive(e.target.checked)} className="w-4 h-4 accent-brand-600" />
          Amount includes GST
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">GST %</label>
            <select className="input" value={gst} onChange={e => setGst(Number(e.target.value))}>
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label className="label">SAC code</label>
            <input className="input" value={sac} onChange={e => setSac(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Optional" />
          </div>
        </div>
      </form>
    </Modal>
  );
}
