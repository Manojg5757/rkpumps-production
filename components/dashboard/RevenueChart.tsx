"use client";

import { Sale } from "../../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

export function RevenueChart({ sales }: { sales: Sale[] }) {
  // Simple daily aggregation for the last 7 days
  const data = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "MMM dd");
    
    const daySales = sales.filter(s => format(new Date(s.date), "MMM dd") === dateStr);
    const revenue = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
    
    return {
      name: dateStr,
      revenue,
      count: daySales.length
    };
  });

  return (
    <div className="h-72 w-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={data}>
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis 
            stroke="#888888" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#f3f4f6' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                    <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                    <p className="text-indigo-600 font-medium">₹{payload[0].value}</p>
                    <p className="text-xs text-gray-500 mt-1">{payload[0].payload.count} bills</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
