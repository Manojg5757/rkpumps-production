"use client";

import { CartItem } from "../../types";
import { Trash2, Plus, Minus } from "lucide-react";

interface CartPanelProps {
  cart: CartItem[];
  onSetQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

export function CartPanel({ cart, onSetQuantity, onRemove }: CartPanelProps) {
  if (cart.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl my-4">Cart is empty</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-3">
      {cart.map(item => (
        <div key={item.productId} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{item.name}</p>
            <div className="text-sm text-gray-500 flex gap-4 mt-1">
              <span>₹{item.basePrice.toFixed(2)} + {item.gstPercentage}% GST</span>
              <span>Total: ₹{item.lineTotal.toFixed(2)}</span>
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
                value={item.quantity === 0 ? '' : item.quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  onSetQuantity(item.productId, val === '' ? 0 : Number(val));
                }}
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
