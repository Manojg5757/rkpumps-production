"use client";

import { Product } from "../../types";

interface StockReportProps {
  products: Product[];
}

export function StockReport({ products }: StockReportProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4 print:hidden">
        <button 
          onClick={handlePrint}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Print Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4">Product Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Unit</th>
                <th className="p-4 text-right">Current Stock</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const isOutOfStock = p.stockQuantity === 0;
                const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;
                
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{p.name}</td>
                    <td className="p-4 text-gray-600">{p.categoryName}</td>
                    <td className="p-4 text-center text-gray-600">{p.unitName}</td>
                    <td className="p-4 text-right font-bold text-gray-900">{p.stockQuantity}</td>
                    <td className="p-4 text-center">
                      {isOutOfStock ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">OUT OF STOCK</span>
                      ) : isLowStock ? (
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold">LOW STOCK</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
