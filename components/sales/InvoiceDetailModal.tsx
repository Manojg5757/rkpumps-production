"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BellRing, Download, IndianRupee, Printer, Share2, Wrench } from "lucide-react";
import { Modal } from "../ui/Modal";
import { StatusBadge, inr, inr2 } from "../ui/Common";
import { Payment, Sale } from "../../types";
import { getPayments } from "../../lib/db";
import { generateBillPDF } from "../../lib/pdf";
import { getSettings } from "../../lib/settings";
import { daysSince, saleTotal } from "../../lib/gst";
import { formatDate, formatDateTime } from "../../lib/utils";
import { downloadBlob, invoiceMessage, openBlob, openWhatsApp, reminderMessage, safeFileName, sharePdf } from "../../lib/share";

export const invoiceFileName = (s: Sale) => `${safeFileName(s.customer.name)}_${s.billNumber}.pdf`;

export async function invoicePdfAction(sale: Sale, action: "download" | "print" | "share") {
  try {
    const blob = await generateBillPDF(sale);
    const file = invoiceFileName(sale);
    if (action === "download") downloadBlob(blob, file);
    else if (action === "print") openBlob(blob, file);
    else await sharePdf(blob, file, invoiceMessage(sale), sale.customer.phone);
  } catch {
    toast.error("Could not create the PDF");
  }
}

export function InvoiceDetailModal({ sale, onClose, onAddPayment }: { sale: Sale; onClose: () => void; onAddPayment?: (s: Sale) => void }) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPayments(sale.customerId)
      .then(p => setPayments(p.filter(x => x.invoiceId === sale.id)))
      .catch(() => setPayments([]));
  }, [sale.id, sale.customerId]);

  const total = saleTotal(sale);
  const pending = sale.pendingAmount || 0;
  const overdue = pending > 0 && daysSince(sale.date) > 30;

  const run = async (a: "download" | "print" | "share") => {
    setBusy(true);
    await invoicePdfAction(sale, a);
    setBusy(false);
  };

  const remind = async () => {
    const s = await getSettings();
    openWhatsApp(sale.customer.phone, reminderMessage(sale.customer.name, pending, [sale.billNumber], s.name, s.upiId));
  };

  return (
    <Modal
      title={sale.billNumber}
      subtitle={`${formatDateTime(new Date(sale.date))}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-success col-span-3 sm:col-span-1" disabled={busy} onClick={() => run("share")}><Share2 size={18} /> Share</button>
          <button className="btn-secondary" disabled={busy} onClick={() => run("download")}><Download size={18} /> PDF</button>
          <button className="btn-secondary" disabled={busy} onClick={() => run("print")}><Printer size={18} /> Print</button>
          {pending > 0 && onAddPayment && (
            <>
              <button className="btn-primary col-span-2" onClick={() => onAddPayment(sale)}><IndianRupee size={18} /> Receive payment</button>
              <button className="btn-secondary" onClick={remind}><BellRing size={18} /> Remind</button>
            </>
          )}
        </div>
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{sale.customer.name}</p>
          <p className="text-sm text-ink-3 num">{sale.customer.phone}{sale.customer.address ? ` · ${sale.customer.address}` : ""}</p>
          {sale.customer.gstin && <p className="text-sm text-ink-3">GSTIN {sale.customer.gstin}</p>}
        </div>
        <StatusBadge status={sale.paymentStatus} overdue={overdue} />
      </div>

      <ul className="divide-y divide-line mt-4 border-y border-line">
        {sale.items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="font-medium flex items-center gap-1.5">{i.isService && <Wrench size={13} className="text-ink-3" />}{i.name}</span>
              <span className="text-ink-3 num">
                {i.quantity} {i.unitName} × {inr2(i.basePrice)}{i.discountPercent ? ` − ${i.discountPercent}%` : ""} + {i.gstPercentage}% GST
              </span>
            </span>
            <span className="num font-semibold shrink-0">{inr2(i.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="text-sm space-y-1.5 mt-3">
        <Row l="Taxable value" v={inr2(sale.totalTaxableAmount)} />
        {sale.isInterState ? <Row l="IGST" v={inr2(sale.totalGSTAmount)} /> : (
          <>
            <Row l="CGST" v={inr2(sale.totalGSTAmount / 2)} />
            <Row l="SGST" v={inr2(sale.totalGSTAmount / 2)} />
          </>
        )}
        {Math.abs(sale.roundOff ?? 0) >= 0.01 && <Row l="Round off" v={(sale.roundOff ?? 0).toFixed(2)} />}
        <div className="flex justify-between font-semibold text-base pt-2 border-t border-line"><span>Invoice total</span><span className="num">{inr(total)}</span></div>
        <Row l="Received" v={inr2(sale.paidAmount || 0)} cls="text-emerald-700" />
        {pending > 0 && <div className="flex justify-between font-semibold text-amber-800"><span>Balance due · {daysSince(sale.date)} days</span><span className="num">{inr2(pending)}</span></div>}
      </div>

      {sale.notes && <p className="text-sm text-ink-2 mt-3 bg-surface rounded-lg p-3">{sale.notes}</p>}

      <div className="mt-4">
        <p className="text-sm font-semibold mb-2">Payments</p>
        {payments === null ? (
          <p className="text-sm text-ink-3">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-ink-3">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {payments.map(p => (
              <li key={p.id} className="flex justify-between text-sm bg-emerald-50/60 rounded-lg px-3 py-2">
                <span>{formatDate(new Date(p.createdAt))} · {p.method}{p.note ? <span className="text-ink-3"> · {p.note}</span> : null}</span>
                <span className="num font-semibold text-emerald-700">{inr2(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function Row({ l, v, cls = "" }: { l: string; v: string; cls?: string }) {
  return <div className={`flex justify-between text-ink-2 ${cls}`}><span>{l}</span><span className="num">{v}</span></div>;
}
