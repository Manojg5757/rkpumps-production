"use client";

import { useState, useEffect } from "react";
import { getProducts, getCategories, saveQuotation } from "../../lib/db";
import { generateQuotationPDF } from "../../lib/quotationPdf";
import { Product, Category, QuotationItem, Quotation } from "../../types";
import { QuotationProductSearch } from "../../components/quotation/QuotationProductSearch";
import { QuotationCartPanel } from "../../components/quotation/QuotationCartPanel";
import { Download, Share2, FileText, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function QuotationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<QuotationItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [validDays, setValidDays] = useState(7);

  const [loading, setLoading] = useState(false);
  const [generatedQuotation, setGeneratedQuotation] = useState<Quotation | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
    } catch {
      toast.error("Failed to load products");
    }
  };

  const handleAddProduct = (product: Product) => {
    setItems(prev => {
      if (prev.find(i => i.productId === product.id)) {
        toast.error("Already added");
        return prev;
      }
      const unitPrice = product.basePrice * (1 + product.gstPercentage / 100);
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitName: product.unitName,
        quantity: 1,
        unitPrice,
        lineTotal: unitPrice,
      }];
    });
  };

  const handleSetQuantity = (productId: string, qty: number) => {
    if (isNaN(qty) || qty < 1) qty = 1;
    setItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity: qty, lineTotal: item.unitPrice * qty }
        : item
    ));
    // Clear generated quotation if items change after generation
    setGeneratedQuotation(null);
    setPdfBlob(null);
  };

  const handleRemove = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
    setGeneratedQuotation(null);
    setPdfBlob(null);
  };

  const handleClear = () => {
    if (!confirm("Clear all items and customer details?")) return;
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setValidDays(7);
    setGeneratedQuotation(null);
    setPdfBlob(null);
  };

  const grandTotal = Math.floor(items.reduce((sum, i) => sum + i.lineTotal, 0));

  const canGenerate = customerName.trim().length > 0 && items.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (!customerName.trim()) toast.error("Customer name is required");
      else toast.error("Add at least one product");
      return;
    }

    // Validate phone if provided
    if (customerPhone.trim() && customerPhone.trim().length !== 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const customer = {
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        address: customerAddress.trim() || undefined,
      };

      const quotation = await saveQuotation(items, customer, validDays);
      const blob = await generateQuotationPDF(quotation);

      setGeneratedQuotation(quotation);
      setPdfBlob(blob);
      toast.success(`Quotation ${quotation.quotationNumber} generated`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate quotation");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob || !generatedQuotation) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = generatedQuotation.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Quotation_${safeName}_${generatedQuotation.quotationNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleWhatsAppShare = async () => {
    if (!pdfBlob || !generatedQuotation) return;

    const phone = generatedQuotation.customer.phone?.replace(/\D/g, '') || '';
    const message = buildWhatsAppMessage(generatedQuotation);

    // Try Web Share API first (works on mobile)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], `Quotation_${generatedQuotation.quotationNumber}.pdf`, { type: 'application/pdf' });
      const shareData = { files: [file], title: `Quotation ${generatedQuotation.quotationNumber}`, text: message };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            // Fall through to WhatsApp URL fallback
          } else {
            return; // User cancelled
          }
        }
      }
    }

    // Desktop / unsupported browser fallback: open WhatsApp Web with text summary
    const waUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    toast('PDF downloaded separately. Attach it in WhatsApp.', { icon: 'ℹ️' });
    handleDownload();
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      {/* Left: Product Search */}
      <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col h-[calc(100vh-8rem)] min-h-[600px]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Products</h2>
        <QuotationProductSearch
          products={products}
          categories={categories}
          onAdd={handleAddProduct}
        />
      </div>

      {/* Right: Quotation Builder */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col h-[calc(100vh-8rem)] min-h-[600px] overflow-y-auto pr-2">

        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            Quote To
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Customer / Company Name *"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="Phone Number (Optional)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 tracking-wide"
            />
            <input
              type="text"
              placeholder="Address (Optional)"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Validity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Quotation Validity</label>
          <div className="flex gap-2">
            {[7, 15, 30].map(days => (
              <button
                key={days}
                onClick={() => setValidDays(days)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                  validDays === days
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-gray-300 text-gray-600 hover:border-emerald-400'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">Items</h2>
        <QuotationCartPanel
          items={items}
          onSetQuantity={handleSetQuantity}
          onRemove={handleRemove}
        />

        {/* Summary & Actions */}
        {items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-2">
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-semibold text-gray-700">Grand Total</span>
              <span className="text-xl font-bold text-emerald-700">₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* If quotation already generated, show quotation number */}
            {generatedQuotation && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 text-center font-medium">
                {generatedQuotation.quotationNumber} — Generated
              </div>
            )}

            <div className="space-y-2">
              {!generatedQuotation ? (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <FileText size={18} />
                  )}
                  {loading ? "Generating..." : "Generate Quotation"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 size={16} />
                    WhatsApp
                  </button>
                </div>
              )}

              <button
                onClick={handleClear}
                className="w-full border border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 text-center">
            Add products from the left panel to build a quotation
          </div>
        )}
      </div>
    </div>
  );
}

function buildWhatsAppMessage(q: Quotation): string {
  const lines = [
    `*Price Quotation — ${q.quotationNumber}*`,
    `Date: ${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(q.date))}`,
    `Customer: ${q.customer.name}`,
    '',
    '*Items:*',
    ...q.items.map(i => `• ${i.name} × ${i.quantity} — ₹${i.lineTotal.toFixed(2)}`),
    '',
    `*Total: ₹${q.grandTotal.toFixed(2)}*`,
    `_Valid for ${q.validDays} days_`,
    '',
    '— R.K Pumps & Motors',
  ];
  return lines.join('\n');
}
