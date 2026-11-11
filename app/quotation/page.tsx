"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Copy, Download, FileText, Plus, Printer, Receipt, Share2, Trash2, Wrench, Package, ChevronRight } from "lucide-react";
import { getProducts, getCategories, saveQuotation, getQuotations, getCustomers, deleteQuotation } from "../../lib/db";
import { generateQuotationPDF } from "../../lib/quotationPdf";
import { downloadBlob, openBlob, quotationMessage, safeFileName, sharePdf } from "../../lib/share";
import { round2, round3 } from "../../lib/gst";
import { formatDate } from "../../lib/utils";
import { Product, Category, QuotationItem, Quotation, Customer } from "../../types";
import { ProductPicker } from "../../components/billing/ProductPicker";
import { ServiceItemModal } from "../../components/billing/ServiceItemModal";
import { CustomerFields, CustomerForm, emptyCustomer } from "../../components/billing/CustomerFields";
import { TotalBar } from "../../components/billing/TotalBar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { EmptyState, inr, inr2, Loading, SearchInput, Segmented } from "../../components/ui/Common";

const DRAFT_KEY = "rk_quote_draft_v2";
type Tab = "new" | "saved";

export default function QuotationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("new");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [items, setItems] = useState<QuotationItem[]>([]);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [validDays, setValidDays] = useState(7);
  const [notes, setNotes] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [editing, setEditing] = useState<QuotationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ q: Quotation; blob: Blob } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "saved") setTab("saved");
    Promise.all([getProducts(), getCategories(), getCustomers()])
      .then(([p, c, cu]) => { setProducts(p); setCategories(c); setCustomers(cu); })
      .catch(() => toast.error("Could not load products. Check your internet connection."));
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.items?.length || d.customer?.name) {
          setItems(d.items || []); setCustomer(d.customer || emptyCustomer); setValidDays(d.validDays || 7); setNotes(d.notes || "");
          toast("Unsaved quotation restored", { icon: "↩️" });
        }
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || done) return;
    try {
      if (items.length || customer.name) localStorage.setItem(DRAFT_KEY, JSON.stringify({ items, customer, validDays, notes }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, [items, customer, validDays, notes, ready, done]);

  const inCart = useMemo(() => Object.fromEntries(items.map(i => [i.productId, i.quantity])), [items]);
  const total = Math.floor(round2(items.reduce((s, i) => s + i.lineTotal, 0)));

  const addProduct = (p: Product) => {
    setItems(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => (i.productId === p.id ? { ...i, quantity: round3(i.quantity + 1), lineTotal: round2(i.unitPrice * round3(i.quantity + 1)) } : i));
      const unitPrice = round2(p.basePrice * (1 + p.gstPercentage / 100));
      return [...prev, { productId: p.id, name: p.name, unitName: p.unitName, quantity: 1, unitPrice, lineTotal: unitPrice, gstPercentage: p.gstPercentage, isService: p.isService || undefined }];
    });
  };

  const stepQty = (item: QuotationItem, delta: number) => {
    const q = round3(item.quantity + delta);
    if (q <= 0) return setItems(prev => prev.filter(i => i.productId !== item.productId));
    setItems(prev => prev.map(i => (i.productId === item.productId ? { ...i, quantity: q, lineTotal: round2(i.unitPrice * q) } : i)));
  };

  const resetAll = () => {
    setItems([]); setCustomer(emptyCustomer); setSelectedCustomerId(null); setValidDays(7); setNotes("");
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const loadIntoBuilder = (q: Quotation) => {
    setItems(q.items.map(i => ({ ...i })));
    setCustomer({ name: q.customer.name, phone: q.customer.phone || "", address: q.customer.address || "", gstin: "" });
    setValidDays(q.validDays);
    setNotes(q.notes || "");
    setDone(null);
    setTab("new");
    toast.success(`Copied ${q.quotationNumber} — edit and save as a new quotation`);
  };

  const handleSave = async () => {
    if (items.length === 0) return toast.error("Add at least one item");
    if (!customer.name.trim()) return toast.error("Enter the customer name");
    if (customer.phone && customer.phone.length !== 10) return toast.error("Phone number must be 10 digits");
    setSaving(true);
    try {
      const q = await saveQuotation(items, { name: customer.name.trim(), phone: customer.phone || undefined, address: customer.address.trim() || undefined }, validDays, notes);
      const blob = await generateQuotationPDF(q);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone({ q, blob });
      toast.success(`Saved ${q.quotationNumber}`);
      document.getElementById("main-scroll")?.scrollTo({ top: 0 });
    } catch (e) {
      toast.error((e as Error).message || "Could not save the quotation");
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h1 className="hidden md:block text-2xl font-semibold tracking-tight">Quotations</h1>
      <Segmented<Tab> value={tab} onChange={t => { setTab(t); setDone(null); }} options={[{ value: "new", label: "New quotation" }, { value: "saved", label: "Saved quotations" }]} />
    </div>
  );

  if (tab === "saved") {
    return (
      <div>
        {header}
        <SavedQuotations onCopy={loadIntoBuilder} onConvert={q => router.push(`/billing?fromQuotation=${q.id}`)} />
      </div>
    );
  }

  if (done) {
    const { q, blob } = done;
    const file = `Quotation_${safeFileName(q.customer.name)}_${q.quotationNumber}.pdf`;
    return (
      <div>
        {header}
        <div className="max-w-md mx-auto card p-6 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
          <p className="mt-3 text-ink-3 text-sm">Quotation saved</p>
          <p className="text-xl font-semibold">{q.quotationNumber}</p>
          <p className="num text-3xl font-semibold mt-3">{inr(q.grandTotal)}</p>
          <p className="text-sm text-ink-3 mt-1">{q.customer.name} · valid {q.validDays} days</p>
          <div className="grid gap-2 mt-6">
            <button className="btn-success h-12" onClick={() => sharePdf(blob, file, quotationMessage(q), q.customer.phone)}><Share2 size={18} /> Share on WhatsApp</button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => downloadBlob(blob, file)}><Download size={18} /> Download</button>
              <button className="btn-secondary" onClick={() => openBlob(blob, file)}><Printer size={18} /> Print</button>
            </div>
            <button className="btn-secondary" onClick={() => router.push(`/billing?fromQuotation=${q.id}`)}><Receipt size={18} /> Convert to invoice</button>
            <button className="btn-primary h-12 mt-2" onClick={() => { setDone(null); resetAll(); }}><Plus size={18} /> New quotation</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-6 md:items-start">
        <aside className="hidden md:flex card p-4 flex-col sticky top-0 h-[calc(100dvh-8rem)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Items</h2>
            <button className="btn-ghost h-8 px-2 text-[13px]" onClick={() => setServiceOpen(true)}><Wrench size={15} /> Labour / service</button>
          </div>
          <ProductPicker products={products} categories={categories} onPick={addProduct} inCart={inCart} respectStock={false} accent="emerald" />
        </aside>

        <section className="space-y-4 min-w-0">
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Quote to</h2>
            <CustomerFields
              customers={customers}
              value={customer}
              onChange={setCustomer}
              selectedId={selectedCustomerId}
              onSelect={c => setSelectedCustomerId(c?.id || null)}
              showGstin={false}
              phoneRequired={false}
            />
          </div>

          <div className="card">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-semibold">Items {items.length > 0 && <span className="text-ink-3 font-normal">({items.length})</span>}</h2>
              <p className="text-[13px] text-ink-3">Prices include GST</p>
            </div>
            {items.length === 0 ? (
              <div className="px-4 pb-4">
                <div className="border-2 border-dashed border-line rounded-xl py-8 text-center text-sm text-ink-3">
                  <Package className="mx-auto mb-2" size={24} />
                  No items yet
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {items.map(item => (
                  <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                    <button className="flex-1 min-w-0 text-left" onClick={() => setEditing(item)}>
                      <p className="font-medium text-[15px] leading-snug flex items-center gap-1.5">
                        {item.isService && <Wrench size={14} className="text-ink-3 shrink-0" />}
                        <span className="truncate">{item.name}</span>
                      </p>
                      <p className="text-[13px] text-ink-3 num mt-0.5">{inr2(item.unitPrice)} / {item.unitName}<span className="text-emerald-700 ml-1.5 inline-flex items-center">Edit<ChevronRight size={12} /></span></p>
                    </button>
                    <div className="flex items-center border border-line rounded-lg h-9 shrink-0">
                      <button className="w-9 h-full text-lg text-ink-2" onClick={() => stepQty(item, -1)} aria-label="Decrease">−</button>
                      <button className="min-w-[2.5rem] px-1 h-full num text-sm font-semibold border-x border-line" onClick={() => setEditing(item)}>{item.quantity}</button>
                      <button className="w-9 h-full text-lg text-ink-2" onClick={() => stepQty(item, 1)} aria-label="Increase">+</button>
                    </div>
                    <p className="num font-semibold w-20 text-right shrink-0">{inr(item.lineTotal, item.lineTotal % 1 ? 2 : 0)}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 p-3 border-t border-line md:hidden">
              <button className="btn-success flex-1" onClick={() => setPickerOpen(true)}><Plus size={18} /> Add items</button>
              <button className="btn-secondary" onClick={() => setServiceOpen(true)}><Wrench size={16} /> Labour</button>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div>
              <label className="label">Valid for</label>
              <div className="flex gap-2">
                {[7, 15, 30].map(d => (
                  <button key={d} type="button" onClick={() => setValidDays(d)} className={validDays === d ? "chip-active" : "chip"}>{d} days</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Notes on quotation</label>
              <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Borewell depth 450 ft · 1 year motor warranty · delivery in 2 days" />
            </div>
          </div>

          <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmClear(true)} disabled={!items.length && !customer.name}>Clear quotation</button>

          <TotalBar
            amount={inr(total)}
            caption={items.length ? `${items.length} item${items.length > 1 ? "s" : ""} · incl. GST · valid ${validDays} days` : "Add items to start"}
            actionLabel="Save quotation"
            onAction={handleSave}
            loading={saving}
            disabled={items.length === 0}
          />
        </section>
      </div>

      {pickerOpen && (
        <Modal
          title="Add items"
          subtitle={items.length ? `${items.length} in quotation · ${inr(total)}` : "Tap an item to add it"}
          onClose={() => setPickerOpen(false)}
          fullOnMobile
          size="lg"
          footer={<button className="btn-success w-full h-12" onClick={() => setPickerOpen(false)}>Done</button>}
        >
          <div className="h-full flex flex-col">
            <ProductPicker products={products} categories={categories} onPick={addProduct} inCart={inCart} respectStock={false} accent="emerald" />
          </div>
        </Modal>
      )}

      {serviceOpen && (
        <ServiceItemModal
          accent="emerald"
          onClose={() => setServiceOpen(false)}
          onAdd={s => {
            const unitPrice = round2(s.rateExclGst * (1 + s.gst / 100));
            setItems(prev => [...prev, {
              productId: `svc-${Date.now().toString(36)}`, name: s.name, unitName: s.unitName, quantity: s.qty,
              unitPrice, lineTotal: round2(unitPrice * s.qty), isService: true, gstPercentage: s.gst,
            }]);
            setServiceOpen(false);
          }}
        />
      )}

      {editing && (
        <QuoteLineModal
          item={editing}
          onClose={() => setEditing(null)}
          onRemove={() => { setItems(prev => prev.filter(i => i.productId !== editing.productId)); setEditing(null); }}
          onSave={u => { setItems(prev => prev.map(i => (i.productId === u.productId ? u : i))); setEditing(null); }}
        />
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear this quotation?"
          message="All items and customer details on this unsaved quotation will be removed."
          confirmText="Clear"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => { resetAll(); setConfirmClear(false); }}
        />
      )}
    </div>
  );
}

function QuoteLineModal({ item, onSave, onRemove, onClose }: {
  item: QuotationItem; onSave: (i: QuotationItem) => void; onRemove: () => void; onClose: () => void;
}) {
  const [qty, setQty] = useState(String(item.quantity));
  const [price, setPrice] = useState(String(item.unitPrice));
  const q = round3(Number(qty) || 0);
  const p = round2(Number(price) || 0);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (q <= 0 || p < 0) return;
    onSave({ ...item, quantity: q, unitPrice: p, lineTotal: round2(p * q) });
  };
  return (
    <Modal
      title={item.name}
      subtitle={item.isService ? "Labour / service" : item.unitName}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRemove} className="btn-ghost text-red-600 px-3"><Trash2 size={18} /> Remove</button>
          <div className="flex-1 text-right pr-2">
            <p className="text-xs text-ink-3">Line total</p>
            <p className="num font-semibold">{inr2(p * q)}</p>
          </div>
          <button form="qline" type="submit" className="btn-success" disabled={q <= 0}>Update</button>
        </div>
      }
    >
      <form id="qline" onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Quantity</label>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary w-12 px-0 text-lg" onClick={() => setQty(String(Math.max(1, round2(q - 1))))}>−</button>
            <input className="input num text-center text-lg font-semibold" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9.]/g, ""))} autoFocus />
            <button type="button" className="btn-secondary w-12 px-0 text-lg" onClick={() => setQty(String(round2(q + 1)))}>+</button>
          </div>
        </div>
        <div>
          <label className="label">Price per {item.unitName} (incl. GST)</label>
          <input className="input num" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
      </form>
    </Modal>
  );
}

function SavedQuotations({ onCopy, onConvert }: { onCopy: (q: Quotation) => void; onConvert: (q: Quotation) => void }) {
  const [list, setList] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "converted" | "expired">("all");
  const [open, setOpen] = useState<Quotation | null>(null);
  const [toDelete, setToDelete] = useState<Quotation | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    getQuotations().then(setList).catch(() => toast.error("Could not load quotations")).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const statusOf = (q: Quotation) => {
    if (q.status === "converted") return "converted";
    const until = new Date(q.date); until.setDate(until.getDate() + q.validDays);
    return until < new Date() ? "expired" : "open";
  };

  const shown = list.filter(q => {
    const s = search.toLowerCase();
    const m = !s || q.customer.name.toLowerCase().includes(s) || q.quotationNumber.toLowerCase().includes(s) || (q.customer.phone || "").includes(s);
    return m && (filter === "all" || statusOf(q) === filter);
  });

  const withPdf = async (q: Quotation, fn: (blob: Blob, file: string) => void | Promise<void>) => {
    setBusy(true);
    try {
      const blob = await generateQuotationPDF(q);
      await fn(blob, `Quotation_${safeFileName(q.customer.name)}_${q.quotationNumber}.pdf`);
    } catch { toast.error("Could not create the PDF"); } finally { setBusy(false); }
  };

  if (loading) return <Loading text="Loading quotations…" />;

  const badge = (s: string) =>
    s === "converted" ? <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">Invoiced</span>
      : s === "expired" ? <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface text-ink-3 ring-1 ring-line">Expired</span>
        : <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Open</span>;

  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search customer, phone or quotation no." />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(["all", "open", "converted", "expired"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={filter === f ? "chip-active" : "chip"}>
            {f === "all" ? "All" : f === "open" ? "Open" : f === "converted" ? "Invoiced" : "Expired"}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title="No quotations found" text="Quotations you save appear here, ready to share again or turn into an invoice." /></div>
      ) : (
        <ul className="card divide-y divide-line">
          {shown.map(q => (
            <li key={q.id}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface/60" onClick={() => setOpen(q)}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{q.customer.name}</p>
                  <p className="text-[13px] text-ink-3 num">{q.quotationNumber} · {formatDate(new Date(q.date))}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="num font-semibold">{inr(q.grandTotal)}</p>
                  <div className="mt-0.5">{badge(statusOf(q))}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Modal
          title={open.quotationNumber}
          subtitle={`${open.customer.name} · ${formatDate(new Date(open.date))}`}
          onClose={() => setOpen(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-success col-span-2" disabled={busy} onClick={() => withPdf(open, (b, f) => sharePdf(b, f, quotationMessage(open), open.customer.phone))}><Share2 size={18} /> Share on WhatsApp</button>
              <button className="btn-secondary" disabled={busy} onClick={() => withPdf(open, (b, f) => downloadBlob(b, f))}><Download size={18} /> Download</button>
              <button className="btn-secondary" disabled={busy} onClick={() => withPdf(open, (b, f) => openBlob(b, f))}><Printer size={18} /> Print</button>
              <button className="btn-secondary" onClick={() => { onCopy(open); setOpen(null); }}><Copy size={18} /> Copy to new</button>
              {open.status === "converted" ? (
                <span className="btn-ghost text-brand-700 cursor-default">Invoiced: {open.convertedBillNumber}</span>
              ) : (
                <button className="btn-primary" onClick={() => onConvert(open)}><Receipt size={18} /> Convert to invoice</button>
              )}
            </div>
          }
        >
          <ul className="divide-y divide-line -mt-2">
            {open.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium">{i.name}</span>
                  <span className="text-ink-3 num">{i.quantity} × {inr2(i.unitPrice)}</span>
                </span>
                <span className="num font-semibold shrink-0">{inr2(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold pt-3 mt-1 border-t border-line">
            <span>Total (incl. GST)</span><span className="num">{inr(open.grandTotal)}</span>
          </div>
          {open.notes && <p className="text-sm text-ink-2 mt-3 bg-surface rounded-lg p-3">{open.notes}</p>}
          <button className="btn-ghost text-red-600 w-full mt-3" onClick={() => { setToDelete(open); setOpen(null); }}><Trash2 size={16} /> Delete quotation</button>
        </Modal>
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete quotation?"
          message={`${toDelete.quotationNumber} for ${toDelete.customer.name} will be removed. Invoices are not affected.`}
          confirmText="Delete"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            try { await deleteQuotation(toDelete.id); toast.success("Quotation deleted"); load(); } catch { toast.error("Could not delete"); }
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
