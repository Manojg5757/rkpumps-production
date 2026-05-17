"use client";

import { useState, useEffect } from "react";
import { getExpenses, addExpense } from "../../lib/db";
import { Expense } from "../../types";
import { Receipt, Plus, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";

const EXPENSE_CATEGORIES = [
  "Transport",
  "Fuel",
  "Labour / Electrician",
  "Shop Rent",
  "Repairs & Maintenance",
  "Tools & Equipment",
  "Packaging",
  "Utilities",
  "Miscellaneous",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");

  const [filterCategory, setFilterCategory] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error("Title and a valid amount are required");
      return;
    }
    setAdding(true);
    try {
      const exp = await addExpense({
        title: title.trim(),
        amount: Number(amount),
        category,
        note: note.trim(),
      });
      setExpenses(prev => [exp, ...prev]);
      setTitle(""); setAmount(""); setNote("");
      setCategory(EXPENSE_CATEGORIES[0]);
      setShowForm(false);
      toast.success("Expense recorded");
    } catch (error) {
      console.error("Add expense error:", error);
      toast.error((error as Error).message || "Failed to add expense");
    } finally {
      setAdding(false);
    }
  };

  const filtered = expenses.filter(e => {
    const matchesCat = filterCategory === "ALL" || e.category === filterCategory;
    let matchesDate = true;
    const expDate = new Date(e.createdAt);
    expDate.setHours(0, 0, 0, 0);
    if (startDate) {
      const [y, m, d] = startDate.split('-').map(Number);
      if (expDate < new Date(y, m - 1, d)) matchesDate = false;
    }
    if (endDate) {
      const [y, m, d] = endDate.split('-').map(Number);
      const end = new Date(y, m - 1, d);
      end.setHours(23, 59, 59, 999);
      if (expDate > end) matchesDate = false;
    }
    return matchesCat && matchesDate;
  });

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt size={24} className="text-indigo-600" />
          Expenses
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
          <p className="text-sm text-red-700 font-medium">This Month's Expenses</p>
          <p className="text-2xl font-bold text-red-900">₹{thisMonthTotal.toLocaleString('en-IN')}</p>
          <p className="text-xs text-red-600 mt-1">{thisMonthExpenses.length} transactions</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
          <p className="text-sm text-gray-600 font-medium">Total All Time</p>
          <p className="text-2xl font-bold text-gray-900">₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
          <p className="text-sm text-gray-600 font-medium">Filtered Total</p>
          <p className="text-2xl font-bold text-gray-900">₹{totalFiltered.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Record New Expense</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expense Title *</label>
              <input
                required
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Petrol for delivery"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Additional details..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {adding ? "Saving..." : "Record Expense"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          title="From Date"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          title="To Date"
        />
        <button
          onClick={() => { setFilterCategory("ALL"); setStartDate(""); setEndDate(""); }}
          className="text-sm text-indigo-600 hover:text-indigo-800 px-3 py-2"
        >
          Clear Filters
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading expenses...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4">Date</th>
                <th className="p-4">Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Note</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">{new Date(e.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="p-4 font-medium text-gray-900">{e.title}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">{e.category}</span>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{e.note || '-'}</td>
                  <td className="p-4 text-right font-semibold text-red-700">₹{e.amount.toFixed(2)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No expenses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
