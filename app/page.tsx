"use client";

import { useState, useEffect } from "react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { RevenueChart } from "../components/dashboard/RevenueChart";
import { getSales, getLowStockProducts, getExpenses, getPendingSales, getProducts } from "../lib/db";
import { Sale, Product, Expense } from "../types";
import { TrendingUp, Clock, TrendingDown } from "lucide-react";
import Link from "next/link";
import { generateBillPDF } from "../lib/pdf";

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, ls, exp, ps, prods] = await Promise.all([
          getSales(200),
          getLowStockProducts(),
          getExpenses(),
          getPendingSales(),
          getProducts()
        ]);
        setSales(s);
        setLowStock(ls);
        setExpenses(exp);
        setPendingSales(ps);
        setAllProducts(prods);
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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const revenue = thisMonthSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const salesCount = thisMonthSales.length;

  // COGS: purchasePrice * quantity for each item
  const thisMonthCOGS = thisMonthSales.reduce((sum, s) =>
    sum + s.items.reduce((iSum, item) => iSum + (item.purchasePrice || 0) * item.quantity, 0), 0
  );

  // Gross profit = taxable revenue - COGS
  const thisMonthTaxable = thisMonthSales.reduce((sum, s) => sum + s.totalTaxableAmount, 0);
  const grossProfit = thisMonthTaxable - thisMonthCOGS;

  // Monthly expenses
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Net profit
  const netProfit = grossProfit - totalExpenses;

  // Total pending amount
  const totalPending = pendingSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);

  // Fast-moving products (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentSales = sales.filter(s => new Date(s.date) >= thirtyDaysAgo);

  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  recentSales.forEach(s => {
    s.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.lineTotal;
    });
  });

  const fastMoving = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Slow-moving / dead stock: products with stock > 0 that had no sales in last 30 days
  const soldProductIds = new Set(recentSales.flatMap(s => s.items.map(i => i.productId)));
  const slowMoving = allProducts
    .filter(p => p.stockQuantity > 0 && !soldProductIds.has(p.id))
    .sort((a, b) => b.stockQuantity - a.stockQuantity)
    .slice(0, 5);

  // Pending customers (unique customers with pending)
  const pendingByCustomer: Record<string, { name: string; phone: string; pending: number; oldest: Date }> = {};
  pendingSales.forEach(s => {
    const key = s.customerId;
    if (!pendingByCustomer[key]) {
      pendingByCustomer[key] = { name: s.customer.name, phone: s.customer.phone, pending: 0, oldest: new Date(s.date) };
    }
    pendingByCustomer[key].pending += (s.pendingAmount || 0);
    if (new Date(s.date) < pendingByCustomer[key].oldest) {
      pendingByCustomer[key].oldest = new Date(s.date);
    }
  });

  const pendingCustomers = Object.values(pendingByCustomer)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 6);

  const daysSince = (date: Date) => Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const handleDownloadPDF = async (sale: Sale) => {
    try {
      const pdfBlob = await generateBillPDF(sale);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = sale.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${safeName}_${sale.billNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue This Month"
          value={`₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
          sub={`${salesCount} invoices`}
          icon="IndianRupee"
          delay={0.1}
        />
        <MetricCard
          title="Net Profit This Month"
          value={`₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
          sub={`After ₹${totalExpenses.toLocaleString('en-IN')} expenses`}
          icon="TrendingUp"
          alert={netProfit < 0}
          delay={0.2}
        />
        <MetricCard
          title="Pending Payments"
          value={`₹${totalPending.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
          sub={`${pendingSales.length} invoices`}
          icon="Clock"
          alert={totalPending > 0}
          link="/sales"
          delay={0.3}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={lowStock.length.toString()}
          sub="products need restocking"
          icon="AlertTriangle"
          alert={lowStock.length > 0}
          link="/inventory"
          delay={0.4}
        />
      </div>

      {/* Profit Breakdown Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-600" />
          This Month's P&amp;L Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-indigo-700 font-medium">Sales Revenue (excl. GST)</p>
            <p className="text-xl font-bold text-indigo-900">₹{thisMonthTaxable.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="text-orange-700 font-medium">Cost of Goods</p>
            <p className="text-xl font-bold text-orange-900">₹{thisMonthCOGS.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-red-700 font-medium">Business Expenses</p>
            <p className="text-xl font-bold text-red-900">₹{totalExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div className={`rounded-lg p-3 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`font-medium ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net Profit</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              ₹{netProfit.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Chart + Pending Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue Overview</h2>
          <RevenueChart sales={sales} />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2"><Clock size={16} className="text-amber-500" /> Pending Payments</span>
            <Link href="/sales" className="text-xs text-indigo-600 hover:underline">View All</Link>
          </h2>
          {pendingCustomers.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No pending payments</p>
          ) : (
            <div className="space-y-2.5">
              {pendingCustomers.map((c, i) => {
                const days = daysSince(c.oldest);
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-amber-50 border border-gray-100 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone} · {days}d overdue</p>
                    </div>
                    <span className={`font-bold text-sm ${days > 30 ? 'text-red-600' : days > 7 ? 'text-amber-600' : 'text-gray-700'}`}>
                      ₹{c.pending.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fast Moving Products + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" /> Fast Moving Products (Last 30 Days)
          </h2>
          {fastMoving.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No sales data in last 30 days</p>
          ) : (
            <div className="space-y-2">
              {fastMoving.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{p.quantity} units</p>
                    <p className="text-xs text-gray-500">₹{p.revenue.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center justify-between">
            <span>Recent Invoices</span>
            <Link href="/sales" className="text-xs text-indigo-600 hover:underline">View All</Link>
          </h2>
          <div className="space-y-3">
            {sales.slice(0, 6).map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-2.5 hover:bg-gray-50 rounded-lg border border-gray-50">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{sale.billNumber}</p>
                  <p className="text-xs text-gray-500">{sale.customer.name}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">₹{sale.grandTotal.toLocaleString('en-IN')}</p>
                    <div className="flex justify-end">
                      {(sale.paymentStatus === 'paid' || !sale.paymentStatus) && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Paid</span>
                      )}
                      {sale.paymentStatus === 'partial' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Partial</span>
                      )}
                      {sale.paymentStatus === 'unpaid' && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Unpaid</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(sale)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs bg-indigo-50 px-2 py-1 rounded"
                    title="Download PDF"
                  >
                    PDF
                  </button>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <p className="text-gray-500 text-center py-4 text-sm">No recent sales</p>
            )}
          </div>
        </div>
      </div>

      {/* Slow Moving / Dead Stock */}
      {slowMoving.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-amber-500" />
            Dead Stock — No Sales in Last 30 Days
            <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Money locked in inventory</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs">
                  <th className="pb-2 text-left font-medium">Product</th>
                  <th className="pb-2 text-left font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Stock</th>
                  <th className="pb-2 text-right font-medium">Purchase Price</th>
                  <th className="pb-2 text-right font-medium">Est. Value Locked</th>
                </tr>
              </thead>
              <tbody>
                {slowMoving.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-amber-50">
                    <td className="py-2 font-medium text-gray-900">{p.name}</td>
                    <td className="py-2 text-gray-500">{p.categoryName}</td>
                    <td className="py-2 text-right text-gray-700">{p.stockQuantity} {p.unitName}</td>
                    <td className="py-2 text-right text-gray-600">
                      {p.purchasePrice ? `₹${p.purchasePrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 text-right font-semibold text-amber-700">
                      {p.purchasePrice ? `₹${(p.purchasePrice * p.stockQuantity).toLocaleString('en-IN')}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/inventory" className="text-xs text-indigo-600 hover:underline mt-3 inline-block">
            View Full Inventory →
          </Link>
        </div>
      )}
    </div>
  );
}
