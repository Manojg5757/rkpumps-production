"use client";

import { useState, useEffect } from "react";
import { ProductTable } from "../../components/inventory/ProductTable";
import { CategoryManager } from "../../components/inventory/CategoryManager";
import { UnitManager } from "../../components/inventory/UnitManager";
import { AddProductModal } from "../../components/inventory/AddProductModal";
import { EditProductModal } from "../../components/inventory/EditProductModal";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { getProducts, getCategories, getUnits, deleteProduct, addStockEntry } from "../../lib/db";
import { Product, Category, Unit } from "../../types";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "units">("products");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, cData, uData] = await Promise.all([getProducts(), getCategories(), getUnits()]);
      setProducts(pData);
      setCategories(cData);
      setUnits(uData);
    } catch (error) {
      toast.error("Failed to load inventory data");
    }
  };

  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete);
      setProducts(products.filter(p => p.id !== productToDelete));
      toast.success("Product deleted");
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setProductToDelete(null);
    }
  };

  const handleAddStock = async (product: Product) => {
    try {
      await addStockEntry({
        productId: product.id,
        productName: product.name,
        categoryName: product.categoryName,
        unitName: product.unitName,
        type: 'IN',
        quantity: 1,
        note: "Quick Add via Inventory",
        date: new Date()
      });
      toast.success(`Added 1 unit to ${product.name}`);
      loadData(); // Reload to get updated stock
    } catch (error) {
      toast.error("Failed to add stock");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        {activeTab === "products" && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus size={20} /> Add Product
          </button>
        )}
      </div>

      <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl w-fit">
        {(["products", "categories", "units"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "products" && (
          <ProductTable 
            products={products} 
            categories={categories} 
            onEdit={setEditingProduct}
            onDelete={setProductToDelete}
            onAddStock={handleAddStock}
          />
        )}
        {activeTab === "categories" && <CategoryManager />}
        {activeTab === "units" && <UnitManager />}
      </div>

      {isAddModalOpen && (
        <AddProductModal 
          categories={categories} 
          units={units} 
          onClose={() => setIsAddModalOpen(false)} 
          onAdded={() => { setIsAddModalOpen(false); loadData(); }} 
        />
      )}
      
      {editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          categories={categories} 
          units={units} 
          onClose={() => setEditingProduct(null)} 
          onUpdated={() => { setEditingProduct(null); loadData(); }} 
        />
      )}

      {productToDelete && (
        <ConfirmModal
          title="Delete Product"
          message="Are you sure you want to delete this product? This action cannot be undone."
          onConfirm={confirmDeleteProduct}
          onCancel={() => setProductToDelete(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
