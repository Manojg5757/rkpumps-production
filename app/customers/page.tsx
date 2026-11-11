"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BellRing, Pencil, Phone, Plus, Receipt, Users, MapPin } from "lucide-react";
import Link from "next/link";
import { getCustomers, getSales, getPayments, addCustomer, updateCustomer } from "../../lib/db";
import { getSettings } from "../../lib/settings";
import { Customer, Sale, Payment } from "../../types";
import { AddPaymentModal } from "../../components/sales/AddPaymentModal";
import { InvoiceDetailModal } from "../../components/sales/InvoiceDetailModal";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, Loading, PageHeader, SearchInput, Stat, StatusBadge, inr, inr2 } from "../../components/ui/Common";
import { daysSince, saleTotal } from "../../lib/gst";
import { formatDate, isValidGstin } from "../../lib/utils";
import { openWhatsApp, reminderMessage } from "../../lib/share";

type SortKey = "totalPurchase" | "totalPending" | "recent" | "name";
type FilterMode = "all" | "pending" | "paid";
interface Stats { totalPurchase: number; totalPaid: number; totalPending: number; invoiceCount: number; lastDate: number; oldestDue: number }
const EMPTY: Stats = { totalPurchase: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0, lastDate: 0, oldestDue: 0 };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalPurchase");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);

  const loadData = async () => {
    try {
      const [custs, allSales] = await Promise.all([getCustomers(), getSales()]);
      setCustomers(custs);
      setSales(allSales);
    } catch {
      toast.error("Could not load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("filter") === "pending") {
      setFilterMode("pending");
      setSortKey("totalPending");
    }
    loadData();
  }, []);

  const statsMap = useMemo(() => {
    const map: Record<string, Stats> = {};
    sales.forEach(s => {
      const m = (map[s.customerId] ||= { ...EMPTY });
      const t = new Date(s.date).getTime();
      m.totalPurchase += saleTotal(s);
      m.totalPaid += s.paidAmount || 0;
      m.totalPending += s.pendingAmount || 0;
      m.invoiceCount += 1;
      m.lastDate = Math.max(m.lastDate, t);
      if ((s.pendingAmount || 0) > 0) m.oldestDue = m.oldestDue ? Math.min(m.oldestDue, t) : t;
    });
    return map;
  }, [sales]);

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    return customers
      .filter(c => {
        const st = statsMap[c.id] || EMPTY;
        const match = c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.address || "").toLowerCase().includes(q);
        const f = filterMode === "all" || (filterMode === "pending" && st.totalPending > 0) || (filterMode === "paid" && st.totalPending <= 0 && st.invoiceCount > 0);
        return match && f;
      })
      .sort((a, b) => {
        const sa = statsMap[a.id] || EMPTY, sb = statsMap[b.id] || EMPTY;
        if (sortKey === "name") return a.name.localeCompare(b.name);
        if (sortKey === "recent") return sb.lastDate - sa.lastDate;
        if (sortKey === "totalPending") return sb.totalPending - sa.totalPending;
        return sb.totalPurchase - sa.totalPurchase;
      });
  }, [customers, statsMap, search, sortKey, filterMode]);

  const all = Object.values(statsMap);
  const overallTotal = all.reduce((s, v) => s + v.totalPurchase, 0);
  const overallPending = all.reduce((s, v) => s + v.totalPending, 0);
  const pendingCount = all.filter(v => v.totalPending > 0).length;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        actions={<button className="btn-primary" onClick={() => setEditing("new")}><Plus size={18} /><span className="hidden sm:inline">Add customer</span></button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <Stat label="Total business" value={inr(overallTotal)} sub={`${customers.length} customers`} />
        <Stat label="To collect" value={inr(overallPending)} sub={`${pendingCount} customers with dues`} tone={overallPending > 0 ? "warn" : "default"} />
        <div className="col-span-2 lg:col-span-1"><Stat label="Collected" value={inr(overallTotal - overallPending)} tone="good" /></div>
      </div>

      <div className="space-y-2.5 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or place" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
          {(["all", "pending", "paid"] as FilterMode[]).map(f => (
            <button key={f} onClick={() => setFilterMode(f)} className={filterMode === f ? "chip-active" : "chip"}>
              {f === "all" ? "All" : f === "pending" ? "With dues" : "Paid up"}
            </button>
          ))}
          <span className="w-px h-6 bg-line mx-1 shrink-0" />
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="h-9 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink-2">
            <option value="totalPurchase">Top buyers</option>
            <option value="totalPending">Highest dues</option>
            <option value="recent">Recently billed</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {loading ? <Loading text="Loading customers…" /> : displayed.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No customers found" text="Customers are added automatically when you save an invoice." /></div>
      ) : (
        <ul className="card divide-y divide-line">
          {displayed.map(c => {
            const st = statsMap[c.id] || EMPTY;
            const dueDays = st.oldestDue ? daysSince(new Date(st.oldestDue)) : 0;
            return (
              <li key={c.id}>
                <button onClick={() => setSelected(c)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/60 active:bg-surface">
                  <span className="w-10 h-10 rounded-full bg-brand-50 text-brand-700 font-semibold flex items-center justify-center shrink-0">
                    {c.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-[13px] text-ink-3 num truncate">{c.phone}{c.address ? ` · ${c.address}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {st.totalPending > 0 ? (
                      <>
                        <p className={`num font-semibold ${dueDays > 30 ? "text-red-700" : "text-amber-700"}`}>{inr(st.totalPending)}</p>
                        <p className="text-xs text-ink-3">due · {dueDays}d</p>
                      </>
                    ) : (
                      <>
                        <p className="num font-semibold">{st.totalPurchase ? inr(st.totalPurchase) : "—"}</p>
                        <p className="text-xs text-ink-3">{st.invoiceCount} invoice{st.invoiceCount === 1 ? "" : "s"}</p>
                      </>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <LedgerModal
          customer={selected}
          sales={sales.filter(s => s.customerId === selected.id)}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
          onChanged={loadData}
        />
      )}

      {editing && (
        <CustomerFormModal
          customer={editing === "new" ? null : editing}
          existing={customers}
          onClose={() => setEditing(null)}
          onSaved={c => {
            setEditing(null);
            if (selected && selected.id === c.id) setSelected(c);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function LedgerModal({ customer, sales, onClose, onEdit, onChanged }: {
  customer: Customer; sales: Sale[]; onClose: () => void; onEdit: () => void; onChanged: () => void;
}) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [viewing, setViewing] = useState<Sale | null>(null);
  const [paying, setPaying] = useState<Sale | null>(null);

  const load = () => getPayments(customer.id).then(setPayments).catch(() => setPayments([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [customer.id]);

  const invoiced = sales.reduce((s, x) => s + saleTotal(x), 0);
  const paid = sales.reduce((s, x) => s + (x.paidAmount || 0), 0);
  const pending = sales.reduce((s, x) => s + (x.pendingAmount || 0), 0);
  const dueSales = sales.filter(s => (s.pendingAmount || 0) > 0);

  type Entry = { date: Date; kind: "invoice" | "payment"; amount: number; label: string; sale?: Sale; balance?: number };
  const entries: Entry[] = [
    ...sales.map(s => ({ date: new Date(s.date), kind: "invoice" as const, amount: saleTotal(s), label: s.billNumber, sale: s })),
    ...(payments || []).map(p => ({
      date: new Date(p.createdAt), kind: "payment" as const, amount: p.amount,
      label: `${p.method}${sales.find(s => s.id === p.invoiceId) ? ` · ${sales.find(s => s.id === p.invoiceId)!.billNumber}` : ""}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.kind === "invoice" ? -1 : 1));
  let run = 0;
  entries.forEach(e => { run += e.kind === "invoice" ? e.amount : -e.amount; e.balance = run; });
  entries.reverse();

  const remind = async () => {
    const s = await getSettings();
    openWhatsApp(customer.phone, reminderMessage(customer.name, pending, dueSales.map(x => x.billNumber), s.name, s.upiId));
  };

  return (
    <>
      <Modal
        title={customer.name}
        subtitle={<span className="num">{customer.phone}{customer.gstin ? ` · GSTIN ${customer.gstin}` : ""}</span>}
        onClose={onClose}
        size="lg"
        fullOnMobile
        footer={
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:${customer.phone}`} className="btn-secondary"><Phone size={17} /> Call</a>
            <button className="btn-secondary" onClick={onEdit}><Pencil size={17} /> Edit</button>
            {pending > 0 ? (
              <button className="btn-success" onClick={remind}><BellRing size={17} /> Remind</button>
            ) : (
              <Link href="/billing" className="btn-primary"><Receipt size={17} /> Bill</Link>
            )}
          </div>
        }
      >
        {customer.address && <p className="text-sm text-ink-3 flex items-center gap-1 -mt-1 mb-3"><MapPin size={14} />{customer.address}</p>}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface p-2.5"><p className="text-xs text-ink-3">Billed</p><p className="num font-semibold">{inr(invoiced)}</p></div>
          <div className="rounded-lg bg-emerald-50 p-2.5"><p className="text-xs text-emerald-700">Received</p><p className="num font-semibold text-emerald-800">{inr(paid)}</p></div>
          <div className={`rounded-lg p-2.5 ${pending > 0 ? "bg-amber-50" : "bg-surface"}`}><p className={`text-xs ${pending > 0 ? "text-amber-700" : "text-ink-3"}`}>Balance</p><p className={`num font-semibold ${pending > 0 ? "text-amber-900" : ""}`}>{inr(pending)}</p></div>
        </div>

        {dueSales.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Unpaid invoices</p>
            <ul className="space-y-2">
              {dueSales.map(s => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                  <button className="flex-1 min-w-0 text-left" onClick={() => setViewing(s)}>
                    <p className="text-sm font-medium num">{s.billNumber} · {formatDate(new Date(s.date))}</p>
                    <p className="text-xs text-ink-3">{daysSince(s.date)} days · total {inr(saleTotal(s))}</p>
                  </button>
                  <span className="num font-semibold text-amber-800">{inr2(s.pendingAmount)}</span>
                  <button className="btn-success h-9 px-3" onClick={() => setPaying(s)}>Receive</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm font-semibold mt-5 mb-2">Ledger</p>
        {payments === null ? <p className="text-sm text-ink-3">Loading…</p> : entries.length === 0 ? (
          <p className="text-sm text-ink-3">No transactions yet.</p>
        ) : (
          <div className="border border-line rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th px-3">Date</th>
                  <th className="th px-3">Details</th>
                  <th className="th px-3 text-right">Amount</th>
                  <th className="th px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i} className={e.sale ? "cursor-pointer hover:bg-surface/60" : ""} onClick={() => e.sale && setViewing(e.sale)}>
                    <td className="td px-3 num whitespace-nowrap text-ink-2">{formatDate(e.date)}</td>
                    <td className="td px-3">
                      <span className={`text-xs font-semibold mr-1.5 ${e.kind === "invoice" ? "text-brand-700" : "text-emerald-700"}`}>{e.kind === "invoice" ? "Invoice" : "Payment"}</span>
                      <span className="text-ink-2 num">{e.label}</span>
                      {e.sale && <span className="ml-1.5"><StatusBadge status={e.sale.paymentStatus} /></span>}
                    </td>
                    <td className={`td px-3 text-right num font-medium ${e.kind === "payment" ? "text-emerald-700" : ""}`}>{e.kind === "payment" ? "−" : ""}{inr2(e.amount)}</td>
                    <td className="td px-3 text-right num text-ink-2">{inr2(e.balance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {viewing && <InvoiceDetailModal sale={viewing} onClose={() => setViewing(null)} onAddPayment={s => setPaying(s)} />}
      {paying && (
        <AddPaymentModal
          sale={paying}
          onClose={() => setPaying(null)}
          onPaymentAdded={() => {
            setPaying(null);
            setViewing(null);
            // refresh this ledger and the list behind it
            load();
            onChanged();
          }}
        />
      )}
    </>
  );
}

function CustomerFormModal({ customer, existing, onClose, onSaved }: {
  customer: Customer | null; existing: Customer[]; onClose: () => void; onSaved: (c: Customer) => void;
}) {
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [gstin, setGstin] = useState(customer?.gstin || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter the customer name");
    if (phone.length !== 10) return toast.error("Phone number must be 10 digits");
    if (gstin && !isValidGstin(gstin)) return toast.error("GSTIN looks wrong — check it or leave it empty");
    const dup = existing.find(c => c.phone === phone && c.id !== customer?.id);
    if (dup) return toast.error(`${phone} already belongs to ${dup.name}`);
    setSaving(true);
    try {
      const data = { name: name.trim(), phone, address: address.trim(), gstin: gstin.trim() };
      if (customer) {
        await updateCustomer(customer.id, data);
        toast.success("Customer updated");
        onSaved({ ...customer, ...data });
      } else {
        const c = await addCustomer(data);
        toast.success("Customer added");
        onSaved(c);
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={customer ? "Edit customer" : "Add customer"}
      subtitle={customer ? "Old invoices keep the details printed on them" : undefined}
      onClose={onClose}
      footer={<div className="flex gap-3"><button className="btn-secondary flex-1" onClick={onClose}>Cancel</button><button form="cust-form" className="btn-primary flex-1" disabled={saving}>{saving ? "Saving…" : "Save customer"}</button></div>}
    >
      <form id="cust-form" onSubmit={submit} className="space-y-3">
        <div><label className="label">Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        <div><label className="label">Phone *</label><input className="input num" type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
        <div><label className="label">Address / site</label><input className="input" value={address} onChange={e => setAddress(e.target.value)} /></div>
        <div><label className="label">GSTIN</label><input className="input uppercase placeholder:normal-case" maxLength={15} value={gstin} onChange={e => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} placeholder="Optional" /></div>
      </form>
    </Modal>
  );
}
