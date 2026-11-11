"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { PAGE_HELP } from "../../lib/helpContent";
import { LucideIcon } from "lucide-react";
import { PaymentStatus } from "../../types";

export const inr = (n: number, decimals = 0) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const inr2 = (n: number) => inr(n, 2);

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  const pathname = usePathname();
  const topic = PAGE_HELP[pathname];
  return (
    <div className="flex items-end justify-between gap-3 mb-4 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-3 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {topic && (
          <Link href={`/help#${topic}`} className="hidden md:inline-flex icon-btn" title="How to use this page" aria-label="Help for this page">
            <HelpCircle size={19} />
          </Link>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status, overdue }: { status?: PaymentStatus; overdue?: boolean }) {
  const s = status || "paid";
  if (s === "paid") return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Paid</span>;
  if (overdue) return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">Overdue</span>;
  if (s === "partial") return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 ring-1 ring-amber-200">Partial</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">Unpaid</span>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3">
        <Icon size={22} className="text-ink-3" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="text-sm text-ink-3 mt-1 max-w-xs">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default", href }: {
  label: string; value: string; sub?: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "brand"; href?: string;
}) {
  const tones = {
    default: "text-ink",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
    brand: "text-brand-700",
  };
  const body = (
    <div className={`card p-3.5 md:p-4 h-full ${href ? "hover:border-brand-300 transition-colors" : ""}`}>
      <p className="text-[13px] text-ink-3 font-medium">{label}</p>
      <p className={`num text-lg md:text-2xl font-semibold mt-1 truncate ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-ink-3 mt-0.5 truncate">{sub}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-3 text-sm">
      <span className="h-5 w-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      {text}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex p-1 bg-surface border border-line rounded-lg">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 h-8 rounded-md text-[13px] font-medium transition-colors ${value === o.value ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9"
      />
    </div>
  );
}
