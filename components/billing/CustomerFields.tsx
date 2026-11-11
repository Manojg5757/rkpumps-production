"use client";

import { useMemo, useState } from "react";
import { Customer } from "../../types";
import { UserCheck, X } from "lucide-react";

export type CustomerForm = { name: string; phone: string; address: string; gstin: string };
export const emptyCustomer: CustomerForm = { name: "", phone: "", address: "", gstin: "" };

/**
 * Customer entry with live lookup by name or phone.
 * Selecting a match fills the form and sets selectedId; editing name/phone after that unlinks it.
 */
export function CustomerFields({ customers, value, onChange, selectedId, onSelect, showGstin = true, phoneRequired = true }: {
  customers: Customer[];
  value: CustomerForm;
  onChange: (v: CustomerForm) => void;
  selectedId: string | null;
  onSelect: (c: Customer | null) => void;
  showGstin?: boolean;
  phoneRequired?: boolean;
}) {
  const [focus, setFocus] = useState<"name" | "phone" | null>(null);

  const query = focus === "phone" ? value.phone : focus === "name" ? value.name : "";
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || selectedId) return [];
    return customers
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 6);
  }, [customers, query, selectedId]);

  const set = (patch: Partial<CustomerForm>, unlink = false) => {
    onChange({ ...value, ...patch });
    if (unlink && selectedId) onSelect(null);
  };

  const pick = (c: Customer) => {
    onChange({ name: c.name, phone: c.phone, address: c.address || "", gstin: c.gstin || "" });
    onSelect(c);
    setFocus(null);
  };

  const onPhone = (raw: string) => {
    const phone = raw.replace(/\D/g, "").slice(0, 10);
    const exact = phone.length === 10 ? customers.find(c => c.phone === phone) : undefined;
    if (exact && exact.id !== selectedId) {
      pick(exact);
      return;
    }
    set({ phone }, true);
  };

  const dropdown = (field: "name" | "phone") =>
    focus === field && matches.length > 0 && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-xl shadow-xl z-30 overflow-hidden">
        {matches.map(c => (
          <button
            type="button"
            key={c.id}
            onMouseDown={e => e.preventDefault()}
            onClick={() => pick(c)}
            className="w-full text-left px-3 py-2.5 hover:bg-surface active:bg-surface border-b border-line last:border-0"
          >
            <p className="font-medium text-ink text-[15px]">{c.name}</p>
            <p className="text-[13px] text-ink-3 num">{c.phone}{c.address ? ` · ${c.address}` : ""}</p>
          </button>
        ))}
      </div>
    );

  return (
    <div className="space-y-3">
      {selectedId && (
        <div className="flex items-center gap-2 text-[13px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <UserCheck size={16} />
          <span className="flex-1">Existing customer — history and dues will be linked</span>
          <button type="button" onClick={() => { onSelect(null); onChange(emptyCustomer); }} className="p-1 -m-1" aria-label="Clear customer"><X size={16} /></button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <label className="label">Phone{phoneRequired ? " *" : ""}</label>
          <input
            className="input num tracking-wide"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={value.phone}
            onChange={e => onPhone(e.target.value)}
            onFocus={() => setFocus("phone")}
            onBlur={() => setTimeout(() => setFocus(null), 150)}
            placeholder="10-digit mobile"
          />
          {dropdown("phone")}
        </div>
        <div className="relative">
          <label className="label">Customer name *</label>
          <input
            className="input"
            autoComplete="off"
            value={value.name}
            onChange={e => set({ name: e.target.value }, true)}
            onFocus={() => setFocus("name")}
            onBlur={() => setTimeout(() => setFocus(null), 150)}
            placeholder="Name or company"
          />
          {dropdown("name")}
        </div>
      </div>
      <div className={`grid grid-cols-1 ${showGstin ? "sm:grid-cols-2" : ""} gap-3`}>
        <div>
          <label className="label">Address / site</label>
          <input className="input" value={value.address} onChange={e => set({ address: e.target.value })} placeholder="Village, town" />
        </div>
        {showGstin && (
          <div>
            <label className="label">GSTIN <span className="text-ink-3 font-normal">(for business customers)</span></label>
            <input className="input uppercase placeholder:normal-case" value={value.gstin} maxLength={15} onChange={e => set({ gstin: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "") })} placeholder="Optional" />
          </div>
        )}
      </div>
    </div>
  );
}
