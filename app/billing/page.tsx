"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckCircle2, Download, Plus, Printer, Share2, Wrench, Package, FileText, ChevronRight } from "lucide-react";
import { getProducts, getCategories, completeSale, getCustomers, addCustomer, updateCustomer, getQuotationById } from "../../lib/db";
import { generateBillPDF } from "../../lib/pdf";
import { getSettings } from "../../lib/settings";
import { cartTotals, computeLine, lineFromProduct, serviceLine, round2, round3 } from "../../lib/gst";
import { stateFromGstin, stateLabel, GST_STATES } from "../../lib/states";
import { downloadBlob, invoiceMessage, openBlob, safeFileName, sharePdf } from "../../lib/share";
import { isValidGstin } from "../../lib/utils";
import { Product, Category, CartItem, Customer, PaymentMethod, Sale } from "../../types";
import { ProductPicker } from "../../components/billing/ProductPicker";
import { LineEditModal } from "../../components/billing/LineEditModal";
import { ServiceItemModal } from "../../components/billing/ServiceItemModal";
import { CustomerFields, CustomerForm, emptyCustomer } from "../../components/billing/CustomerFields";
import { TotalBar } from "../../components/billing/TotalBar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { inr, inr2, Segmented } from "../../components/ui/Common";

const DRAFT_KEY = "rk_invoice_draft_v2";
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type PayMode = "full" | "partial" | "credit";
type Draft = {
  cart: CartItem[]; customer: CustomerForm; selectedCustomerId: string | null;
  invoiceDate: string; notes: string; payMode: PayMode; paidAmount: string; method: PaymentMethod;
  posOverride: string | null; quotationId?: string;
};

export default function BillingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [businessState, setBusinessState] = useState("33");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("full");
  const [paidAmount, setPaidAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [posOverride, setPosOverride] = useState<string | null>(null); // place-of-supply state code
  const [quotationId, setQuotationId] = useState<string | undefined>();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [editing, setEditing] = useState<CartItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ sale: Sale; blob: Blob } | null>(null);
  const loaded = useRef(false);

  // ── Load data, draft, and optional quotation to convert ──
  useEffect(() => {
    (async () => {
      try {
        const [p, c, custs, settings] = await Promise.all([getProducts(), getCategories(), getCustomers(), getSettings()]);
        setProducts(p);
        setCategories(c);
        setCustomers(custs);
        setBusinessState(settings.stateCode || "33");

        const qid = new URLSearchParams(window.location.search).get("fromQuotation");
        if (qid) {
          const q = await getQuotationById(qid);
          const items: CartItem[] = q.items.map(qi => {
            const prod = p.find(x => x.id === qi.productId);
            const gst = qi.gstPercentage ?? prod?.gstPercentage ?? 18;
            const base = qi.unitPrice / (1 + gst / 100);
            if (!prod) return serviceLine(qi.name, base, gst, qi.quantity, undefined, qi.unitName || "Job");
            return computeLine({ ...lineFromProduct(prod, qi.quantity), basePrice: base });
          });
          setCart(items);
          const match = q.customer.phone ? custs.find(x => x.phone === q.customer.phone) : undefined;
          setCustomer({ name: q.customer.name, phone: q.customer.phone || "", address: q.customer.address || match?.address || "", gstin: match?.gstin || "" });
          setSelectedCustomerId(match?.id || null);
          setQuotationId(q.id);
          setNotes(`As per quotation ${q.quotationNumber}`);
          const short = items.filter(i => !i.isService).filter(i => (p.find(x => x.id === i.productId)?.stockQuantity ?? 0) < i.quantity);
          toast.success(`Loaded ${q.quotationNumber}`);
          if (short.length) toast.error(`Low stock for: ${short.map(s => s.name).join(", ")}`, { duration: 5000 });
        } else {
          try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
              const d: Draft = JSON.parse(raw);
              if (d.cart?.length || d.customer?.name) {
                setCart(d.cart || []);
                setCustomer(d.customer || emptyCustomer);
                setSelectedCustomerId(d.selectedCustomerId || null);
                setInvoiceDate(d.invoiceDate || todayStr());
                setNotes(d.notes || "");
                setPayMode(d.payMode || "full");
                setPaidAmount(d.paidAmount || "");
                setMethod(d.method || "Cash");
                setPosOverride(d.posOverride ?? null);
                setQuotationId(d.quotationId);
                toast("Unsaved invoice restored", { icon: "↩️" });
              }
            }
          } catch { /* storage unavailable */ }
        }
      } catch (err) {
        toast.error((err as Error).message || "Could not load products. Check your internet connection.");
      } finally {
        loaded.current = true;
      }
    })();
  }, []);

  // ── Auto-save draft so nothing is lost if the phone locks ──
  useEffect(() => {
    if (!loaded.current || done) return;
    try {
      const d: Draft = { cart, customer, selectedCustomerId, invoiceDate, notes, payMode, paidAmount, method, posOverride, quotationId };
      if (cart.length || customer.name || customer.phone) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, [cart, customer, selectedCustomerId, invoiceDate, notes, payMode, paidAmount, method, posOverride, quotationId, done]);

  const stockOf = (id: string) => products.find(p => p.id === id)?.stockQuantity ?? 0;
  const inCart = useMemo(() => Object.fromEntries(cart.map(i => [i.productId, i.quantity])), [cart]);

  const totals = cartTotals(cart);
  const customerState = stateFromGstin(customer.gstin);
  const placeOfSupply = posOverride ?? (customerState || businessState);
  const isInterState = placeOfSupply !== businessState;

  const paid = payMode === "full" ? totals.finalTotal : payMode === "credit" ? 0 : Math.min(Number(paidAmount) || 0, totals.finalTotal);
  const balance = round2(totals.finalTotal - paid);

  // ── Cart operations ──
  const addProduct = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        if (!p.isService && existing.quantity + 1 > p.stockQuantity) {
          toast.error(`Only ${p.stockQuantity} ${p.unitName} in stock`);
          return prev;
        }
        return prev.map(i => (i.productId === p.id ? computeLine({ ...i, quantity: round3(i.quantity + 1) }) : i));
      }
      if (p.isService) return [...prev, lineFromProduct(p, 1)];
      if (p.stockQuantity <= 0) {
        toast.error(`${p.name} is out of stock`);
        return prev;
      }
      return [...prev, lineFromProduct(p, Math.min(1, p.stockQuantity))];
    });
  };

  const stepQty = (item: CartItem, delta: number) => {
    const next = round3(item.quantity + delta);
    if (next <= 0) return setCart(prev => prev.filter(i => i.productId !== item.productId));
    if (!item.isService && next > stockOf(item.productId)) {
      toast.error(`Only ${stockOf(item.productId)} ${item.unitName} in stock`);
      return;
    }
    setCart(prev => prev.map(i => (i.productId === item.productId ? computeLine({ ...i, quantity: next }) : i)));
  };

  const resetAll = () => {
    setCart([]); setCustomer(emptyCustomer); setSelectedCustomerId(null); setInvoiceDate(todayStr());
    setNotes(""); setPayMode("full"); setPaidAmount(""); setMethod("Cash"); setPosOverride(null); setQuotationId(undefined);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  // ── Save ──
  const validate = (): string | null => {
    if (cart.length === 0) return "Add at least one item";
    if (customer.phone.length !== 10) return "Enter the customer's 10-digit phone number";
    if (!customer.name.trim()) return "Enter the customer name";
    if (customer.gstin && !isValidGstin(customer.gstin)) return "GSTIN looks wrong — check it or leave it empty";
    if (payMode === "partial" && !(Number(paidAmount) > 0)) return "Enter the amount received, or choose Credit";
    for (const i of cart) {
      if (!i.isService && i.quantity > stockOf(i.productId)) return `Only ${stockOf(i.productId)} ${i.unitName} of ${i.name} in stock`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return toast.error(err);
    if (!selectedCustomerId) {
      const dup = customers.find(c => c.phone === customer.phone);
      if (dup) {
        setSelectedCustomerId(dup.id);
        return toast.error(`${customer.phone} belongs to ${dup.name}. Their details are now selected — check and save again.`);
      }
    }

    setSaving(true);
    try {
      const custData = {
        name: customer.name.trim(),
        phone: customer.phone,
        gstin: customer.gstin.trim(),
        address: customer.address.trim(),
      };
      let custId = selectedCustomerId;
      if (!custId) {
        const created = await addCustomer(custData);
        custId = created.id;
        setCustomers(prev => [...prev, created]);
      } else {
        const old = customers.find(c => c.id === custId);
        if (old && (old.name !== custData.name || (old.address || "") !== custData.address || (old.gstin || "") !== custData.gstin)) {
          await updateCustomer(custId, { name: custData.name, address: custData.address, gstin: custData.gstin });
        }
      }

      const [y, m, d] = invoiceDate.split("-").map(Number);
      const now = new Date();
      const date = invoiceDate === todayStr() ? now : new Date(y, m - 1, d, now.getHours(), now.getMinutes());

      const sale = await completeSale(cart, custId, custData, paid, method, {
        date,
        isInterState,
        placeOfSupply: stateLabel(placeOfSupply),
        notes,
        quotationId,
      });
      const blob = await generateBillPDF(sale);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone({ sale, blob });
      toast.success(`Saved ${sale.billNumber}`);
      document.getElementById("main-scroll")?.scrollTo({ top: 0 });
    } catch (e) {
      toast.error((e as Error).message || "Could not save the invoice");
    } finally {
      setSaving(false);
    }
  };

  // ── Success screen ──
  if (done) {
    const { sale, blob } = done;
    const file = `${safeFileName(sale.customer.name)}_${sale.billNumber}.pdf`;
    return (
      <div className="max-w-md mx-auto pt-4 md:pt-10">
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
          <p className="mt-3 text-ink-3 text-sm">Invoice saved</p>
          <p className="text-xl font-semibold text-ink">{sale.billNumber}</p>
          <p className="num text-3xl font-semibold mt-3">{inr(sale.finalTotal ?? sale.grandTotal)}</p>
          <p className="text-sm text-ink-3 mt-1">{sale.customer.name} · {sale.customer.phone}</p>
          {sale.pendingAmount > 0 && (
            <p className="mt-3 text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
              {inr(sale.paidAmount)} received · <b>{inr(sale.pendingAmount)} balance due</b>
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 mt-6">
            <button className="btn-success h-12" onClick={() => sharePdf(blob, file, invoiceMessage(sale), sale.customer.phone)}>
              <Share2 size={18} /> Share on WhatsApp
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => downloadBlob(blob, file)}><Download size={18} /> Download</button>
              <button className="btn-secondary" onClick={() => openBlob(blob, file)}><Printer size={18} /> Print</button>
            </div>
            <button className="btn-primary h-12 mt-2" onClick={() => { setDone(null); resetAll(); getProducts().then(setProducts).catch(() => {}); }}>
              <Plus size={18} /> New invoice
            </button>
            <Link href="/sales" className="btn-ghost">Go to sales history</Link>
          </div>
        </div>
      </div>
    );
  }

  const itemCount = cart.length;

  return (
    <div className="md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-6 md:items-start">
      {/* Desktop: inline product list */}
      <aside className="hidden md:flex card p-4 flex-col sticky top-0 h-[calc(100dvh-4rem)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-ink">Items</h2>
          <button className="btn-ghost h-8 px-2 text-[13px]" onClick={() => setServiceOpen(true)}><Wrench size={15} /> Labour / service</button>
        </div>
        <ProductPicker products={products} categories={categories} onPick={addProduct} inCart={inCart} />
      </aside>

      <section className="space-y-4 min-w-0">
        <div className="hidden md:flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
            {quotationId && <p className="text-sm text-emerald-700 mt-0.5 flex items-center gap-1"><FileText size={14} /> Converting a quotation</p>}
          </div>
          <button className="btn-ghost text-red-600" onClick={() => setConfirmClear(true)} disabled={!cart.length && !customer.name}>Clear</button>
        </div>
        {quotationId && <p className="md:hidden text-sm text-emerald-700 flex items-center gap-1"><FileText size={14} /> Converting a quotation</p>}

        {/* Customer */}
        <div className="card p-4">
          <h2 className="font-semibold text-ink mb-3">Bill to</h2>
          <CustomerFields
            customers={customers}
            value={customer}
            onChange={setCustomer}
            selectedId={selectedCustomerId}
            onSelect={c => setSelectedCustomerId(c?.id || null)}
          />
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-ink">Items {itemCount > 0 && <span className="text-ink-3 font-normal">({itemCount})</span>}</h2>
          </div>
          {cart.length === 0 ? (
            <div className="px-4 pb-4">
              <div className="border-2 border-dashed border-line rounded-xl py-8 text-center text-sm text-ink-3">
                <Package className="mx-auto mb-2" size={24} />
                No items yet
                <p className="hidden md:block mt-1">Pick items from the list on the left</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {cart.map(item => (
                <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                  <button className="flex-1 min-w-0 text-left" onClick={() => setEditing(item)}>
                    <p className="font-medium text-ink text-[15px] leading-snug flex items-center gap-1.5">
                      {item.isService && <Wrench size={14} className="text-ink-3 shrink-0" />}
                      <span className="truncate">{item.name}</span>
                    </p>
                    <p className="text-[13px] text-ink-3 num mt-0.5">
                      {inr2(item.basePrice)} + {item.gstPercentage}%
                      {item.discountPercent ? <span className="text-emerald-700"> · {item.discountPercent}% off</span> : null}
                      <span className="text-brand-600 ml-1.5 inline-flex items-center">Edit<ChevronRight size={12} /></span>
                    </p>
                  </button>
                  <div className="flex items-center border border-line rounded-lg h-9 shrink-0">
                    <button className="w-9 h-full text-lg text-ink-2" onClick={() => stepQty(item, -1)} aria-label="Decrease">−</button>
                    <button className="min-w-[2.5rem] px-1 h-full num text-sm font-semibold border-x border-line" onClick={() => setEditing(item)}>{item.quantity}</button>
                    <button className="w-9 h-full text-lg text-ink-2" onClick={() => stepQty(item, 1)} aria-label="Increase">+</button>
                  </div>
                  <p className="num font-semibold w-20 text-right shrink-0 text-[15px]">{inr(item.lineTotal, item.lineTotal % 1 ? 2 : 0)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 p-3 border-t border-line md:hidden">
            <button className="btn-primary flex-1" onClick={() => setPickerOpen(true)}><Plus size={18} /> Add items</button>
            <button className="btn-secondary" onClick={() => setServiceOpen(true)}><Wrench size={16} /> Labour</button>
          </div>
          {cart.length > 0 && (
            <div className="px-4 py-3 border-t border-line text-sm space-y-1.5 bg-surface/60 rounded-b-xl">
              <Row label="Taxable value" value={inr2(totals.taxable)} />
              {isInterState ? (
                <Row label="IGST" value={inr2(totals.gst)} />
              ) : (
                <>
                  <Row label="CGST" value={inr2(totals.gst / 2)} />
                  <Row label="SGST" value={inr2(totals.gst / 2)} />
                </>
              )}
              {Math.abs(totals.roundOff) >= 0.01 && <Row label="Round off" value={totals.roundOff.toFixed(2)} />}
              <div className="flex justify-between font-semibold text-ink pt-1.5 border-t border-line">
                <span>Invoice total</span><span className="num">{inr(totals.finalTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-ink">Payment</h2>
          <Segmented<PayMode>
            value={payMode}
            onChange={setPayMode}
            options={[{ value: "full", label: "Paid in full" }, { value: "partial", label: "Part paid" }, { value: "credit", label: "Credit" }]}
          />
          <div className="grid grid-cols-2 gap-3">
            {payMode === "partial" && (
              <div>
                <label className="label">Amount received</label>
                <input className="input num font-semibold" inputMode="decimal" value={paidAmount} onChange={e => setPaidAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
              </div>
            )}
            {payMode !== "credit" && (
              <div className={payMode === "full" ? "col-span-2 sm:col-span-1" : ""}>
                <label className="label">Payment mode</label>
                <select className="input" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank">Bank transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            )}
          </div>
          {balance > 0 && cart.length > 0 && (
            <div className="flex justify-between items-center text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-lg px-3 py-2">
              <span>Balance due (added to customer&apos;s dues)</span>
              <span className="num font-semibold">{inr(balance)}</span>
            </div>
          )}
        </div>

        {/* Invoice details */}
        <details className="card p-4 group" open={!!notes || invoiceDate !== todayStr() || posOverride !== null}>
          <summary className="font-semibold text-ink cursor-pointer list-none flex items-center justify-between">
            Invoice details
            <span className="text-[13px] font-normal text-ink-3">{invoiceDate === todayStr() ? "Today" : invoiceDate} · {isInterState ? "IGST" : "CGST + SGST"}</span>
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">Invoice date</label>
              <input type="date" className="input" value={invoiceDate} max={todayStr()} onChange={e => setInvoiceDate(e.target.value || todayStr())} />
            </div>
            <div>
              <label className="label">Place of supply</label>
              <select className="input" value={placeOfSupply} onChange={e => setPosOverride(e.target.value)}>
                {GST_STATES.map(s => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
              </select>
              <p className="text-xs text-ink-3 mt-1">{isInterState ? "Other state — IGST will be charged" : "Same state — CGST + SGST"}</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes on invoice</label>
              <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Borewell depth 400 ft, warranty 1 year" />
            </div>
          </div>
        </details>

        <button className="md:hidden btn-ghost w-full text-red-600" onClick={() => setConfirmClear(true)} disabled={!cart.length && !customer.name}>Clear invoice</button>

        <TotalBar
          amount={inr(totals.finalTotal)}
          caption={cart.length ? `${itemCount} item${itemCount > 1 ? "s" : ""} · GST ${inr2(totals.gst)}${balance > 0 ? ` · ${inr(balance)} due` : ""}` : "Add items to start"}
          actionLabel="Save invoice"
          onAction={handleSave}
          loading={saving}
          disabled={cart.length === 0}
        />
      </section>

      {/* Mobile product picker */}
      {pickerOpen && (
        <Modal
          title="Add items"
          subtitle={itemCount ? `${itemCount} in bill · ${inr(totals.finalTotal)}` : "Tap an item to add it"}
          onClose={() => setPickerOpen(false)}
          fullOnMobile
          size="lg"
          footer={<button className="btn-primary w-full h-12" onClick={() => setPickerOpen(false)}>Done</button>}
        >
          <div className="h-full flex flex-col">
            <ProductPicker products={products} categories={categories} onPick={addProduct} inCart={inCart} />
          </div>
        </Modal>
      )}

      {serviceOpen && (
        <ServiceItemModal
          onClose={() => setServiceOpen(false)}
          onAdd={s => {
            setCart(prev => [...prev, serviceLine(s.name, s.rateExclGst, s.gst, s.qty, s.sac, s.unitName)]);
            setServiceOpen(false);
          }}
        />
      )}

      {editing && (
        <LineEditModal
          item={editing}
          maxQty={editing.isService ? undefined : stockOf(editing.productId)}
          onClose={() => setEditing(null)}
          onRemove={() => { setCart(prev => prev.filter(i => i.productId !== editing.productId)); setEditing(null); }}
          onSave={updated => { setCart(prev => prev.map(i => (i.productId === updated.productId ? updated : i))); setEditing(null); }}
        />
      )}

      {confirmClear && (
        <ConfirmModal
          title="Clear this invoice?"
          message="All items and customer details on this unsaved invoice will be removed."
          confirmText="Clear"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => { resetAll(); setConfirmClear(false); if (quotationId) router.replace("/billing"); }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-2">
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
