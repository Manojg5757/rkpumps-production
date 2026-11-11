"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download, Plus, Trash2, Wallet } from "lucide-react";
import { getExpenses, addExpense, deleteExpense } from "../../lib/db";
import { Expense } from "../../types";
import { Modal } from "../../components/ui/Modal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState, Loading, PageHeader, Stat, inr, inr2 } from "../../components/ui/Common";
import { RANGE_LABELS, RangeKey, downloadCsv, inRange, rangeBounds } from "../../lib/dates";
import { formatDate } from "../../lib/utils";

const EXPENSE_CATEGORIES = [
  "Transport",
  "Fuel",
  "Labour / Electrician",
  "Shop Rent",
  "Repairs & Maintenance",
  "Tools & Equipment",
  "Packaging",
  "Utilities",
  "Miscellaneous",
];

const todayStr = () => new Date().toLocaleDateString("en-CA");

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [range, setRange] = useState<RangeKey>("month");

  const load = async () => {
    try { setExpenses(await getExpenses()); } catch { toast.error("Could not load expenses"); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("action") === "add") setShowForm(true);
    load();
  }, []);

  const filtered = useMemo(() => {
    const b = rangeBounds(range);
    return expenses.filter(e => (filterCategory === "ALL" || e.category === filterCategory) && inRange(e.createdAt, b));
  }, [expenses, filterCategory, range]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const monthTotal = expenses.filter(e => inRange(e.createdAt, rangeBounds("month"))).reduce((s, e) => s + e.amount, 0);
  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(e => (m[e.category] = (m[e.category] || 0) + e.amount));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const exportCsv = () =>
    downloadCsv(`Expenses_${RANGE_LABELS[range].replace(/\s/g, "_")}.csv`, ["Date", "Title", "Category", "Amount", "Note"],
      filtered.map(e => [formatDate(new Date(e.createdAt)), e.title, e.category, e.amount.toFixed(2), e.note || ""]));

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Fuel, transport, rent, labour"
        actions={
          <>
            <button className="btn-secondary px-3" onClick={exportCsv}><Download size={18} /><span className="hidden sm:inline">Export</span></button>
            <button className="btn-primary px-3" onClick={() => setShowForm(true)}><Plus size={18} /><span className="hidden sm:inline">Add expense</span></button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="This month" value={inr(monthTotal)} tone="bad" />
        <Stat label={`${RANGE_LABELS[range]}${filterCategory !== "ALL" ? ` · ${filterCategory}` : ""}`} value={inr(total)} sub={`${filtered.length} entries`} />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2 items-center">
        {(["today", "week", "month", "lastMonth", "fy", "all"] as RangeKey[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={range === r ? "chip-active" : "chip"}>{RANGE_LABELS[r]}</button>
        ))}
        <span className="w-px h-6 bg-line mx-1 shrink-0" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="h-9 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink-2">
          <option value="ALL">All categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {byCat.length > 1 && (
        <div className="card p-4 mb-4">
          <p className="text-sm font-semibold mb-2">Where the money went</p>
          <div className="space-y-2">
            {byCat.map(([c, amt]) => (
              <div key={c}>
                <div className="flex justify-between text-sm"><span className="text-ink-2">{c}</span><span className="num">{inr(amt)}</span></div>
                <div className="h-1.5 bg-surface rounded-full mt-1"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(amt / total) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Wallet} title="No expenses for this period" text="Record fuel, transport and labour costs so your net profit is accurate."
          action={<button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Add expense</button>} /></div>
      ) : (
        <ul className="card divide-y divide-line">
          {filtered.map(e => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.title}</p>
                <p className="text-[13px] text-ink-3 truncate">{formatDate(new Date(e.createdAt))} · {e.category}{e.note ? ` · ${e.note}` : ""}</p>
              </div>
              <p className="num font-semibold text-red-700 shrink-0">{inr2(e.amount)}</p>
              <button className="icon-btn text-ink-3" onClick={() => setToDelete(e)} aria-label="Delete expense"><Trash2 size={17} /></button>
            </li>
          ))}
        </ul>
      )}

      {showForm && <ExpenseForm onClose={() => setShowForm(false)} onSaved={exp => { setExpenses(prev => [exp, ...prev].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))); setShowForm(false); }} />}
      {toDelete && (
        <ConfirmModal
          title="Delete expense?"
          message={`${toDelete.title} (${inr2(toDelete.amount)}) will be removed.`}
          confirmText="Delete"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            try { await deleteExpense(toDelete.id); setExpenses(prev => prev.filter(x => x.id !== toDelete.id)); toast.success("Expense deleted"); }
            catch { toast.error("Could not delete"); }
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}

function ExpenseForm({ onClose, onSaved }: { onClose: () => void; onSaved: (e: Expense) => void }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !(Number(amount) > 0)) return toast.error("Enter a title and amount");
    setSaving(true);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const now = new Date();
      const when = date === todayStr() ? now : new Date(y, m - 1, d, 12, 0);
      const exp = await addExpense({ title: title.trim(), amount: Number(amount), category, note: note.trim() }, when);
      toast.success("Expense saved");
      onSaved(exp);
    } catch (err) {
      toast.error((err as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add expense"
      onClose={onClose}
      footer={<div className="flex gap-3"><button className="btn-secondary flex-1" onClick={onClose}>Cancel</button><button form="exp-form" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Save expense"}</button></div>}
    >
      <form id="exp-form" onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map(c => (
              <button type="button" key={c} onClick={() => setCategory(c)} className={category === c ? "chip-active" : "chip"}>{c}</button>
            ))}
          </div>
        </div>
        <div><label className="label">What for *</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Diesel for site visit" autoFocus /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Amount (₹) *</label><input className="input num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" /></div>
          <div><label className="label">Date</label><input type="date" className="input" value={date} max={todayStr()} onChange={e => setDate(e.target.value || todayStr())} /></div>
        </div>
        <div><label className="label">Note</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></div>
      </form>
    </Modal>
  );
}
