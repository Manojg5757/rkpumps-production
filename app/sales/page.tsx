"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Download, Plus, ScrollText } from "lucide-react";
import { getSales } from "../../lib/db";
import { Sale } from "../../types";
import { SalesTable } from "../../components/sales/SalesTable";
import { AddPaymentModal } from "../../components/sales/AddPaymentModal";
import { InvoiceDetailModal } from "../../components/sales/InvoiceDetailModal";
import { EmptyState, Loading, PageHeader, SearchInput, Stat, inr } from "../../components/ui/Common";
import { daysSince, saleTotal } from "../../lib/gst";
import { RANGE_LABELS, RangeKey, downloadCsv, inRange, rangeBounds } from "../../lib/dates";
import { formatDate } from "../../lib/utils";

type StatusFilter = "all" | "due" | "overdue" | "paid";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<RangeKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [paying, setPaying] = useState<Sale | null>(null);

  const load = async () => {
    try {
      setSales(await getSales());
    } catch {
      toast.error("Could not load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = p.get("status");
    if (f === "due" || f === "overdue" || f === "paid") setStatus(f);
    load();
  }, []);

  const filtered = useMemo(() => {
    const bounds = rangeBounds(range, from, to);
    const term = search.trim().toLowerCase();
    return sales.filter(s => {
      if (!inRange(s.date, bounds)) return false;
      const pending = s.pendingAmount || 0;
      if (status === "due" && pending <= 0) return false;
      if (status === "paid" && pending > 0) return false;
      if (status === "overdue" && !(pending > 0 && daysSince(s.date) > 30)) return false;
      if (!term) return true;
      return (
        s.customer.name.toLowerCase().includes(term) ||
        s.billNumber.toLowerCase().includes(term) ||
        (s.customer.phone || "").includes(term) ||
        (s.customer.gstin || "").toLowerCase().includes(term) ||
        s.items.some(i => i.name.toLowerCase().includes(term))
      );
    });
  }, [sales, search, range, from, to, status]);

  const totalSales = filtered.reduce((sum, s) => sum + saleTotal(s), 0);
  const totalGST = filtered.reduce((sum, s) => sum + s.totalGSTAmount, 0);
  const totalPending = filtered.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);

  const exportCsv = () => {
    if (!filtered.length) return toast.error("No invoices to export");
    downloadCsv(
      `Sales_${RANGE_LABELS[range].replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Bill Number", "Customer Name", "Customer Phone", "GSTIN", "Place of Supply", "Taxable Amount", "CGST", "SGST", "IGST", "GST Amount", "Round Off", "Invoice Total", "Paid Amount", "Pending Amount", "Payment Status"],
      filtered.map(s => [
        formatDate(new Date(s.date)), s.billNumber, s.customer.name, s.customer.phone || "", s.customer.gstin || "", s.placeOfSupply || "",
        s.totalTaxableAmount.toFixed(2),
        (s.isInterState ? 0 : s.totalGSTAmount / 2).toFixed(2),
        (s.isInterState ? 0 : s.totalGSTAmount / 2).toFixed(2),
        (s.isInterState ? s.totalGSTAmount : 0).toFixed(2),
        s.totalGSTAmount.toFixed(2), (s.roundOff ?? 0).toFixed(2), saleTotal(s).toFixed(2),
        (s.paidAmount || 0).toFixed(2), (s.pendingAmount || 0).toFixed(2), s.paymentStatus || "paid",
      ])
    );
  };

  return (
    <div>
      <PageHeader
        title="Sales History"
        subtitle={`${sales.length} invoices`}
        actions={
          <>
            <button onClick={exportCsv} className="btn-secondary px-3" title="Export CSV"><Download size={18} /><span className="hidden sm:inline">Export</span></button>
            <Link href="/billing" className="btn-primary hidden md:inline-flex"><Plus size={18} /> New invoice</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Sales" value={inr(totalSales)} sub={`${filtered.length} invoices`} />
        <Stat label="GST collected" value={inr(totalGST)} />
        <Stat label="Balance due" value={inr(totalPending)} tone={totalPending > 0 ? "warn" : "default"} />
        <Stat label="Received" value={inr(totalSales - totalPending)} tone="good" />
      </div>

      <div className="space-y-2.5 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customer, phone, bill no., item" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["all", "due", "overdue", "paid"] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatus(s)} className={status === s ? "chip-active" : "chip"}>
              {s === "all" ? "All" : s === "due" ? "Balance due" : s === "overdue" ? "Overdue 30d+" : "Paid"}
            </button>
          ))}
          <span className="w-px bg-line mx-1 shrink-0" />
          {(["all", "today", "week", "month", "lastMonth", "fy", "custom"] as RangeKey[]).map(r => (
            <button key={r} onClick={() => setRange(r)} className={range === r ? "chip-active" : "chip"}>{RANGE_LABELS[r]}</button>
          ))}
        </div>
        {range === "custom" && (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            <div><label className="label">From</label><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><label className="label">To</label><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} /></div>
          </div>
        )}
      </div>

      {loading ? (
        <Loading text="Loading invoices…" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={ScrollText} title="No invoices found" text={sales.length ? "Try a different search or date range." : "Your saved invoices will appear here."}
            action={!sales.length ? <Link href="/billing" className="btn-primary"><Plus size={18} /> Create first invoice</Link> : undefined} />
        </div>
      ) : (
        <SalesTable sales={filtered} onOpen={setViewing} onAddPayment={setPaying} />
      )}

      {viewing && <InvoiceDetailModal sale={viewing} onClose={() => setViewing(null)} onAddPayment={s => { setPaying(s); }} />}
      {paying && (
        <AddPaymentModal
          sale={paying}
          onClose={() => setPaying(null)}
          onPaymentAdded={async () => {
            setPaying(null);
            setViewing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
