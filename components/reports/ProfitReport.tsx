"use client";

import { useMemo } from "react";
import { Expense, Sale, StockEntry } from "../../types";
import { saleCost } from "../../lib/gst";
import { inr } from "../ui/Common";

export function ProfitReport({ sales, expenses, entries }: { sales: Sale[]; expenses: Expense[]; entries: StockEntry[] }) {
  const rows = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(), y = d.getFullYear();
      const inMonth = (x: Date) => { const t = new Date(x); return t.getMonth() === m && t.getFullYear() === y; };
      const ms = sales.filter(s => inMonth(s.date));
      const revenue = ms.reduce((s, x) => s + x.totalTaxableAmount, 0);
      const cogs = ms.reduce((s, x) => s + saleCost(x), 0);
      const exp = expenses.filter(e => inMonth(e.createdAt)).reduce((s, e) => s + e.amount, 0);
      const bought = entries.filter(e => e.type === "IN" && inMonth(e.date)).reduce((s, e) => s + (e.purchasePrice || 0) * e.quantity, 0);
      return {
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        count: ms.length, revenue, cogs, gross: revenue - cogs, exp, net: revenue - cogs - exp, bought,
      };
    });
  }, [sales, expenses, entries]);

  const t = rows.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cogs: a.cogs + r.cogs, exp: a.exp + r.exp, net: a.net + r.net, bought: a.bought + r.bought }),
    { revenue: 0, cogs: 0, exp: 0, net: 0, bought: 0 });

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Last 12 months. Sales are shown without GST. Cost of goods uses the purchase price at the time of sale.</p>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Month</th>
                <th className="th text-right">Sales</th>
                <th className="th text-right">Cost of goods</th>
                <th className="th text-right">Gross profit</th>
                <th className="th text-right">Expenses</th>
                <th className="th text-right">Net profit</th>
                <th className="th text-right">Stock bought</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label}>
                  <td className="td font-medium whitespace-nowrap">{r.label}<span className="text-xs text-ink-3 font-normal ml-1">· {r.count}</span></td>
                  <td className="td text-right num">{inr(r.revenue)}</td>
                  <td className="td text-right num text-ink-2">{inr(r.cogs)}</td>
                  <td className="td text-right num">{inr(r.gross)}</td>
                  <td className="td text-right num text-ink-2">{inr(r.exp)}</td>
                  <td className={`td text-right num font-semibold ${r.net < 0 ? "text-red-700" : "text-emerald-700"}`}>{inr(r.net)}</td>
                  <td className="td text-right num text-ink-3">{inr(r.bought)}</td>
                </tr>
              ))}
              <tr className="bg-surface font-semibold">
                <td className="td">Total</td>
                <td className="td text-right num">{inr(t.revenue)}</td>
                <td className="td text-right num">{inr(t.cogs)}</td>
                <td className="td text-right num">{inr(t.revenue - t.cogs)}</td>
                <td className="td text-right num">{inr(t.exp)}</td>
                <td className={`td text-right num ${t.net < 0 ? "text-red-700" : "text-emerald-700"}`}>{inr(t.net)}</td>
                <td className="td text-right num">{inr(t.bought)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
