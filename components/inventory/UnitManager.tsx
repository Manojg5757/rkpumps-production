"use client";

import { useState, useEffect, useRef } from "react";
import { getUnits, addUnit, deleteUnit } from "../../lib/db";
import { Unit } from "../../types";
import { Trash2, Plus, X } from "lucide-react";
import { ConfirmModal } from "../ui/ConfirmModal";
import toast from "react-hot-toast";

export function UnitManager() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showModal]);

  const loadUnits = async () => {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (error) {
      console.error("Load units error:", error);
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newUnit.trim()) {
      toast.error("Please enter a unit name");
      return;
    }
    setAdding(true);
    try {
      const unit = await addUnit(newUnit.trim());
      setUnits(prev => [...prev, unit]);
      setNewUnit("");
      setShowModal(false);
      toast.success("Unit added");
    } catch (error) {
      console.error("Add unit error:", error);
      toast.error((error as Error).message || "Failed to add unit");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { setShowModal(false); setNewUnit(""); }
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      await deleteUnit(unitToDelete);
      setUnits(prev => prev.filter(u => u.id !== unitToDelete));
      toast.success("Unit deleted");
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete unit");
    } finally {
      setUnitToDelete(null);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading units...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold">Manage Units</h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
        >
          <Plus size={18} /> Add Unit
        </button>
      </div>

      {units.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No units yet. Click "Add Unit" to create one.</p>
      ) : (
        <ul className="space-y-2">
          {units.map((unit) => (
            <li key={unit.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <span className="font-medium text-gray-800">{unit.name}</span>
              <button
                type="button"
                onClick={() => setUnitToDelete(unit.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete Unit"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add New Unit</h3>
              <button type="button" onClick={() => { setShowModal(false); setNewUnit(""); }} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Piece, Box, Kg, Meter"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setNewUnit(""); }}
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
                  {adding ? "Adding..." : "Add Unit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
