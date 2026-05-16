"use client";

import { useState, useEffect } from "react";
import { StockReport } from "../../components/reports/StockReport";
import { EntryReport } from "../../components/reports/EntryReport";
import { getProducts, getStockEntries } from "../../lib/db";
import { Product, StockEntry } from "../../types";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "entries">("stock");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "stock") {
        const p = await getProducts();
        setProducts(p);
      } else {
        const [e, p] = await Promise.all([getStockEntries(), getProducts()]);
        setEntries(e);
        setProducts(p);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 print:hidden">Reports</h1>

      <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl w-fit print:hidden">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "stock" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          Stock Report
        </button>
        <button
          onClick={() => setActiveTab("entries")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "entries" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          Stock Entries Log
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading report data...</div>
      ) : (
        <div>
          {activeTab === "stock" && <StockReport products={products} />}
          {activeTab === "entries" && <EntryReport entries={entries} products={products} onNewEntry={loadData} />}
        </div>
      )}
    </div>
  );
}
