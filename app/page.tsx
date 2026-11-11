"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowRight, Clock, FileText, PackagePlus, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { RevenueChart, PurchaseSalesChart } from "../components/dashboard/RevenueChart";
import { getSales, getExpenses, getProducts, getStockEntries, getPayments } from "../lib/db";
import { Sale, Product, Expense, StockEntry, Payment } from "../types";
import { daysSince, saleCost, saleProfit, saleTotal } from "../lib/gst";
import { inRange, rangeBounds } from "../lib/dates";
import { formatDate } from "../lib/utils";
import { InvoiceDetailModal } from "../components/sales/InvoiceDetailModal";
import { SetupChecklist } from "../components/dashboard/SetupChecklist";
import { AddPaymentModal } from "../components/sales/AddPaymentModal";
import { Loading, Segmented, Stat, StatusBadge, inr } from "../components/ui/Common";

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fastBy, setFastBy] = useState<"qty" | "revenue">("qty");
  const [deadDays, setDeadDays] = useState<30 | 60 | 90>(30);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [paying, setPaying] = useState<Sale | null>(null);

  const load = async () => {
    try {
      const [s, p, e, se, pay] = await Promise.all([getSales(), getProducts(), getExpenses(), getStockEntries(), getPayments()]);
      setSales(s); setProducts(p); setExpenses(e); setEntries(se); setPayments(pay);
    } catch {
      toast.error("Could not load the dashboard. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const d = useMemo(() => {
    const today = rangeBounds("today");
    const month = rangeBounds("month");
    const todaySales = sales.filter(s => inRange(s.date, today));
    const monthSales = sales.filter(s => inRange(s.date, month));
    const monthExpenses = expenses.filter(e => inRange(e.createdAt, month)).reduce((s, e) => s + e.amount, 0);
    const todayExpenses = expenses.filter(e => inRange(e.createdAt, today)).reduce((s, e) => s + e.amount, 0);

    const monthRevenue = monthSales.reduce((s, x) => s + saleTotal(x), 0);
    const monthTaxable = monthSales.reduce((s, x) => s + x.totalTaxableAmount, 0);
    const monthCogs = monthSales.reduce((s, x) => s + saleCost(x), 0);
    const monthNet = monthTaxable - monthCogs - monthExpenses;
    const monthBought = entries.filter(e => e.type === "IN" && inRange(e.date, month)).reduce((s, e) => s + (e.purchasePrice || 0) * e.quantity, 0);

    const pendingSales = sales.filter(s => (s.pendingAmount || 0) > 0);
    const totalPending = pendingSales.reduce((s, x) => s + x.pendingAmount, 0);
    const overdue = pendingSales.filter(s => daysSince(s.date) > 30).reduce((s, x) => s + x.pendingAmount, 0);

    const byCust: Record<string, { name: string; phone: string; pending: number; oldest: Date; count: number }> = {};
    pendingSales.forEach(s => {
      const c = (byCust[s.customerId] ||= { name: s.customer.name, phone: s.customer.phone, pending: 0, oldest: new Date(s.date), count: 0 });
      c.pending += s.pendingAmount; c.count++;
      if (new Date(s.date) < c.oldest) c.oldest = new Date(s.date);
    });
    const pendingCustomers = Object.entries(byCust).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.pending - a.pending);

    // fast moving — last 30 days
    const last30 = sales.filter(s => daysSince(s.date) <= 30);
    const pm: Record<string, { id: string; name: string; qty: number; revenue: number; unit: string }> = {};
    last30.forEach(s => s.items.forEach(i => {
      if (i.isService) return;
      const r = (pm[i.productId] ||= { id: i.productId, name: i.name, qty: 0, revenue: 0, unit: i.unitName });
      r.qty += i.quantity; r.revenue += i.lineTotal;
    }));
    const moving = Object.values(pm);

    const lowStock = products.filter(p => !p.isService && p.stockQuantity <= p.lowStockThreshold).sort((a, b) => a.stockQuantity - b.stockQuantity);
    const fastIds = new Set(moving.sort((a, b) => b.qty - a.qty).slice(0, 10).map(m => m.id));

    return {
      todaySales, todayRevenue: todaySales.reduce((s, x) => s + saleTotal(x), 0),
      todayProfit: todaySales.reduce((s, x) => s + saleProfit(x), 0) - todayExpenses,
      todayCollected: payments.filter(p => inRange(p.createdAt, today)).reduce((s, p) => s + p.amount, 0),
      monthSales, monthRevenue, monthTaxable, monthCogs, monthExpenses, monthNet, monthBought,
      totalPending, overdue, pendingCount: pendingSales.length, pendingCustomers,
      moving, lowStock, fastIds,
    };
  }, [sales, products, expenses, entries, payments]);

  const fastMoving = [...d.moving].sort((a, b) => (fastBy === "qty" ? b.qty - a.qty : b.revenue - a.revenue)).slice(0, 6);

  const deadStock = useMemo(() => {
    const lastSold: Record<string, number> = {};
    sales.forEach(s => s.items.forEach(i => { lastSold[i.productId] = Math.max(lastSold[i.productId] || 0, new Date(s.date).getTime()); }));
    const cutoff = Date.now() - deadDays * 86400000;
    return products
      .filter(p => !p.isService && p.stockQuantity > 0 && (lastSold[p.id] || 0) < cutoff)
      .map(p => ({ ...p, locked: p.stockQuantity * (p.purchasePrice || 0), last: lastSold[p.id] }))
      .sort((a, b) => b.locked - a.locked);
  }, [sales, products, deadDays]);
  const deadValue = deadStock.reduce((s, p) => s + p.locked, 0);

  if (loading) return <Loading text="Loading dashboard…" />;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header + quick actions */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{greeting}</h1>
        </div>
        <div className="grid grid-cols-4 md:flex gap-2">
          <QuickAction href="/billing" icon={Receipt} label="Invoice" primary />
          <QuickAction href="/quotation" icon={FileText} label="Quotation" />
          <QuickAction href="/inventory?action=stock-in" icon={PackagePlus} label="Stock in" />
          <QuickAction href="/expenses?action=add" icon={Wallet} label="Expense" />
        </div>
      </div>

      <SetupChecklist products={products} sales={sales} />

      {/* Today */}
      <div className="card p-4 bg-ink text-white border-ink">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Today</p>
          <Link href="/sales" className="text-xs text-white/60 hover:text-white">{d.todaySales.length} invoice{d.todaySales.length === 1 ? "" : "s"}</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><p className="text-xs text-white/60">Sales</p><p className="num text-lg md:text-2xl font-semibold">{inr(d.todayRevenue)}</p></div>
          <div><p className="text-xs text-white/60">Collected</p><p className="num text-lg md:text-2xl font-semibold">{inr(d.todayCollected)}</p></div>
          <div><p className="text-xs text-white/60">Profit</p><p className={`num text-lg md:text-2xl font-semibold ${d.todayProfit < 0 ? "text-red-300" : ""}`}>{inr(d.todayProfit)}</p></div>
        </div>
      </div>

      {/* This month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sales this month" value={inr(d.monthRevenue)} sub={`${d.monthSales.length} invoices`} href="/sales" />
        <Stat label="Net profit this month" value={inr(d.monthNet)} sub={`after ${inr(d.monthExpenses)} expenses`} tone={d.monthNet < 0 ? "bad" : "good"} href="/reports?tab=profit" />
        <Stat label="To collect" value={inr(d.totalPending)} sub={d.overdue ? `${inr(d.overdue)} overdue 30d+` : `${d.pendingCount} invoices`} tone={d.overdue ? "bad" : d.totalPending ? "warn" : "default"} href="/customers?filter=pending" />
        <Stat label="Low stock" value={String(d.lowStock.length)} sub="items to reorder" tone={d.lowStock.length ? "warn" : "default"} href="/inventory?filter=low" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <h2 className="font-semibold mb-3">Sales &amp; profit</h2>
          <RevenueChart sales={sales} />
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-1">This month&apos;s profit</h2>
          <p className="text-xs text-ink-3 mb-3">Sales excluding GST</p>
          <div className="space-y-2 text-sm">
            <PL label="Sales" value={d.monthTaxable} />
            <PL label="Cost of goods sold" value={-d.monthCogs} />
            <PL label="Expenses" value={-d.monthExpenses} />
            <div className="flex justify-between font-semibold pt-2 border-t border-line">
              <span>Net profit</span>
              <span className={`num ${d.monthNet < 0 ? "text-red-700" : "text-emerald-700"}`}>{inr(d.monthNet)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-ink-3">Stock bought this month</span><span className="num">{inr(d.monthBought)}</span></div>
            <div className="flex justify-between"><span className="text-ink-3">Sold this month (excl. GST)</span><span className="num">{inr(d.monthTaxable)}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pending customers */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Clock size={16} className="text-amber-600" /> Who owes you</h2>
            <Link href="/customers?filter=pending" className="text-[13px] text-brand-700">View all</Link>
          </div>
          {d.pendingCustomers.length === 0 ? <p className="text-sm text-ink-3 py-6 text-center">Everyone has paid.</p> : (
            <ul className="divide-y divide-line -mx-1">
              {d.pendingCustomers.slice(0, 6).map(c => {
                const days = daysSince(c.oldest);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-1 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-ink-3 num">{c.phone} · {c.count} bill{c.count > 1 ? "s" : ""} · {days}d</p>
                    </div>
                    <span className={`num font-semibold text-sm ${days > 30 ? "text-red-700" : days > 7 ? "text-amber-700" : "text-ink"}`}>{inr(c.pending)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Fast moving */}
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600" /> Selling fast</h2>
            <Segmented<"qty" | "revenue"> value={fastBy} onChange={setFastBy} options={[{ value: "qty", label: "Qty" }, { value: "revenue", label: "₹" }]} />
          </div>
          <p className="text-xs text-ink-3 -mt-2 mb-2">Last 30 days</p>
          {fastMoving.length === 0 ? <p className="text-sm text-ink-3 py-6 text-center">No sales in the last 30 days.</p> : (
            <ul className="space-y-2">
              {fastMoving.map((p, i) => {
                const max = fastBy === "qty" ? fastMoving[0].qty : fastMoving[0].revenue;
                const val = fastBy === "qty" ? p.qty : p.revenue;
                return (
                  <li key={p.id}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate"><span className="text-ink-3 num mr-1.5">{i + 1}</span>{p.name}</span>
                      <span className="num font-medium shrink-0">{fastBy === "qty" ? `${Math.round(p.qty * 100) / 100} ${p.unit}` : inr(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full mt-1"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${max ? (val / max) * 100 : 0}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Low stock */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> Reorder soon</h2>
            <Link href="/inventory?filter=low" className="text-[13px] text-brand-700">View all</Link>
          </div>
          {d.lowStock.length === 0 ? <p className="text-sm text-ink-3 py-6 text-center">Stock levels look fine.</p> : (
            <ul className="divide-y divide-line -mx-1">
              {d.lowStock.slice(0, 6).map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-1 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-ink-3">
                      {d.fastIds.has(p.id) && <span className="text-red-700 font-semibold">Selling fast · </span>}
                      alert at {p.lowStockThreshold}
                    </p>
                  </div>
                  <span className={`num text-sm font-semibold ${p.stockQuantity <= 0 ? "text-red-700" : "text-amber-700"}`}>
                    {p.stockQuantity <= 0 ? "Out" : `${p.stockQuantity} ${p.unitName}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Stock bought vs sold</h2>
          <PurchaseSalesChart sales={sales} entries={entries} />
        </div>

        {/* Recent invoices */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Recent invoices</h2>
            <Link href="/sales" className="text-[13px] text-brand-700">View all</Link>
          </div>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-3 mb-3">No invoices yet.</p>
              <Link href="/billing" className="btn-primary"><Receipt size={18} /> Create first invoice</Link>
            </div>
          ) : (
            <ul className="divide-y divide-line -mx-1">
              {sales.slice(0, 6).map(s => (
                <li key={s.id}>
                  <button onClick={() => setViewing(s)} className="w-full flex items-center justify-between gap-2 px-1 py-2.5 text-left hover:bg-surface/60 rounded">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.customer.name}</p>
                      <p className="text-xs text-ink-3 num">{s.billNumber} · {formatDate(new Date(s.date))}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="num font-semibold text-sm">{inr(saleTotal(s))}</p>
                      <StatusBadge status={s.paymentStatus} overdue={(s.pendingAmount || 0) > 0 && daysSince(s.date) > 30} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dead stock */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="font-semibold flex items-center gap-2"><TrendingDown size={16} className="text-amber-600" /> Not selling</h2>
          <Segmented<"30" | "60" | "90"> value={String(deadDays) as "30" | "60" | "90"} onChange={v => setDeadDays(Number(v) as 30 | 60 | 90)}
            options={[{ value: "30", label: "30 days" }, { value: "60", label: "60 days" }, { value: "90", label: "90 days" }]} />
        </div>
        <p className="text-sm text-ink-3 mb-3">
          {deadStock.length} items with no sale in {deadDays} days · <b className="text-amber-800 num">{inr(deadValue)}</b> of money locked in stock
        </p>
        {deadStock.length > 0 && (
          <ul className="divide-y divide-line -mx-1">
            {deadStock.slice(0, 8).map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-1 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-ink-3">{p.stockQuantity} {p.unitName} · {p.last ? `last sold ${formatDate(new Date(p.last))}` : "never sold"}</p>
                </div>
                <span className="num text-sm font-semibold text-amber-800">{p.locked ? inr(p.locked) : "—"}</span>
              </li>
            ))}
          </ul>
        )}
        {deadStock.length > 8 && <Link href="/reports?tab=stock" className="text-[13px] text-brand-700 inline-flex items-center gap-1 mt-2">Full stock report <ArrowRight size={14} /></Link>}
      </div>

      {viewing && <InvoiceDetailModal sale={viewing} onClose={() => setViewing(null)} onAddPayment={setPaying} />}
      {paying && <AddPaymentModal sale={paying} onClose={() => setPaying(null)} onPaymentAdded={() => { setPaying(null); setViewing(null); load(); }} />}
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, primary }: { href: string; icon: typeof Receipt; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 h-16 md:h-10 md:px-4 rounded-xl md:rounded-lg text-xs md:text-sm font-semibold transition-colors ${
        primary ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-white border border-line text-ink hover:bg-surface"
      }`}
    >
      <Icon size={20} className="md:w-[18px] md:h-[18px]" />
      {label}
    </Link>
  );
}

function PL({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-2">{label}</span>
      <span className={`num ${value < 0 ? "text-ink-2" : ""}`}>{value < 0 ? `− ${inr(-value)}` : inr(value)}</span>
    </div>
  );
}
