"use client";

import { CartItem } from "../../types";

interface BillSummaryProps {
  cart: CartItem[];
  onClear: () => void;
  onComplete: () => void;
  loading: boolean;
  canComplete: boolean;
}

export function BillSummary({ cart, onClear, onComplete, loading, canComplete }: BillSummaryProps) {
  const taxable = cart.reduce((sum, item) => sum + item.lineTaxableAmount, 0);
  const gst = cart.reduce((sum, item) => sum + item.lineGSTAmount, 0);
  const total = taxable + gst;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-auto">
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Taxable Amount</span>
          <span>₹{taxable.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Total GST</span>
          <span>₹{gst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-100 pt-2 mt-2">
          <span>Grand Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={onClear}
          disabled={loading || cart.length === 0}
          className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 w-1/3"
        >
          Clear
        </button>
        <button 
          onClick={onComplete}
          disabled={loading || !canComplete || cart.length === 0}
          className="flex-1 bg-indigo-600 text-white font-bold rounded-lg py-3 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Complete Sale"
          )}
        </button>
      </div>
    </div>
  );
}
