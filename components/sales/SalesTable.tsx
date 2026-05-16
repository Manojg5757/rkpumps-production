"use client";

import { Sale } from "../../types";
import { Download, Printer } from "lucide-react";

interface SalesTableProps {
  sales: Sale[];
  onDownload: (sale: Sale) => void;
  onPrint: (sale: Sale) => void;
}

export function SalesTable({ sales, onDownload, onPrint }: SalesTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-4">Bill No.</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Customer Name</th>
              <th className="p-4">Customer GSTIN</th>
              <th className="p-4 text-center">Items</th>
              <th className="p-4 text-right">Taxable Amt</th>
              <th className="p-4 text-right">GST</th>
              <th className="p-4 text-right text-gray-900 font-bold">Grand Total</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{sale.billNumber}</td>
                <td className="p-4 text-gray-600 text-sm">{new Date(sale.date).toLocaleString('en-IN')}</td>
                <td className="p-4 text-gray-800">{sale.customer.name}</td>
                <td className="p-4 text-gray-500 text-sm">{sale.customer.gstin || '-'}</td>
                <td className="p-4 text-center text-gray-600">{sale.items.length}</td>
                <td className="p-4 text-right text-gray-600">₹{sale.totalTaxableAmount.toFixed(2)}</td>
                <td className="p-4 text-right text-gray-600">₹{sale.totalGSTAmount.toFixed(2)}</td>
                <td className="p-4 text-right font-bold text-indigo-700">₹{sale.grandTotal.toFixed(2)}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
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
                <td colSpan={9} className="p-8 text-center text-gray-500">
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
