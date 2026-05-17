"use client";

import { useState } from "react";
import { Sale } from "../../types";
import { addPayment } from "../../lib/db";
import { X, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";

interface AddPaymentModalProps {
  sale: Sale;
  onClose: () => void;
  onPaymentAdded: () => void;
}

export function AddPaymentModal({ sale, onClose, onPaymentAdded }: AddPaymentModalProps) {
  const [amount, setAmount] = useState<number | "">(sale.pendingAmount > 0 ? sale.pendingAmount : "");
  const [method, setMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const maxPayable = sale.pendingAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (payAmount > maxPayable) {
      toast.error(`Cannot exceed pending amount of ₹${maxPayable.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      await addPayment({
        invoiceId: sale.id,
        customerId: sale.customerId,
        amount: payAmount,
        method,
        note: note.trim() || `Payment for ${sale.billNumber}`,
      });
      toast.success(`Payment of ₹${payAmount.toFixed(2)} recorded`);
      onPaymentAdded();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error((error as Error).message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2 border border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Invoice</span>
              <span className="font-semibold text-gray-900">{sale.billNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Customer</span>
              <span className="font-medium text-gray-900">{sale.customer.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Grand Total</span>
              <span className="font-semibold text-gray-900">₹{sale.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Already Paid</span>
              <span className="font-medium text-green-700">₹{sale.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-700 font-medium">Pending Balance</span>
              <span className="font-bold text-amber-700">₹{sale.pendingAmount.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IndianRupee size={16} /></span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={maxPayable}
                  value={amount}
                  onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-green-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as 'Cash' | 'UPI' | 'Bank')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Partial payment received"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
