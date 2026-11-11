"use client";

import { useMemo, useState } from "react";
import { Product, Category } from "../../types";
import { SearchInput, inr2 } from "../ui/Common";
import { Check, PackageSearch } from "lucide-react";

interface ProductPickerProps {
  products: Product[];
  categories: Category[];
  onPick: (product: Product) => void;
  inCart: Record<string, number>;
  respectStock?: boolean;  // disable out-of-stock items (billing)
  accent?: "brand" | "emerald";
  autoFocus?: boolean;
}

export function ProductPicker({ products, categories, onPick, inCart, respectStock = true, accent = "brand", autoFocus }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("ALL");

  const filtered = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return products
      .filter(p => {
        const hay = `${p.name} ${p.categoryName} ${p.hsnCode || ""} ${p.itemCode || ""}`.toLowerCase();
        return terms.every(t => hay.includes(t)) && (cat === "ALL" || p.categoryId === cat);
      })
      .sort((a, b) => {
        // in-stock first, then name
        const sa = a.stockQuantity > 0 || a.isService ? 0 : 1;
        const sb = b.stockQuantity > 0 || b.isService ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [products, search, cat]);

  const pickFirst = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      const first = filtered.find(p => !respectStock || p.isService || p.stockQuantity > 0);
      if (first) onPick(first);
    }
  };

  const accentText = accent === "emerald" ? "text-emerald-700" : "text-brand-700";
  const accentPill = accent === "emerald" ? "bg-emerald-600" : "bg-brand-600";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="space-y-2.5 pb-3">
        <div onKeyDown={pickFirst}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search item, code, category or HSN" autoFocus={autoFocus} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <button type="button" onClick={() => setCat("ALL")} className={cat === "ALL" ? "chip-active" : "chip"}>All</button>
          {categories.map(c => (
            <button type="button" key={c.id} onClick={() => setCat(c.id)} className={cat === c.id ? "chip-active" : "chip"}>{c.name}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-3 text-sm">
            <PackageSearch className="mx-auto mb-2" size={28} />
            {products.length === 0 ? "No products yet — add them in Inventory" : search ? `No items match “${search}”` : "No items in this category"}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(p => {
              const price = p.basePrice * (1 + p.gstPercentage / 100);
              const out = !p.isService && p.stockQuantity <= 0;
              const low = !p.isService && !out && p.stockQuantity <= p.lowStockThreshold;
              const disabled = respectStock && out;
              const qty = inCart[p.id];
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(p)}
                    className="w-full flex items-center gap-3 py-3 px-1 text-left active:bg-surface disabled:opacity-45 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink text-[15px] leading-snug">{p.name}</p>
                      <p className="text-[13px] text-ink-3 mt-0.5 truncate">
                        {p.categoryName}
                        <span className={`ml-2 ${out ? "text-red-600 font-medium" : low ? "text-amber-700 font-medium" : ""}`}>
                          {p.isService ? `Service · per ${p.unitName}` : out ? "Out of stock" : `${p.stockQuantity} ${p.unitName} in stock`}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`num font-semibold ${accentText}`}>{inr2(price)}</p>
                      <p className="text-xs text-ink-3">incl. {p.gstPercentage}% GST</p>
                    </div>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${qty ? `${accentPill} text-white` : "border border-line text-ink-3"}`}>
                      {qty ? (qty > 99 ? <Check size={16} /> : qty) : "+"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
