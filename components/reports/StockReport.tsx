"use client";

import { Download, Printer } from "lucide-react";
import { Product } from "../../types";
import { inr, inr2 } from "../ui/Common";
import { downloadCsv } from "../../lib/dates";

export function StockReport({ products }: { products: Product[] }) {
  const sorted = products.filter(p => !p.isService).sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name));
  const totalCost = sorted.reduce((s, p) => s + Math.max(0, p.stockQuantity) * (p.purchasePrice || 0), 0);

  const exportCsv = () =>
    downloadCsv(`Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Product", "Category", "HSN", "Unit", "Stock", "Purchase Price", "Stock Value", "Status"],
      sorted.map(p => [p.name, p.categoryName, p.hsnCode || "", p.unitName, p.stockQuantity, (p.purchasePrice || 0).toFixed(2),
        (Math.max(0, p.stockQuantity) * (p.purchasePrice || 0)).toFixed(2),
        p.stockQuantity <= 0 ? "Out of stock" : p.stockQuantity <= p.lowStockThreshold ? "Low" : "OK"]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-ink-2">Total stock value at cost: <b className="num">{inr(totalCost)}</b></p>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary px-3"><Download size={17} /><span className="hidden sm:inline">CSV</span></button>
          <button onClick={() => window.print()} className="btn-secondary px-3"><Printer size={17} /><span className="hidden sm:inline">Print</span></button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Product</th>
                <th className="th hidden sm:table-cell">Category</th>
                <th className="th text-right">Stock</th>
                <th className="th text-right hidden sm:table-cell">Cost</th>
                <th className="th text-right">Value</th>
                <th className="th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const out = p.stockQuantity <= 0;
                const low = !out && p.stockQuantity <= p.lowStockThreshold;
                return (
                  <tr key={p.id}>
                    <td className="td font-medium">{p.name}<span className="sm:hidden block text-xs text-ink-3 font-normal">{p.categoryName}</span></td>
                    <td className="td text-ink-2 hidden sm:table-cell">{p.categoryName}</td>
                    <td className="td text-right num font-semibold whitespace-nowrap">{p.stockQuantity} <span className="text-ink-3 font-normal text-xs">{p.unitName}</span></td>
                    <td className="td text-right num text-ink-2 hidden sm:table-cell">{inr2(p.purchasePrice || 0)}</td>
                    <td className="td text-right num">{inr(Math.max(0, p.stockQuantity) * (p.purchasePrice || 0))}</td>
                    <td className="td text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${out ? "bg-red-50 text-red-700" : low ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                        {out ? "Out" : low ? "Low" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && <tr><td colSpan={6} className="td text-center text-ink-3 py-8">No products yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
