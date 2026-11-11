"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { StockEntry, Product, Supplier } from "../../types";
import { getSuppliers } from "../../lib/db";
import { StockMoveModal } from "../inventory/StockMoveModal";
import { SearchInput, inr2 } from "../ui/Common";
import { RANGE_LABELS, RangeKey, downloadCsv, inRange, rangeBounds } from "../../lib/dates";
import { formatDateTime } from "../../lib/utils";

interface EntryReportProps {
  entries: StockEntry[];
  products: Product[];
  onNewEntry: () => void;
}

export function EntryReport({ entries, products, onNewEntry }: EntryReportProps) {
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [range, setRange] = useState<RangeKey>("month");
  const [search, setSearch] = useState("");

  useEffect(() => { getSuppliers().then(setSuppliers).catch(() => {}); }, []);
  const supName = (id?: string) => (id ? suppliers.find(s => s.id === id)?.name || "" : "");

  const filtered = useMemo(() => {
    const b = rangeBounds(range);
    const q = search.toLowerCase();
    return entries.filter(e =>
      (filterType === "ALL" || e.type === filterType) &&
      inRange(e.date, b) &&
      (!q || e.productName.toLowerCase().includes(q) || (e.note || "").toLowerCase().includes(q) || (e.invoiceNumber || "").toLowerCase().includes(q))
    );
  }, [entries, filterType, range, search]);

  const purchaseValue = filtered.filter(e => e.type === "IN").reduce((s, e) => s + (e.purchasePrice || 0) * e.quantity, 0);

  const exportCsv = () =>
    downloadCsv(`Stock_Register_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Date", "Product", "Category", "Type", "Qty", "Unit", "Purchase Price", "Supplier", "Supplier Bill", "Note"],
      filtered.map(e => [formatDateTime(new Date(e.date)), e.productName, e.categoryName, e.type, e.quantity, e.unitName,
        e.purchasePrice ? e.purchasePrice.toFixed(2) : "", supName(e.supplierId), e.invoiceNumber || "", e.note || ""]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-2">{filtered.length} entries · purchases <b className="num">{inr2(purchaseValue)}</b></p>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary px-3"><Download size={17} /><span className="hidden sm:inline">CSV</span></button>
          <button onClick={() => setShowForm(true)} className="btn-primary px-3"><Plus size={17} /><span className="hidden sm:inline">Stock entry</span></button>
        </div>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search product, note or bill no." />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(["ALL", "IN", "OUT"] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={filterType === t ? "chip-active" : "chip"}>{t === "ALL" ? "In & out" : t === "IN" ? "Stock in" : "Stock out"}</button>
        ))}
        <span className="w-px bg-line mx-1 shrink-0" />
        {(["all", "today", "week", "month", "lastMonth", "fy"] as RangeKey[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={range === r ? "chip-active" : "chip"}>{RANGE_LABELS[r]}</button>
        ))}
      </div>

      <ul className="card divide-y divide-line">
        {filtered.map(e => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <span className={`w-11 text-center text-xs font-bold py-1 rounded-md ${e.type === "IN" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{e.type}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{e.productName}</p>
              <p className="text-[13px] text-ink-3 truncate">
                {formatDateTime(new Date(e.date))}
                {supName(e.supplierId) && ` · ${supName(e.supplierId)}`}
                {e.note && ` · ${e.note}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="num font-semibold">{e.type === "IN" ? "+" : "−"}{e.quantity} <span className="text-xs text-ink-3 font-normal">{e.unitName}</span></p>
              {e.purchasePrice ? <p className="text-xs text-ink-3 num">@ {inr2(e.purchasePrice)}</p> : null}
            </div>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-3">No stock entries for this period.</li>}
      </ul>

      {showForm && (
        <StockMoveModal products={products} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); onNewEntry(); }} />
      )}
    </div>
  );
}
