"use client";

import { useState, useEffect } from "react";
import { getUnits, addUnit, deleteUnit } from "../../lib/db";
import { Unit } from "../../types";
import { Trash2, Plus } from "lucide-react";
import { ConfirmModal } from "../ui/ConfirmModal";
import toast from "react-hot-toast";

export function UnitManager() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [newUnit, setNewUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (error) {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.trim()) return;
    try {
      const unit = await addUnit(newUnit.trim());
      setUnits([...units, unit]);
      setNewUnit("");
      toast.success("Unit added");
    } catch (error) {
      toast.error("Failed to add unit");
    }
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      await deleteUnit(unitToDelete);
      setUnits(units.filter(u => u.id !== unitToDelete));
      toast.success("Unit deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete unit");
    } finally {
      setUnitToDelete(null);
    }
  };

  if (loading) return <div className="p-4">Loading units...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4">Manage Units</h2>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          placeholder="New Unit Name (e.g. Box)"
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
        {units.map((unit) => (
          <li key={unit.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
            <span>{unit.name}</span>
            <button
              onClick={() => setUnitToDelete(unit.id)}
              className="text-red-500 hover:text-red-700 p-1"
              title="Delete Unit"
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>

      {unitToDelete && (
        <ConfirmModal
          title="Delete Unit"
          message="Are you sure you want to delete this unit? It must not have any assigned products."
          onConfirm={confirmDelete}
          onCancel={() => setUnitToDelete(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
