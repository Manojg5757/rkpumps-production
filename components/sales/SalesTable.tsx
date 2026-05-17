"use client";

import { Sale } from "../../types";
import { Download, Printer, PlusCircle } from "lucide-react";

interface SalesTableProps {
  sales: Sale[];
  onDownload: (sale: Sale) => void;
  onPrint: (sale: Sale) => void;
  onAddPayment?: (sale: Sale) => void;
}

function PaymentBadge({ status }: { status: Sale['paymentStatus'] }) {
  if (status === 'paid') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Paid</span>;
  if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Partial</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Unpaid</span>;
}

export function SalesTable({ sales, onDownload, onPrint, onAddPayment }: SalesTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-4">Bill No.</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Customer</th>
              <th className="p-4">GSTIN</th>
              <th className="p-4 text-center">Items</th>
              <th className="p-4 text-right">Taxable</th>
              <th className="p-4 text-right">GST</th>
              <th className="p-4 text-right font-bold text-gray-900">Total</th>
              <th className="p-4 text-right">Paid</th>
              <th className="p-4 text-right">Pending</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{sale.billNumber}</td>
                <td className="p-4 text-gray-600 text-sm">{new Date(sale.date).toLocaleString('en-IN')}</td>
                <td className="p-4">
                  <div className="font-medium text-gray-800">{sale.customer.name}</div>
                  {sale.customer.phone && <div className="text-xs text-gray-500">{sale.customer.phone}</div>}
                </td>
                <td className="p-4 text-gray-500 text-sm">{sale.customer.gstin || '-'}</td>
                <td className="p-4 text-center text-gray-600">{sale.items.length}</td>
                <td className="p-4 text-right text-gray-600">₹{sale.totalTaxableAmount.toFixed(2)}</td>
                <td className="p-4 text-right text-gray-600">₹{sale.totalGSTAmount.toFixed(2)}</td>
                <td className="p-4 text-right font-bold text-indigo-700">₹{sale.grandTotal.toFixed(2)}</td>
                <td className="p-4 text-right text-green-700 font-medium">₹{(sale.paidAmount || 0).toFixed(2)}</td>
                <td className="p-4 text-right text-amber-700 font-medium">
                  {(sale.pendingAmount || 0) > 0 ? `₹${sale.pendingAmount.toFixed(2)}` : '-'}
                </td>
                <td className="p-4 text-center">
                  <PaymentBadge status={sale.paymentStatus || 'paid'} />
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {onAddPayment && (sale.paymentStatus === 'partial' || sale.paymentStatus === 'unpaid') && (
                      <button
                        onClick={() => onAddPayment(sale)}
                        className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded"
                        title="Add Payment"
                      >
                        <PlusCircle size={18} />
                      </button>
                    )}
                    <button onClick={() => onDownload(sale)} className="text-indigo-600 hover:text-indigo-800 p-1 bg-indigo-50 rounded" title="Download PDF">
                      <Download size={18} />
                    </button>
                    <button onClick={() => onPrint(sale)} className="text-gray-600 hover:text-gray-800 p-1 bg-gray-100 rounded" title="View / Print">
                      <Printer size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-gray-500">
                  No sales records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
