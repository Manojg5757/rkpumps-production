"use client";

import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileUp } from "lucide-react";
import { Modal } from "../ui/Modal";
import { inr2 } from "../ui/Common";
import { Category, Product, Unit } from "../../types";
import { buildPlan, ImportPlan, PlannedRow, readSpreadsheet } from "../../lib/importProducts";
import { importProducts } from "../../lib/db";

type Step = "pick" | "preview" | "saving" | "done";
type View = "all" | "create" | "update" | "problems" | "verify";

export function ImportProductsModal({ products, categories, units, onClose, onImported }: {
  products: Product[];
  categories: Category[];
  units: Unit[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState<unknown[][] | null>(null);
  const [inclGst, setInclGst] = useState(true);
  const [addStock, setAddStock] = useState(false);
  const [view, setView] = useState<View>("all");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ created: number; updated: number; categoriesAdded: number; unitsAdded: number; stockAdded: number } | null>(null);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan: ImportPlan | null = useMemo(() => {
    if (!raw) return null;
    try {
      return buildPlan(raw, { products, categories, units }, { saleIncludesGst: inclGst, addStockToExisting: addStock });
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }, [raw, products, categories, units, inclGst, addStock]);

  const pick = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try {
      const rows = await readSpreadsheet(file);
      setFileName(file.name);
      setRaw(rows);
      setStep("preview");
    } catch (e) {
      toast.error((e as Error).message || "Could not read the file");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const run = async () => {
    if (!plan) return;
    setStep("saving");
    try {
      const res = await importProducts(plan.rows, { categories, units }, (done, total) => setProgress({ done, total }), plan.columns);
      setResult(res);
      setStep("done");
      onImported();
    } catch (e) {
      toast.error(`Import stopped: ${(e as Error).message}. Products saved before the error are kept — import the same file again to finish.`, { duration: 8000 });
      setStep("preview");
      onImported();
    }
  };

  const shown = plan
    ? plan.rows.filter(r =>
        view === "all" ? true :
        view === "create" ? r.action === "create" :
        view === "update" ? r.action === "update" :
        view === "verify" ? r.verifyWithCA && r.action !== "skip" :
        r.action === "skip" || r.warnings.length > 0)
    : [];

  const footer =
    step === "preview" && plan ? (
      <div className="flex items-center gap-3">
        <button className="btn-secondary" onClick={() => { setRaw(null); setStep("pick"); }}>Choose another file</button>
        <button className="btn-primary flex-1" disabled={plan.counts.create + plan.counts.update === 0} onClick={run}>
          Import {plan.counts.create + plan.counts.update} products
        </button>
      </div>
    ) : step === "done" ? (
      <button className="btn-primary w-full" onClick={onClose}>Done</button>
    ) : undefined;

  return (
    <Modal
      title="Import products"
      subtitle={fileName || "From an Excel (.xlsx) or CSV file"}
      onClose={step === "saving" ? () => {} : onClose}
      size="xl"
      fullOnMobile
      footer={footer}
    >
      {step === "pick" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={reading}
            className="w-full border-2 border-dashed border-line rounded-xl py-10 flex flex-col items-center gap-2 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
          >
            <FileSpreadsheet size={32} className="text-brand-600" />
            <span className="font-semibold">{reading ? "Reading…" : "Choose Excel or CSV file"}</span>
            <span className="text-sm text-ink-3">Nothing is saved until you review and confirm</span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => pick(e.target.files?.[0])} />

          <div className="rounded-lg bg-surface p-4 text-sm space-y-2">
            <p className="font-semibold">Columns the importer understands</p>
            <ul className="text-ink-2 space-y-1 list-disc pl-5">
              <li><b>Item Name</b> (required), Item Code, Category, HSN/SAC, GST %, Unit</li>
              <li><b>Sale Rate</b> — if the header says “incl GST” or “excl GST”, that is used automatically</li>
              <li>Purchase Rate (excl. GST), Opening Stock, Low Stock Alert</li>
              <li>Type = “Service” for labour items (no stock)</li>
            </ul>
            <p className="text-ink-3">Items already in your inventory (same Item Code or same name) are <b>updated</b>, not duplicated. Empty price cells keep the current price.</p>
          </div>
        </div>
      )}

      {step === "preview" && plan && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Count label="New products" value={plan.counts.create} tone="text-emerald-700" />
            <Count label="Will be updated" value={plan.counts.update} tone="text-brand-700" />
            <Count label="Skipped (errors)" value={plan.counts.skip} tone={plan.counts.skip ? "text-red-700" : "text-ink"} />
            <Count label="With warnings" value={plan.counts.warnings} tone={plan.counts.warnings ? "text-amber-700" : "text-ink"} />
          </div>

          <div className="rounded-lg border border-line p-3 text-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Sale rate column <b>“{plan.saleHeader || "—"}”</b> is read as{" "}
                <b>{plan.saleIncludesGst ? "price including GST" : "price excluding GST"}</b>
              </span>
              {!/incl|excl/i.test(plan.saleHeader) && (
                <label className="flex items-center gap-2 text-ink-2">
                  <input type="checkbox" checked={inclGst} onChange={e => setInclGst(e.target.checked)} className="w-4 h-4 accent-brand-600" />
                  Prices include GST
                </label>
              )}
            </div>
            {plan.stockForExisting > 0 && (
              <label className="flex items-start gap-2 rounded-md bg-brand-50 p-2 text-ink">
                <input type="checkbox" checked={addStock} onChange={e => setAddStock(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-600" />
                <span>
                  <b>Add stock to existing items</b> — {plan.stockForExisting} items already in inventory have a quantity in this file.
                  Tick to add it to their stock (recorded as Stock in). Leave unticked to keep their stock as it is.
                </span>
              </label>
            )}
            {plan.newCategories.length > 0 && <p className="text-ink-2"><b>{plan.newCategories.length} new categories:</b> {plan.newCategories.join(", ")}</p>}
            {plan.newUnits.length > 0 && <p className="text-ink-2"><b>New units:</b> {plan.newUnits.join(", ")}</p>}
            {plan.counts.verify > 0 && (
              <p className="text-amber-800 flex items-start gap-1.5"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {plan.counts.verify} items are marked “Verify with CA” — imported with the GST rate in the file; please confirm the rates.</p>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {([
              ["all", `All ${plan.rows.length}`], ["create", `New ${plan.counts.create}`], ["update", `Update ${plan.counts.update}`],
              ["problems", "Problems & warnings"], ["verify", `Verify with CA ${plan.counts.verify}`],
            ] as [View, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} className={view === v ? "chip-active" : "chip"}>{l}</button>
            ))}
          </div>

          <ul className="divide-y divide-line border border-line rounded-xl">
            {shown.slice(0, 300).map(r => <PreviewRow key={r.row} r={r} />)}
            {shown.length === 0 && <li className="p-6 text-center text-sm text-ink-3">Nothing here.</li>}
          </ul>
        </div>
      )}

      {step === "saving" && (
        <div className="py-12 text-center space-y-4">
          <FileUp className="mx-auto text-brand-600" size={36} />
          <p className="font-semibold">Saving products…</p>
          <div className="h-2 bg-surface rounded-full max-w-sm mx-auto overflow-hidden">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 5}%` }} />
          </div>
          <p className="text-sm text-ink-3 num">{progress.done} of {progress.total || "…"} — keep this screen open</p>
        </div>
      )}

      {step === "done" && result && plan && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
            <p className="font-semibold text-lg mt-2">Import complete</p>
            <p className="text-sm text-ink-2 mt-1">
              {result.created} added · {result.updated} updated
              {result.categoriesAdded ? ` · ${result.categoriesAdded} categories` : ""}
              {result.unitsAdded ? ` · ${result.unitsAdded} units` : ""}
              {result.stockAdded ? ` · stock added to ${result.stockAdded}` : ""}
              {plan.counts.skip ? ` · ${plan.counts.skip} skipped` : ""}
            </p>
          </div>
          {plan.rows.some(r => r.verifyWithCA && r.action !== "skip") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900 mb-1">Ask your CA to confirm the GST rate for:</p>
              <ul className="list-disc pl-5 text-amber-900 space-y-0.5">
                {plan.rows.filter(r => r.verifyWithCA && r.action !== "skip").map(r => (
                  <li key={r.row}>{r.name} — {r.gstPercentage}%{r.hsnCode ? ` (HSN ${r.hsnCode})` : ""}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-ink-3">Prices from the file are a starting point — edit any product in Inventory to correct it.</p>
        </div>
      )}
    </Modal>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className={`num text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function PreviewRow({ r }: { r: PlannedRow }) {
  const badge =
    r.action === "skip" ? "bg-red-50 text-red-700 ring-red-200" :
    r.action === "update" ? "bg-brand-50 text-brand-700 ring-brand-100" :
    "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return (
    <li className="px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <span className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ring-1 ${badge}`}>
          {r.action === "skip" ? "Skip" : r.action === "update" ? "Update" : "New"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-snug">{r.name || <span className="text-ink-3">(no name)</span>}</p>
          <p className="text-xs text-ink-3 num mt-0.5">
            Row {r.row}{r.itemCode ? ` · ${r.itemCode}` : ""} · {r.categoryName} · {r.unitName}
            {r.hsnCode ? ` · HSN ${r.hsnCode}` : ""} · GST {r.gstPercentage}%{r.isService ? " · Service" : ""}
          </p>
        </div>
        <div className="text-right shrink-0 num">
          <p className="font-semibold">{r.basePrice !== undefined ? inr2(r.basePrice * (1 + r.gstPercentage / 100)) : "—"}</p>
          <p className="text-xs text-ink-3">
            {r.purchasePrice !== undefined ? `cost ${inr2(r.purchasePrice)}` : "no cost"}
            {!r.isService && r.openingStock > 0 && r.action === "create" ? ` · stock ${r.openingStock}` : ""}
            {r.addStock > 0 ? ` · +${r.addStock} stock` : ""}
          </p>
        </div>
      </div>
      {(r.errors.length > 0 || r.warnings.length > 0) && (
        <ul className="mt-1.5 ml-12 space-y-0.5 text-xs">
          {r.errors.map((e, i) => <li key={`e${i}`} className="text-red-700">✕ {e}</li>)}
          {r.warnings.map((w, i) => <li key={`w${i}`} className="text-amber-800">! {w}</li>)}
        </ul>
      )}
    </li>
  );
}
