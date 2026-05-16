"use client";

import { useState, useEffect } from "react";
import { getCategories, addCategory, deleteCategory } from "../../lib/db";
import { Category } from "../../types";
import { Trash2, Plus } from "lucide-react";
import { ConfirmModal } from "../ui/ConfirmModal";
import toast from "react-hot-toast";

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      const cat = await addCategory(newCategory.trim());
      setCategories([...categories, cat]);
      setNewCategory("");
      toast.success("Category added");
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete);
      setCategories(categories.filter(c => c.id !== categoryToDelete));
      toast.success("Category deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setCategoryToDelete(null);
    }
  };

  if (loading) return <div className="p-4">Loading categories...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4">Manage Categories</h2>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New Category Name (e.g. Fasteners)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={18} /> Add
        </button>
      </form>

      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
            <span>{cat.name}</span>
            <button
              onClick={() => setCategoryToDelete(cat.id)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete Category"
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>

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
