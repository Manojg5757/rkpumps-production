"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { StockReport } from "../../components/reports/StockReport";
import { EntryReport } from "../../components/reports/EntryReport";
import { GstReport } from "../../components/reports/GstReport";
import { ProfitReport } from "../../components/reports/ProfitReport";
import { Loading, PageHeader } from "../../components/ui/Common";
import { getProducts, getStockEntries, getSales, getExpenses } from "../../lib/db";
import { Expense, Product, Sale, StockEntry } from "../../types";

type Tab = "gst" | "profit" | "stock" | "entries";
const TABS: { value: Tab; label: string }[] = [
  { value: "gst", label: "GST summary" },
  { value: "profit", label: "Profit & loss" },
  { value: "stock", label: "Stock report" },
  { value: "entries", label: "Stock entries" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("gst");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [entries, setEntries] = useState<StockEntry[] | null>(null);
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && TABS.some(x => x.value === t)) setTab(t);
  }, []);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const jobs: Promise<unknown>[] = [];
      if ((tab === "stock" || tab === "entries") && (force || !products)) jobs.push(getProducts().then(setProducts));
      if ((tab === "entries" || tab === "profit") && (force || !entries)) jobs.push(getStockEntries().then(setEntries));
      if ((tab === "gst" || tab === "profit") && (force || !sales)) jobs.push(getSales().then(setSales));
      if (tab === "profit" && (force || !expenses)) jobs.push(getExpenses().then(setExpenses));
      await Promise.all(jobs);
    } catch {
      toast.error("Could not load report data");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [tab]);

  const ready =
    (tab === "gst" && sales) || (tab === "profit" && sales && expenses && entries) ||
    (tab === "stock" && products) || (tab === "entries" && products && entries);

  return (
    <div>
      <div className="print:hidden">
        <PageHeader title="Reports" subtitle="GST, profit and stock" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {TABS.map(t => (
            <button key={t.value} onClick={() => setTab(t.value)} className={tab === t.value ? "chip-active" : "chip"}>{t.label}</button>
          ))}
        </div>
      </div>

      {loading && !ready ? <Loading /> : (
        <>
          {tab === "gst" && sales && <GstReport sales={sales} />}
          {tab === "profit" && sales && expenses && entries && <ProfitReport sales={sales} expenses={expenses} entries={entries} />}
          {tab === "stock" && products && <StockReport products={products} />}
          {tab === "entries" && products && entries && <EntryReport entries={entries} products={products.filter(p => !p.isService)} onNewEntry={() => load(true)} />}
        </>
      )}
    </div>
  );
}
