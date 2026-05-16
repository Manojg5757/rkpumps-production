"use client";

import { useState } from "react";
import { Product, Category } from "../../types";

interface ProductSearchProps {
  products: Product[];
  categories: Category[];
  onAdd: (product: Product) => void;
}

export function ProductSearch({ products, categories, onAdd }: ProductSearchProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50">
        <input 
          type="text" 
          placeholder="Search products..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select 
          value={selectedCategory} 
          onChange={e => setSelectedCategory(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.map(p => {
          const finalPrice = p.basePrice * (1 + p.gstPercentage / 100);
          const isOutOfStock = p.stockQuantity === 0;

          return (
            <button 
              key={p.id}
              disabled={isOutOfStock}
              onClick={() => onAdd(p)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isOutOfStock 
                  ? "border-red-200 bg-red-50 opacity-60 cursor-not-allowed" 
                  : "border-gray-200 hover:border-indigo-500 hover:shadow-md"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-900">{p.name}</span>
                <span className="text-indigo-700 font-bold">₹{finalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{p.categoryName} • {p.unitName}</span>
                <span className={isOutOfStock ? "text-red-600 font-medium" : "text-gray-600"}>
                  {isOutOfStock ? "Out of Stock" : `Stock: ${p.stockQuantity}`}
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 mt-4">No products found</p>
        )}
      </div>
    </div>
  );
}
