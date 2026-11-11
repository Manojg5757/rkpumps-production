"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileUp, Package, PackageMinus, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { CategoryManager } from "../../components/inventory/CategoryManager";
import { UnitManager } from "../../components/inventory/UnitManager";
import { ProductFormModal } from "../../components/inventory/ProductFormModal";
import { StockMoveModal } from "../../components/inventory/StockMoveModal";
import { ImportProductsModal } from "../../components/inventory/ImportProductsModal";
import { tracksStock } from "../../lib/gst";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Modal } from "../../components/ui/Modal";
import { EmptyState, Loading, PageHeader, SearchInput, Segmented, Stat, inr, inr2 } from "../../components/ui/Common";
import { getProducts, getCategories, getUnits, deleteProduct } from "../../lib/db";
import { Product, Category, Unit } from "../../types";

type Tab = "products" | "categories" | "units";
type StockFilter = "all" | "low" | "out";

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const [form, setForm] = useState<Product | "new" | null>(null);
  const [move, setMove] = useState<{ product: Product | null; type: "IN" | "OUT" } | null>(null);
  const [actions, setActions] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadData = async () => {
    try {
      const [p, c, u] = await Promise.all([getProducts(), getCategories(), getUnits()]);
      setProducts(p.sort((a, b) => a.name.localeCompare(b.name)));
      setCategories(c);
      setUnits(u);
    } catch {
      toast.error("Could not load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("action") === "stock-in") setMove({ product: null, type: "IN" });
    if (p.get("filter") === "low") setStockFilter("low");
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter(p => {
      if (cat !== "ALL" && p.categoryId !== cat) return false;
      if (stockFilter === "out" && (p.isService || p.stockQuantity > 0)) return false;
      if (stockFilter === "low" && (p.isService || p.stockQuantity > p.lowStockThreshold)) return false;
      return !q || p.name.toLowerCase().includes(q) || (p.hsnCode || "").includes(q) || (p.itemCode || "").toLowerCase().includes(q) || (p.supplierName || "").toLowerCase().includes(q);
    });
  }, [products, search, cat, stockFilter]);

  const stocked = products.filter(tracksStock);
  const stockValue = stocked.reduce((s, p) => s + Math.max(0, p.stockQuantity) * (p.purchasePrice || 0), 0);
  const saleValue = stocked.reduce((s, p) => s + Math.max(0, p.stockQuantity) * p.basePrice * (1 + p.gstPercentage / 100), 0);
  const lowCount = stocked.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;
  const outCount = stocked.filter(p => p.stockQuantity <= 0).length;

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id);
      setProducts(prev => prev.filter(p => p.id !== toDelete.id));
      toast.success("Product deleted");
    } catch {
      toast.error("Could not delete the product");
    } finally {
      setToDelete(null);
    }
  };

  const stockPill = (p: Product) => {
    if (p.isService) return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 bg-brand-50 text-brand-700 ring-brand-100">Service</span>;
    const out = p.stockQuantity <= 0;
    const low = !out && p.stockQuantity <= p.lowStockThreshold;
    return (
      <span className={`num inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${
        out ? "bg-red-50 text-red-700 ring-red-200" : low ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-surface text-ink-2 ring-line"
      }`}>
        {out ? "Out" : `${p.stockQuantity} ${p.unitName}`}
      </span>
    );
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products`}
        actions={tab === "products" && (
          <>
            <button className="btn-secondary px-3" onClick={() => setImportOpen(true)} title="Import from Excel"><FileUp size={18} /><span className="hidden lg:inline">Import</span></button>
            <button className="btn-secondary px-3" onClick={() => setMove({ product: null, type: "IN" })}><PackagePlus size={18} /><span className="hidden sm:inline">Stock in</span></button>
            <button className="btn-primary px-3" onClick={() => setForm("new")}><Plus size={18} /><span className="hidden sm:inline">Add product</span></button>
          </>
        )}
      />

      <div className="mb-4 overflow-x-auto no-scrollbar">
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: "products", label: "Products" }, { value: "categories", label: "Categories" }, { value: "units", label: "Units" }]} />
      </div>

      {tab === "categories" && <CategoryManager />}
      {tab === "units" && <UnitManager />}

      {tab === "products" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Stat label="Stock value (cost)" value={inr(stockValue)} sub="money in inventory" />
            <Stat label="Stock value (selling)" value={inr(saleValue)} sub="incl. GST" tone="brand" />
            <button className="text-left" onClick={() => setStockFilter("low")}><Stat label="Low stock" value={String(lowCount)} sub="reorder soon" tone={lowCount ? "warn" : "default"} /></button>
            <button className="text-left" onClick={() => setStockFilter("out")}><Stat label="Out of stock" value={String(outCount)} sub="can't be billed" tone={outCount ? "bad" : "default"} /></button>
          </div>

          <div className="space-y-2.5 mb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search product, HSN or supplier" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
              {(["all", "low", "out"] as StockFilter[]).map(f => (
                <button key={f} onClick={() => setStockFilter(f)} className={stockFilter === f ? "chip-active" : "chip"}>
                  {f === "all" ? "All stock" : f === "low" ? "Low stock" : "Out of stock"}
                </button>
              ))}
              <span className="w-px h-6 bg-line mx-1 shrink-0" />
              <select value={cat} onChange={e => setCat(e.target.value)} className="h-9 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink-2">
                <option value="ALL">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {loading ? <Loading text="Loading products…" /> : filtered.length === 0 ? (
            <div className="card">
              <EmptyState icon={Package} title={products.length ? "No products match" : "No products yet"} text={products.length ? "Try a different search or filter." : "Add your pumps, motors, pipes and fittings to start billing."}
                action={!products.length ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button className="btn-primary" onClick={() => setImportOpen(true)}><FileUp size={18} /> Import from Excel</button>
                    <button className="btn-secondary" onClick={() => setForm("new")}><Plus size={18} /> Add one product</button>
                  </div>
                ) : undefined} />
            </div>
          ) : (
            <>
              {/* Phone */}
              <ul className="md:hidden card divide-y divide-line">
                {filtered.map(p => (
                  <li key={p.id}>
                    <button onClick={() => setActions(p)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-surface">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-snug">{p.name}</p>
                        <p className="text-[13px] text-ink-3 num mt-0.5">{p.itemCode ? `${p.itemCode} · ` : ""}{p.categoryName} · {inr2(p.basePrice * (1 + p.gstPercentage / 100))}</p>
                      </div>
                      {stockPill(p)}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop */}
              <div className="hidden md:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">Product</th>
                        <th className="th">Category</th>
                        <th className="th">HSN</th>
                        <th className="th text-right">Stock</th>
                        <th className="th text-right">Cost</th>
                        <th className="th text-right">Rate</th>
                        <th className="th text-center">GST</th>
                        <th className="th text-right">Price incl. GST</th>
                        <th className="th">Supplier</th>
                        <th className="th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id} className="hover:bg-surface/60">
                          <td className="td font-medium">{p.name}{p.itemCode && <span className="block text-xs text-ink-3 font-normal num">{p.itemCode}</span>}</td>
                          <td className="td text-ink-2">{p.categoryName}</td>
                          <td className="td text-ink-3 num">{p.hsnCode || "—"}</td>
                          <td className="td text-right">{stockPill(p)}</td>
                          <td className="td text-right num text-ink-2">{inr2(p.purchasePrice || 0)}</td>
                          <td className="td text-right num text-ink-2">{inr2(p.basePrice)}</td>
                          <td className="td text-center num text-ink-2">{p.gstPercentage}%</td>
                          <td className="td text-right num font-semibold text-brand-700">{inr2(p.basePrice * (1 + p.gstPercentage / 100))}</td>
                          <td className="td text-ink-3">{p.supplierName || "—"}</td>
                          <td className="td">
                            <div className="flex justify-end gap-0.5">
                              {!p.isService && <>
                                <button className="icon-btn text-emerald-700" title="Stock in" onClick={() => setMove({ product: p, type: "IN" })}><PackagePlus size={17} /></button>
                                <button className="icon-btn" title="Stock out" onClick={() => setMove({ product: p, type: "OUT" })}><PackageMinus size={17} /></button>
                              </>}
                              <button className="icon-btn" title="Edit" onClick={() => setForm(p)}><Pencil size={17} /></button>
                              <button className="icon-btn text-red-600" title="Delete" onClick={() => setToDelete(p)}><Trash2 size={17} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {actions && (
        <Modal title={actions.name} subtitle={`${actions.categoryName}${actions.hsnCode ? ` · HSN ${actions.hsnCode}` : ""}`} onClose={() => setActions(null)}>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <div className="rounded-lg bg-surface p-2"><p className="text-xs text-ink-3">{actions.isService ? "Type" : "In stock"}</p><p className="num font-semibold">{actions.isService ? "Service" : `${actions.stockQuantity} ${actions.unitName}`}</p></div>
            <div className="rounded-lg bg-surface p-2"><p className="text-xs text-ink-3">Cost</p><p className="num font-semibold">{inr2(actions.purchasePrice || 0)}</p></div>
            <div className="rounded-lg bg-surface p-2"><p className="text-xs text-ink-3">Sells at</p><p className="num font-semibold">{inr2(actions.basePrice * (1 + actions.gstPercentage / 100))}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {!actions.isService && <>
              <button className="btn-success" onClick={() => { setMove({ product: actions, type: "IN" }); setActions(null); }}><PackagePlus size={18} /> Stock in</button>
              <button className="btn-secondary" onClick={() => { setMove({ product: actions, type: "OUT" }); setActions(null); }}><PackageMinus size={18} /> Stock out</button>
            </>}
            <button className="btn-secondary" onClick={() => { setForm(actions); setActions(null); }}><Pencil size={18} /> Edit</button>
            <button className="btn-secondary text-red-600" onClick={() => { setToDelete(actions); setActions(null); }}><Trash2 size={18} /> Delete</button>
          </div>
          {actions.supplierName && <p className="text-sm text-ink-3 mt-3">Supplier: {actions.supplierName}</p>}
        </Modal>
      )}

      {form && (
        <ProductFormModal
          product={form === "new" ? null : form}
          categories={categories}
          units={units}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); loadData(); }}
        />
      )}

      {move && (
        <StockMoveModal
          products={stocked}
          product={move.product}
          initialType={move.type}
          onClose={() => setMove(null)}
          onSaved={() => { setMove(null); loadData(); }}
        />
      )}

      {importOpen && (
        <ImportProductsModal
          products={products}
          categories={categories}
          units={units}
          onClose={() => setImportOpen(false)}
          onImported={() => loadData()}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete product?"
          message={`${toDelete.name} will be removed from inventory. Past invoices are not affected.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
