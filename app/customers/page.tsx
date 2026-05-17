"use client";

import { useState, useEffect, useMemo } from "react";
import { getCustomers, getSales, getSalesByCustomer, getPayments } from "../../lib/db";
import { Customer, Sale, Payment } from "../../types";
import { generateBillPDF } from "../../lib/pdf";
import { Users, X, Phone, MapPin, FileText, Download, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { AddPaymentModal } from "../../components/sales/AddPaymentModal";

type SortKey = 'totalPurchase' | 'totalPending' | 'invoiceCount' | 'name';
type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'pending' | 'paid';

interface CustomerStats {
  totalPurchase: number;
  totalPaid: number;
  totalPending: number;
  invoiceCount: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, CustomerStats>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('totalPurchase');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custs, allSales] = await Promise.all([getCustomers(), getSales()]);
      setCustomers(custs);

      // Aggregate sales per customer
      const map: Record<string, CustomerStats> = {};
      allSales.forEach(sale => {
        if (!map[sale.customerId]) {
          map[sale.customerId] = { totalPurchase: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0 };
        }
        map[sale.customerId].totalPurchase += sale.grandTotal;
        map[sale.customerId].totalPaid += sale.paidAmount || 0;
        map[sale.customerId].totalPending += sale.pendingAmount || 0;
        map[sale.customerId].invoiceCount += 1;
      });
      setStatsMap(map);
    } catch (error) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const openLedger = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLedgerLoading(true);
    try {
      const [sales, payments] = await Promise.all([
        getSalesByCustomer(customer.id),
        getPayments(customer.id)
      ]);
      setCustomerSales(sales);
      setCustomerPayments(payments);
    } catch (error) {
      toast.error("Failed to load customer ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleDownloadInvoice = async (sale: Sale) => {
    const pdfBlob = await generateBillPDF(sale);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sale.billNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown size={13} className="text-gray-400 inline ml-1" />;
    return sortDir === 'desc'
      ? <ChevronDown size={13} className="text-indigo-500 inline ml-1" />
      : <ChevronUp size={13} className="text-indigo-500 inline ml-1" />;
  };

  const displayed = useMemo(() => {
    let list = customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      const stats = statsMap[c.id] || { totalPurchase: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0 };
      const matchFilter =
        filterMode === 'all' ||
        (filterMode === 'pending' && stats.totalPending > 0) ||
        (filterMode === 'paid' && stats.totalPending === 0 && stats.invoiceCount > 0);
      return matchSearch && matchFilter;
    });

    list = [...list].sort((a, b) => {
      const sa = statsMap[a.id] || { totalPurchase: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0 };
      const sb = statsMap[b.id] || { totalPurchase: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0 };
      let diff = 0;
      if (sortKey === 'name') diff = a.name.localeCompare(b.name);
      else if (sortKey === 'totalPurchase') diff = sa.totalPurchase - sb.totalPurchase;
      else if (sortKey === 'totalPending') diff = sa.totalPending - sb.totalPending;
      else if (sortKey === 'invoiceCount') diff = sa.invoiceCount - sb.invoiceCount;
      return sortDir === 'desc' ? -diff : diff;
    });

    return list;
  }, [customers, statsMap, search, sortKey, sortDir, filterMode]);

  const overallTotal = Object.values(statsMap).reduce((s, v) => s + v.totalPurchase, 0);
  const overallPending = Object.values(statsMap).reduce((s, v) => s + v.totalPending, 0);
  const pendingCount = Object.values(statsMap).filter(v => v.totalPending > 0).length;

  const ledgerTotalInvoiced = customerSales.reduce((s, sale) => s + sale.grandTotal, 0);
  const ledgerTotalPaid = customerSales.reduce((s, sale) => s + (sale.paidAmount || 0), 0);
  const ledgerPending = customerSales.reduce((s, sale) => s + (sale.pendingAmount || 0), 0);

  type LedgerEntry = { date: Date; type: 'invoice' | 'payment'; amount: number; label: string; sale?: Sale };
  const ledgerEntries: LedgerEntry[] = [
    ...customerSales.map(s => ({ date: new Date(s.date), type: 'invoice' as const, amount: s.grandTotal, label: s.billNumber, sale: s })),
    ...customerPayments.map(p => ({ date: new Date(p.createdAt), type: 'payment' as const, amount: p.amount, label: p.method })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={24} className="text-indigo-600" />
          Customers
        </h1>
        <div className="text-sm text-gray-500">{customers.length} total customers</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
          <p className="text-xs text-indigo-700 font-medium">Total Business</p>
          <p className="text-2xl font-bold text-indigo-900">₹{overallTotal.toLocaleString('en-IN')}</p>
          <p className="text-xs text-indigo-600 mt-1">{customers.length} customers</p>
        </div>
        <div className={`border p-4 rounded-xl ${overallPending > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-medium ${overallPending > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Total Pending</p>
          <p className={`text-2xl font-bold ${overallPending > 0 ? 'text-amber-900' : 'text-gray-700'}`}>₹{overallPending.toLocaleString('en-IN')}</p>
          <p className={`text-xs mt-1 ${overallPending > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{pendingCount} customers with dues</p>
        </div>
        <div className="bg-green-50 border border-green-100 p-4 rounded-xl col-span-2 md:col-span-1">
          <p className="text-xs text-green-700 font-medium">Total Collected</p>
          <p className="text-2xl font-bold text-green-900">₹{(overallTotal - overallPending).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Search + Filter + Sort */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-start md:items-center">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'paid'] as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterMode === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {f === 'all' ? 'All Customers' : f === 'pending' ? 'With Dues' : 'Fully Paid'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading customers...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                  <th className="p-4">
                    <button onClick={() => handleSort('name')} className="flex items-center font-medium hover:text-indigo-600">
                      Customer <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4">
                    <button onClick={() => handleSort('invoiceCount')} className="flex items-center font-medium hover:text-indigo-600">
                      Invoices <SortIcon col="invoiceCount" />
                    </button>
                  </th>
                  <th className="p-4">
                    <button onClick={() => handleSort('totalPurchase')} className="flex items-center font-medium hover:text-indigo-600">
                      Total Purchase <SortIcon col="totalPurchase" />
                    </button>
                  </th>
                  <th className="p-4 font-medium text-right">Paid</th>
                  <th className="p-4">
                    <button onClick={() => handleSort('totalPending')} className="flex items-center font-medium hover:text-indigo-600 ml-auto">
                      Pending <SortIcon col="totalPending" />
                    </button>
                  </th>
                  <th className="p-4 text-center font-medium">Ledger</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((c, idx) => {
                  const stats = statsMap[c.id] || { totalPurchase: 0, totalPaid: 0, totalPending: 0, invoiceCount: 0 };
                  const isTop3 = sortKey === 'totalPurchase' && sortDir === 'desc' && idx < 3;
                  return (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isTop3 ? 'bg-indigo-50/30' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isTop3 && (
                            <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                              idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                              idx === 1 ? 'bg-gray-300 text-gray-700' :
                              'bg-amber-600/70 text-white'
                            }`}>{idx + 1}</span>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            {c.address && <p className="text-xs text-gray-400">{c.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600 text-sm">
                        <span className="flex items-center gap-1"><Phone size={13} className="text-gray-400" />{c.phone}</span>
                      </td>
                      <td className="p-4 text-gray-700 text-sm">{stats.invoiceCount || '-'}</td>
                      <td className="p-4 font-semibold text-indigo-700">
                        {stats.totalPurchase > 0 ? `₹${stats.totalPurchase.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-4 text-right text-green-700 font-medium text-sm">
                        {stats.totalPaid > 0 ? `₹${stats.totalPaid.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-4 text-right">
                        {stats.totalPending > 0 ? (
                          <span className="font-bold text-amber-700">₹{stats.totalPending.toLocaleString('en-IN')}</span>
                        ) : stats.invoiceCount > 0 ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Cleared</span>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => openLedger(c)}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 mx-auto"
                        >
                          <FileText size={15} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {displayed.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp size={12} /> Showing {displayed.length} of {customers.length} customers
            </div>
          )}
        </div>
      )}

      {/* Customer Ledger Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-4">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={13} /> {selectedCustomer.phone}
                  {selectedCustomer.address && <><MapPin size={13} className="ml-2" /> {selectedCustomer.address}</>}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={22} />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="p-8 text-center text-gray-500">Loading ledger...</div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-medium">Total Invoiced</p>
                    <p className="text-lg font-bold text-indigo-900">₹{ledgerTotalInvoiced.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-green-700 font-medium">Total Paid</p>
                    <p className="text-lg font-bold text-green-900">₹{ledgerTotalPaid.toLocaleString('en-IN')}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${ledgerPending > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    <p className={`text-xs font-medium ${ledgerPending > 0 ? 'text-amber-700' : 'text-gray-600'}`}>Pending Balance</p>
                    <p className={`text-lg font-bold ${ledgerPending > 0 ? 'text-amber-900' : 'text-gray-700'}`}>₹{ledgerPending.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Details</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-center">Status / Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="p-3 text-sm text-gray-600">{entry.date.toLocaleDateString('en-IN')}</td>
                          <td className="p-3">
                            {entry.type === 'invoice' ? (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">Invoice</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Payment</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-800 text-sm font-medium">{entry.label}</td>
                          <td className="p-3 text-right font-semibold text-gray-900">
                            {entry.type === 'invoice' ? (
                              <span className="text-indigo-700">₹{entry.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-green-700">₹{entry.amount.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {entry.type === 'invoice' && entry.sale && (
                              <div className="flex items-center justify-center gap-2">
                                {(entry.sale.paymentStatus === 'partial' || entry.sale.paymentStatus === 'unpaid') && (
                                  <button
                                    onClick={() => setPaymentSale(entry.sale!)}
                                    className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 rounded font-medium"
                                  >
                                    Add Payment
                                  </button>
                                )}
                                {entry.sale.paymentStatus === 'paid' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Paid</span>
                                )}
                                <button
                                  onClick={() => handleDownloadInvoice(entry.sale!)}
                                  className="text-indigo-600 hover:text-indigo-800 p-1 bg-indigo-50 rounded"
                                  title="Download Invoice"
                                >
                                  <Download size={15} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {ledgerEntries.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500">No transactions found for this customer.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {paymentSale && (
        <AddPaymentModal
          sale={paymentSale}
          onClose={() => setPaymentSale(null)}
          onPaymentAdded={() => {
            setPaymentSale(null);
            if (selectedCustomer) openLedger(selectedCustomer);
            loadData();
          }}
        />
      )}
    </div>
  );
}
