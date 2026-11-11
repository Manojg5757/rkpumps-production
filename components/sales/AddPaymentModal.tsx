"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Sale, PaymentMethod } from "../../types";
import { addPayment } from "../../lib/db";
import { saleTotal } from "../../lib/gst";
import { Modal } from "../ui/Modal";
import { inr, inr2 } from "../ui/Common";

interface AddPaymentModalProps {
  sale: Sale;
  onClose: () => void;
  onPaymentAdded: () => void;
}

export function AddPaymentModal({ sale, onClose, onPaymentAdded }: AddPaymentModalProps) {
  const pending = sale.pendingAmount || 0;
  const [amount, setAmount] = useState(pending > 0 ? String(pending) : "");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pay = Number(amount);
    if (!pay || pay <= 0) return toast.error("Enter the amount received");
    if (pay > pending + 0.001) return toast.error(`Amount is more than the balance of ${inr2(pending)}`);
    setLoading(true);
    try {
      await addPayment({
        invoiceId: sale.id,
        customerId: sale.customerId,
        amount: pay,
        method,
        note: note.trim() || `Payment for ${sale.billNumber}`,
      });
      toast.success(`${inr2(pay)} received`);
      onPaymentAdded();
    } catch (error) {
      toast.error((error as Error).message || "Could not save the payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Receive payment"
      subtitle={`${sale.billNumber} · ${sale.customer.name}`}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button form="pay-form" type="submit" disabled={loading} className="btn-success flex-1">{loading ? "Saving…" : "Save payment"}</button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div className="rounded-lg bg-surface p-2"><p className="text-xs text-ink-3">Invoice</p><p className="num font-semibold">{inr(saleTotal(sale))}</p></div>
        <div className="rounded-lg bg-emerald-50 p-2"><p className="text-xs text-emerald-700">Received</p><p className="num font-semibold text-emerald-800">{inr2(sale.paidAmount || 0)}</p></div>
        <div className="rounded-lg bg-amber-50 p-2"><p className="text-xs text-amber-700">Balance</p><p className="num font-semibold text-amber-900">{inr2(pending)}</p></div>
      </div>
      <form id="pay-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Amount received (₹)</label>
          <input className="input num text-lg font-semibold" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} autoFocus />
          <div className="flex gap-2 mt-2">
            <button type="button" className="chip" onClick={() => setAmount(String(pending))}>Full balance</button>
            {pending >= 2 && <button type="button" className="chip" onClick={() => setAmount(String(Math.round(pending / 2)))}>Half</button>}
          </div>
        </div>
        <div>
          <label className="label">Payment mode</label>
          <div className="flex gap-2 flex-wrap">
            {(["Cash", "UPI", "Bank", "Cheque"] as PaymentMethod[]).map(m => (
              <button type="button" key={m} onClick={() => setMethod(m)} className={method === m ? "chip-active" : "chip"}>{m === "Bank" ? "Bank transfer" : m}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Note</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional — e.g. UPI ref no." />
        </div>
      </form>
    </Modal>
  );
}
