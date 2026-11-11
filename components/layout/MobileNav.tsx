"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ScrollText, Plus, Package, Menu, Receipt, FileText, PackagePlus, IndianRupee, Wallet, X } from "lucide-react";

const QUICK = [
  { name: "New invoice", desc: "Bill a customer", href: "/billing", icon: Receipt, tone: "bg-brand-600 text-white" },
  { name: "New quotation", desc: "Send a price estimate", href: "/quotation", icon: FileText, tone: "bg-emerald-600 text-white" },
  { name: "Stock in", desc: "Record purchased stock", href: "/inventory?action=stock-in", icon: PackagePlus, tone: "bg-surface text-ink" },
  { name: "Receive payment", desc: "Collect a pending balance", href: "/customers?filter=pending", icon: IndianRupee, tone: "bg-surface text-ink" },
  { name: "Add expense", desc: "Fuel, transport, labour…", href: "/expenses?action=add", icon: Wallet, tone: "bg-surface text-ink" },
];

export function MobileNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);

  const tab = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link href={href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-medium ${active ? "text-brand-700" : "text-ink-3"}`}>
        <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-line pb-safe" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch">
          {tab("/", "Home", LayoutDashboard)}
          {tab("/sales", "Sales", ScrollText)}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setQuickOpen(true)}
              aria-label="Create new"
              className="-mt-6 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-900/30 flex items-center justify-center active:scale-95 transition-transform ring-4 ring-surface"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>
          {tab("/inventory", "Stock", Package)}
          <button onClick={onMenu} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-medium text-ink-3">
            <Menu size={22} />
            More
          </button>
        </div>
      </nav>

      {quickOpen && (
        <div className="md:hidden fixed inset-0 z-[95] flex items-end" onClick={() => setQuickOpen(false)}>
          <div className="absolute inset-0 bg-ink/50" />
          <div className="relative w-full bg-white rounded-t-2xl p-4 pb-safe animate-[sheet_200ms_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-ink">Create</p>
              <button className="icon-btn" onClick={() => setQuickOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="space-y-1">
              {QUICK.map(q => (
                <Link key={q.name} href={q.href} onClick={() => setQuickOpen(false)} className="flex items-center gap-3 p-2 rounded-xl active:bg-surface">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${q.tone}`}><q.icon size={20} /></span>
                  <span>
                    <span className="block font-semibold text-ink text-[15px]">{q.name}</span>
                    <span className="block text-[13px] text-ink-3">{q.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
            <style>{`@keyframes sheet { from { transform: translateY(24px); opacity: .6 } to { transform: none; opacity: 1 } }`}</style>
          </div>
        </div>
      )}
    </>
  );
}
