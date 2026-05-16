"use client";

import { useState, useEffect } from "react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { RevenueChart } from "../components/dashboard/RevenueChart";
import { getSales, getLowStockProducts } from "../lib/db";
import { Sale, Product } from "../types";

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, ls] = await Promise.all([
          getSales(100),
          getLowStockProducts()
        ]);
        setSales(s);
        setLowStock(ls);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading Dashboard...</div>;
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const revenue = thisMonthSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const gstCollected = thisMonthSales.reduce((sum, s) => sum + s.totalGSTAmount, 0);
  const salesCount = thisMonthSales.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Revenue This Month" 
          value={`₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="IndianRupee"
          delay={0.1}
        />
        <MetricCard 
          title="Sales This Month" 
          value={salesCount.toString()}
          icon="Receipt"
          delay={0.2}
        />
        <MetricCard 
          title="GST Collected This Month" 
          value={`₹${gstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon="Percent"
          delay={0.3}
        />
        <MetricCard 
          title="Low Stock Alerts" 
          value={lowStock.length.toString()}
          icon="AlertTriangle"
          alert={lowStock.length > 0}
          link="/inventory"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue Overview</h2>
          <RevenueChart sales={sales} />
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Invoices</h2>
          <div className="space-y-4">
            {sales.slice(0, 5).map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{sale.billNumber}</p>
                  <p className="text-sm text-gray-500">{sale.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₹{sale.grandTotal.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(sale.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <p className="text-gray-500 text-center py-4">No recent sales</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

