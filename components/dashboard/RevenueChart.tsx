"use client";

import { useState } from "react";
import { Sale } from "../../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { format, subDays, subMonths, startOfWeek, addWeeks } from "date-fns";

type Period = 'daily' | 'weekly' | 'monthly';

function buildDailyData(sales: Sale[], days = 30) {
  return Array.from({ length: days }).map((_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    const dateStr = format(d, "MMM dd");
    const daySales = sales.filter(s => format(new Date(s.date), "MMM dd yyyy") === format(d, "MMM dd yyyy"));
    const revenue = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
    const profit = daySales.reduce((sum, s) =>
      sum + s.items.reduce((is, it) => is + (it.basePrice - (it.purchasePrice || 0)) * it.quantity, 0), 0
    );
    return { name: dateStr, revenue, profit, count: daySales.length };
  });
}

function buildWeeklyData(sales: Sale[]) {
  return Array.from({ length: 12 }).map((_, i) => {
    const weekStart = startOfWeek(subDays(new Date(), (11 - i) * 7));
    const weekEnd = addWeeks(weekStart, 1);
    const label = `W${format(weekStart, 'dd/MM')}`;
    const weekSales = sales.filter(s => {
      const d = new Date(s.date);
      return d >= weekStart && d < weekEnd;
    });
    const revenue = weekSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const profit = weekSales.reduce((sum, s) =>
      sum + s.items.reduce((is, it) => is + (it.basePrice - (it.purchasePrice || 0)) * it.quantity, 0), 0
    );
    return { name: label, revenue, profit, count: weekSales.length };
  });
}

function buildMonthlyData(sales: Sale[]) {
  return Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(new Date(), 11 - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = format(d, "MMM yy");
    const monthSales = sales.filter(s => {
      const sd = new Date(s.date);
      return sd.getMonth() === month && sd.getFullYear() === year;
    });
    const revenue = monthSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const profit = monthSales.reduce((sum, s) =>
      sum + s.items.reduce((is, it) => is + (it.basePrice - (it.purchasePrice || 0)) * it.quantity, 0), 0
    );
    return { name: label, revenue, profit, count: monthSales.length };
  });
}

export function RevenueChart({ sales }: { sales: Sale[] }) {
  const [period, setPeriod] = useState<Period>('daily');

  const data =
    period === 'daily' ? buildDailyData(sales, 14) :
    period === 'weekly' ? buildWeeklyData(sales) :
    buildMonthlyData(sales);

  const formatY = (v: number) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="99%" height={260} minWidth={1}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatY} width={55} />
          <Tooltip
            cursor={{ fill: '#f3f4f6' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                    <p className="font-semibold text-gray-900 mb-1">{payload[0].payload.name}</p>
                    <p className="text-indigo-600">Revenue: ₹{Number(payload[0]?.value || 0).toLocaleString('en-IN')}</p>
                    <p className="text-green-600">Gross Profit: ₹{Number(payload[1]?.value || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-400 mt-1">{payload[0].payload.count} bills</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Bar dataKey="profit" name="Gross Profit" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
