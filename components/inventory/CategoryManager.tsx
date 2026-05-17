"use client";

import { useState, useEffect, useRef } from "react";
import { getCategories, addCategory, deleteCategory } from "../../lib/db";
import { Category } from "../../types";
import { Trash2, Plus, X } from "lucide-react";
import { ConfirmModal } from "../ui/ConfirmModal";
import toast from "react-hot-toast";

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showModal]);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Load categories error:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    setAdding(true);
    try {
      const cat = await addCategory(newCategory.trim());
      setCategories(prev => [...prev, cat]);
      setNewCategory("");
      setShowModal(false);
      toast.success("Category added");
    } catch (error) {
      console.error("Add category error:", error);
      toast.error((error as Error).message || "Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { setShowModal(false); setNewCategory(""); }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete);
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete));
      toast.success("Category deleted");
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete category");
    } finally {
      setCategoryToDelete(null);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading categories...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold">Manage Categories</h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No categories yet. Click "Add Category" to create one.</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <span className="font-medium text-gray-800">{cat.name}</span>
              <button
                type="button"
                onClick={() => setCategoryToDelete(cat.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete Category"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add New Category</h3>
              <button type="button" onClick={() => { setShowModal(false); setNewCategory(""); }} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Fasteners, Motors, Cables"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setNewCategory(""); }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <ConfirmModal
          title="Delete Category"
          message="Are you sure you want to delete this category? It must not have any assigned products."
          onConfirm={confirmDelete}
          onCancel={() => setCategoryToDelete(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
