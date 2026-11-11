"use client";

import { useMemo, useState } from "react";
import { Sale, StockEntry } from "../../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, subMonths, startOfWeek, addWeeks } from "date-fns";
import { saleProfit, saleTotal } from "../../lib/gst";
import { Segmented } from "../ui/Common";

type Period = "daily" | "weekly" | "monthly";

const BRAND = "#0E5A7A";
const PROFIT = "#1F8A5B";
const BOUGHT = "#C9A227";

const fmtY = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`);
const rupee = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function bucket(sales: Sale[], start: Date, end: Date) {
  const list = sales.filter(s => { const d = new Date(s.date); return d >= start && d < end; });
  return {
    revenue: list.reduce((s, x) => s + saleTotal(x), 0),
    profit: list.reduce((s, x) => s + saleProfit(x), 0),
    count: list.length,
  };
}

export function RevenueChart({ sales }: { sales: Sale[] }) {
  const [period, setPeriod] = useState<Period>("daily");

  const data = useMemo(() => {
    const now = new Date();
    if (period === "daily") {
      return Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(now, 13 - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return { name: format(d, "dd MMM"), ...bucket(sales, start, new Date(start.getTime() + 86400000)) };
      });
    }
    if (period === "weekly") {
      return Array.from({ length: 12 }).map((_, i) => {
        const ws = startOfWeek(subDays(now, (11 - i) * 7), { weekStartsOn: 1 });
        return { name: format(ws, "dd MMM"), ...bucket(sales, ws, addWeeks(ws, 1)) };
      });
    }
    return Array.from({ length: 12 }).map((_, i) => {
      const d = subMonths(now, 11 - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      return { name: format(d, "MMM yy"), ...bucket(sales, start, new Date(d.getFullYear(), d.getMonth() + 1, 1)) };
    });
  }, [sales, period]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />Sales</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: PROFIT }} />Gross profit</span>
        </div>
        <Segmented<Period> value={period} onChange={setPeriod} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} />
      </div>
      <ResponsiveContainer width="99%" height={240} minWidth={1}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#E8EDEF" />
          <XAxis dataKey="name" stroke="#7B8A92" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis stroke="#7B8A92" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtY} width={48} />
          <Tooltip
            cursor={{ fill: "#F3F6F7" }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <div className="bg-white p-3 border border-line shadow-lg rounded-lg text-sm">
                  <p className="font-semibold mb-1">{payload[0].payload.name}</p>
                  <p style={{ color: BRAND }}>Sales {rupee(Number(payload[0].payload.revenue))}</p>
                  <p style={{ color: PROFIT }}>Gross profit {rupee(Number(payload[0].payload.profit))}</p>
                  <p className="text-xs text-ink-3 mt-1">{payload[0].payload.count} invoices</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="revenue" fill={BRAND} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="profit" fill={PROFIT} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Stock bought (purchase cost of IN entries) vs sales, last 6 months. */
export function PurchaseSalesChart({ sales, entries }: { sales: Sale[]; entries: StockEntry[] }) {
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(now, 5 - i);
      const m = d.getMonth(), y = d.getFullYear();
      const inM = (x: Date) => { const t = new Date(x); return t.getMonth() === m && t.getFullYear() === y; };
      return {
        name: format(d, "MMM"),
        sold: sales.filter(s => inM(s.date)).reduce((s, x) => s + x.totalTaxableAmount, 0),
        bought: entries.filter(e => e.type === "IN" && inM(e.date)).reduce((s, e) => s + (e.purchasePrice || 0) * e.quantity, 0),
      };
    });
  }, [sales, entries]);

  return (
    <div>
      <div className="flex items-center gap-3 text-xs text-ink-3 mb-3">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BOUGHT }} />Stock bought</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />Sold (excl. GST)</span>
      </div>
      <ResponsiveContainer width="99%" height={200} minWidth={1}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#E8EDEF" />
          <XAxis dataKey="name" stroke="#7B8A92" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#7B8A92" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtY} width={48} />
          <Tooltip
            cursor={{ fill: "#F3F6F7" }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <div className="bg-white p-3 border border-line shadow-lg rounded-lg text-sm">
                  <p className="font-semibold mb-1">{payload[0].payload.name}</p>
                  <p style={{ color: "#8A6D12" }}>Bought {rupee(Number(payload[0].payload.bought))}</p>
                  <p style={{ color: BRAND }}>Sold {rupee(Number(payload[0].payload.sold))}</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="bought" fill={BOUGHT} radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="sold" fill={BRAND} radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
