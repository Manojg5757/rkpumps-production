"use client";

import { useState, useEffect } from "react";
import { searchSales } from "../../lib/db";
import { generateBillPDF } from "../../lib/pdf";
import { Sale } from "../../types";
import { SalesTable } from "../../components/sales/SalesTable";
import { Search, Download } from "lucide-react";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await searchSales({}); // Load all (or limited by db default) initially
      setSales(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const allData = await searchSales({});
      const term = searchTerm.toLowerCase();
      
      const filtered = allData.filter(s => {
        const matchesSearch = 
          s.customer.name.toLowerCase().includes(term) ||
          s.billNumber.toLowerCase().includes(term) ||
          (s.customer.gstin && s.customer.gstin.toLowerCase().includes(term));

        let matchesDate = true;
        const saleDate = new Date(s.date);
        saleDate.setHours(0, 0, 0, 0);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (saleDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (saleDate > end) matchesDate = false;
        }

        return matchesSearch && matchesDate;
      });
      
      setSales(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBulk = () => {
    if (sales.length === 0) return;
    
    const headers = ["Date", "Bill Number", "Customer Name", "Customer Phone", "GSTIN", "Taxable Amount", "GST Amount", "Grand Total"];
    const rows = sales.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.billNumber,
      `"${s.customer.name}"`,
      s.customer.phone || "",
      s.customer.gstin || "",
      s.totalTaxableAmount.toFixed(2),
      s.totalGSTAmount.toFixed(2),
      s.grandTotal.toFixed(2)
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bulk_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = async (sale: Sale) => {
    const pdfBlob = await generateBillPDF(sale);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = sale.customer.name.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${safeName}_${sale.billNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = async (sale: Sale) => {
    const pdfBlob = await generateBillPDF(sale);
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalGST = sales.reduce((sum, s) => sum + s.totalGSTAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
          <p className="text-sm text-indigo-800 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-indigo-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
          <p className="text-sm text-gray-600 font-medium">Total GST Collected</p>
          <p className="text-2xl font-bold text-gray-900">₹{totalGST.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
          <p className="text-sm text-gray-600 font-medium">Number of Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Search by Bill No, Customer Name, or GSTIN..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            title="Start Date"
          />
          <input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            title="End Date"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 justify-center">
            <Search size={18} /> Search
          </button>
          <button 
            type="button" 
            onClick={handleExportBulk}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 justify-center"
          >
            <Download size={18} /> Export CSV
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading sales history...</div>
      ) : (
        <SalesTable sales={sales} onDownload={handleDownload} onPrint={handlePrint} />
      )}
    </div>
  );
}
