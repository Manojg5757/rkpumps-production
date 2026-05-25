"use client";

import { useState, useEffect } from "react";
import { QuotationItem } from "../../types";
import { Trash2, Plus, Minus } from "lucide-react";

interface QuotationCartPanelProps {
  items: QuotationItem[];
  onSetQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

export function QuotationCartPanel({ items, onSetQuantity, onRemove }: QuotationCartPanelProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setInputValues(prev => {
      const next: Record<string, string> = {};
      items.forEach(item => {
        const current = prev[item.productId];
        const currentNum = Number(current);
        if (current === undefined || (!isNaN(currentNum) && currentNum !== item.quantity)) {
          next[item.productId] = String(item.quantity);
        } else {
          next[item.productId] = current;
        }
      });
      return next;
    });
  }, [items]);

  const handleChange = (productId: string, raw: string) => {
    setInputValues(prev => ({ ...prev, [productId]: raw }));
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1) {
      onSetQuantity(productId, num);
    }
  };

  const handleBlur = (productId: string, currentQty: number) => {
    const raw = inputValues[productId];
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 1) {
      setInputValues(prev => ({ ...prev, [productId]: String(currentQty) }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl my-4">
        No items added
      </div>
    );
  }

  return (
    <div className="my-4 space-y-3">
      {items.map(item => (
        <div
          key={item.productId}
          className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex-1">
            <p className="font-medium text-gray-900">{item.name}</p>
            <div className="text-sm text-gray-500 flex gap-4 mt-1">
              <span>₹{item.unitPrice.toFixed(2)} / {item.unitName}</span>
              <span className="text-emerald-700 font-semibold">Total: ₹{item.lineTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden h-9">
              <button
                onClick={() => onSetQuantity(item.productId, item.quantity - 1)}
                className="px-2 h-full hover:bg-gray-100 text-gray-600 flex items-center justify-center border-r border-gray-200"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                value={inputValues[item.productId] ?? item.quantity}
                onChange={e => handleChange(item.productId, e.target.value)}
                onBlur={() => handleBlur(item.productId, item.quantity)}
                className="w-12 h-full text-center text-sm font-medium outline-none hide-spin-button"
              />
              <button
                onClick={() => onSetQuantity(item.productId, item.quantity + 1)}
                className="px-2 h-full hover:bg-gray-100 text-gray-600 flex items-center justify-center border-l border-gray-200"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={() => onRemove(item.productId)}
              className="text-red-400 hover:text-red-600 p-1"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
