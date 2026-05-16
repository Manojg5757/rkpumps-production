"use client";

import { useState } from "react";
import { Product, Category, Unit } from "../../types";
import { Edit, Trash2, PlusCircle, AlertCircle } from "lucide-react";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  units: Unit[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddStock: (product: Product) => void;
}

export function ProductTable({ products, categories, units, onEdit, onDelete, onAddStock }: ProductTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(p => {
    const isLowStock = p.stockQuantity <= p.lowStockThreshold;
    const matchesCat = selectedCategory === "ALL" || 
                       (selectedCategory === "LOW_STOCK" ? isLowStock : p.categoryId === selectedCategory);
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <input 
              type="checkbox" 
              checked={selectedCategory === "LOW_STOCK"} 
              onChange={(e) => setSelectedCategory(e.target.checked ? "LOW_STOCK" : "ALL")}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            Only Low Stock
          </label>
        </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Unit</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3 text-right">Base Price</th>
              <th className="p-3 text-center">GST %</th>
              <th className="p-3 text-right">Final Price</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const finalPrice = p.basePrice * (1 + p.gstPercentage / 100);
              const isOutOfStock = p.stockQuantity === 0;
              const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;

              return (
                <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-amber-50' : ''}`}>
                  <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                    {p.name}
                    {isOutOfStock && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">OOS</span>}
                    {isLowStock && <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">LOW</span>}
                  </td>
                  <td className="p-3 text-gray-600">{p.categoryName}</td>
                  <td className="p-3 text-gray-600">{p.unitName}</td>
                  <td className="p-3 text-right font-semibold text-gray-900">{p.stockQuantity}</td>
                  <td className="p-3 text-right text-gray-600">₹{p.basePrice.toFixed(2)}</td>
                  <td className="p-3 text-center text-gray-600">{p.gstPercentage}%</td>
                  <td className="p-3 text-right font-medium text-indigo-700">₹{finalPrice.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onAddStock(p)} className="text-green-600 hover:text-green-800 p-1" title="Add Stock">
                        <PlusCircle size={18} />
                      </button>
                      <button onClick={() => onEdit(p)} className="text-blue-600 hover:text-blue-800 p-1" title="Edit">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => onDelete(p.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
