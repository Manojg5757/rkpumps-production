"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { getSettings } from "../../lib/settings";
import { getQuotations } from "../../lib/db";
import { Product, Sale } from "../../types";

const HIDE_KEY = "rk_setup_hidden";

/** “Get set up” card on the dashboard. Ticks itself off from real data and disappears when done. */
export function SetupChecklist({ products, sales }: { products: Product[]; sales: Sale[] }) {
  const [gstin, setGstin] = useState<boolean | null>(null);
  const [quotes, setQuotes] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try { setHidden(localStorage.getItem(HIDE_KEY) === "1"); } catch { setHidden(false); }
    getSettings().then(s => setGstin(!!s.gstin)).catch(() => setGstin(false));
    getQuotations().then(q => setQuotes(q.length > 0)).catch(() => setQuotes(false));
  }, []);

  const steps = [
    { done: !!gstin, label: "Add your business details and GSTIN", href: "/settings", cta: "Settings" },
    { done: products.length > 0, label: "Add your products (import from Excel)", href: "/inventory", cta: "Inventory" },
    { done: products.some(p => !p.isService && p.stockQuantity > 0), label: "Record your opening stock", href: "/inventory?action=stock-in", cta: "Stock in" },
    { done: !!quotes, label: "Send your first quotation", href: "/quotation", cta: "Quotation" },
    { done: sales.length > 0, label: "Make your first invoice", href: "/billing", cta: "Invoice" },
  ];
  const doneCount = steps.filter(s => s.done).length;

  if (hidden || gstin === null || quotes === null || doneCount === steps.length) return null;

  return (
    <div className="card p-4 border-brand-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Get set up</p>
          <p className="text-sm text-ink-3">{doneCount} of {steps.length} done · <Link href="/help" className="text-brand-700">How to use the app</Link></p>
        </div>
        <button
          className="icon-btn -mr-2 -mt-2"
          aria-label="Hide setup checklist"
          onClick={() => { setHidden(true); try { localStorage.setItem(HIDE_KEY, "1"); } catch { /* ignore */ } }}
        >
          <X size={18} />
        </button>
      </div>
      <div className="h-1.5 bg-surface rounded-full my-3 overflow-hidden">
        <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-1">
        {steps.map(s => (
          <li key={s.label} className="flex items-center gap-3 py-1">
            {s.done ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <Circle size={20} className="text-line shrink-0" />}
            <span className={`flex-1 text-sm ${s.done ? "text-ink-3 line-through" : "text-ink"}`}>{s.label}</span>
            {!s.done && <Link href={s.href} className="btn-secondary h-8 px-3 text-[13px]">{s.cta}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
