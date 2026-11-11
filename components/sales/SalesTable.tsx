"use client";

import { Sale } from "../../types";
import { Download, IndianRupee, Printer, Share2 } from "lucide-react";
import { StatusBadge, inr, inr2 } from "../ui/Common";
import { daysSince, saleTotal } from "../../lib/gst";
import { formatDate } from "../../lib/utils";
import { invoicePdfAction } from "./InvoiceDetailModal";

interface SalesTableProps {
  sales: Sale[];
  onOpen: (sale: Sale) => void;
  onAddPayment?: (sale: Sale) => void;
}

export function SalesTable({ sales, onOpen, onAddPayment }: SalesTableProps) {
  return (
    <>
      {/* Phone: cards */}
      <ul className="md:hidden card divide-y divide-line">
        {sales.map(s => {
          const pending = s.pendingAmount || 0;
          const overdue = pending > 0 && daysSince(s.date) > 30;
          return (
            <li key={s.id}>
              <button onClick={() => onOpen(s)} className="w-full text-left px-4 py-3 active:bg-surface">
                <div className="flex justify-between gap-3">
                  <p className="font-medium text-ink truncate">{s.customer.name}</p>
                  <p className="num font-semibold shrink-0">{inr(saleTotal(s))}</p>
                </div>
                <div className="flex justify-between items-center gap-3 mt-1">
                  <p className="text-[13px] text-ink-3 num truncate">{s.billNumber} · {formatDate(new Date(s.date))}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {pending > 0 && <span className="num text-[13px] font-semibold text-amber-700">{inr(pending)} due</span>}
                    <StatusBadge status={s.paymentStatus} overdue={overdue} />
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Bill no.</th>
                <th className="th">Date</th>
                <th className="th">Customer</th>
                <th className="th text-right">Taxable</th>
                <th className="th text-right">GST</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">Balance</th>
                <th className="th text-center">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => {
                const pending = s.pendingAmount || 0;
                const overdue = pending > 0 && daysSince(s.date) > 30;
                return (
                  <tr key={s.id} className="hover:bg-surface/60 cursor-pointer" onClick={() => onOpen(s)}>
                    <td className="td font-medium num">{s.billNumber}</td>
                    <td className="td text-ink-2 num whitespace-nowrap">{formatDate(new Date(s.date))}</td>
                    <td className="td">
                      <p className="font-medium">{s.customer.name}</p>
                      <p className="text-xs text-ink-3 num">{s.customer.phone}{s.customer.gstin ? ` · ${s.customer.gstin}` : ""}</p>
                    </td>
                    <td className="td text-right num text-ink-2">{inr2(s.totalTaxableAmount)}</td>
                    <td className="td text-right num text-ink-2">{inr2(s.totalGSTAmount)}</td>
                    <td className="td text-right num font-semibold">{inr(saleTotal(s))}</td>
                    <td className="td text-right num font-medium text-amber-700">{pending > 0 ? inr2(pending) : "—"}</td>
                    <td className="td text-center"><StatusBadge status={s.paymentStatus} overdue={overdue} /></td>
                    <td className="td" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {onAddPayment && pending > 0 && (
                          <button onClick={() => onAddPayment(s)} className="icon-btn text-emerald-700" title="Receive payment"><IndianRupee size={17} /></button>
                        )}
                        <button onClick={() => invoicePdfAction(s, "share")} className="icon-btn" title="Share"><Share2 size={17} /></button>
                        <button onClick={() => invoicePdfAction(s, "download")} className="icon-btn" title="Download PDF"><Download size={17} /></button>
                        <button onClick={() => invoicePdfAction(s, "print")} className="icon-btn" title="View / print"><Printer size={17} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
