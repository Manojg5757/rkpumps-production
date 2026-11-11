"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Sale } from "../../types";
import { RANGE_LABELS, RangeKey, downloadCsv, inRange, rangeBounds } from "../../lib/dates";
import { saleTotal } from "../../lib/gst";
import { formatDate } from "../../lib/utils";
import { Stat, inr, inr2 } from "../ui/Common";

type Agg = { taxable: number; cgst: number; sgst: number; igst: number };
const z = (): Agg => ({ taxable: 0, cgst: 0, sgst: 0, igst: 0 });

export function GstReport({ sales }: { sales: Sale[] }) {
  const [range, setRange] = useState<RangeKey>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const data = useMemo(() => {
    const list = sales.filter(s => inRange(s.date, rangeBounds(range, from, to)));
    const total = z();
    const byRate: Record<number, Agg> = {};
    const byHsn: Record<string, Agg & { desc: string; qty: number; unit: string; rate: number }> = {};
    let b2b = 0, b2c = 0, b2bTaxable = 0, b2cTaxable = 0;

    list.forEach(s => {
      const inter = !!s.isInterState;
      if (s.customer.gstin) { b2b++; b2bTaxable += s.totalTaxableAmount; } else { b2c++; b2cTaxable += s.totalTaxableAmount; }
      s.items.forEach(i => {
        const tax = i.lineGSTAmount;
        const add = (a: Agg) => {
          a.taxable += i.lineTaxableAmount;
          if (inter) a.igst += tax; else { a.cgst += tax / 2; a.sgst += tax / 2; }
        };
        add(total);
        add((byRate[i.gstPercentage] ||= z()));
        const key = `${i.hsnCode || (i.isService ? "SAC-NA" : "NA")}|${i.gstPercentage}`;
        const h = (byHsn[key] ||= { ...z(), desc: i.name, qty: 0, unit: i.unitName, rate: i.gstPercentage });
        h.qty += i.quantity;
        add(h);
      });
    });
    return { list, total, byRate, byHsn, b2b, b2c, b2bTaxable, b2cTaxable };
  }, [sales, range, from, to]);

  const tax = data.total.cgst + data.total.sgst + data.total.igst;
  const label = RANGE_LABELS[range].replace(/\s/g, "_");

  const exportInvoices = () =>
    downloadCsv(`GST_Invoices_${label}.csv`,
      ["Invoice No", "Date", "Customer", "GSTIN", "Type", "Place of Supply", "Taxable", "CGST", "SGST", "IGST", "Invoice Value"],
      data.list.map(s => {
        const inter = !!s.isInterState;
        return [s.billNumber, formatDate(new Date(s.date)), s.customer.name, s.customer.gstin || "", s.customer.gstin ? "B2B" : "B2C",
          s.placeOfSupply || "", s.totalTaxableAmount.toFixed(2), (inter ? 0 : s.totalGSTAmount / 2).toFixed(2),
          (inter ? 0 : s.totalGSTAmount / 2).toFixed(2), (inter ? s.totalGSTAmount : 0).toFixed(2), saleTotal(s).toFixed(2)];
      }));

  const exportHsn = () =>
    downloadCsv(`HSN_Summary_${label}.csv`,
      ["HSN/SAC", "Description", "UQC", "Total Quantity", "GST Rate", "Taxable Value", "CGST", "SGST", "IGST"],
      Object.entries(data.byHsn).map(([k, h]) => [k.split("|")[0], h.desc, h.unit, h.qty, `${h.rate}%`, h.taxable.toFixed(2), h.cgst.toFixed(2), h.sgst.toFixed(2), h.igst.toFixed(2)]));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(["month", "lastMonth", "fy", "all", "custom"] as RangeKey[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={range === r ? "chip-active" : "chip"}>{RANGE_LABELS[r]}</button>
        ))}
      </div>
      {range === "custom" && (
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <div><label className="label">From</label><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} /></div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Taxable value" value={inr(data.total.taxable)} sub={`${data.list.length} invoices`} />
        <Stat label="Total GST" value={inr(tax)} tone="brand" />
        <Stat label="CGST + SGST" value={inr(data.total.cgst + data.total.sgst)} sub={`${inr(data.total.cgst)} each`} />
        <Stat label="IGST" value={inr(data.total.igst)} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="font-semibold mb-2">Customer type</p>
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-ink-2">B2B (with GSTIN) · {data.b2b}</span><span className="num">{inr2(data.b2bTaxable)}</span></div>
            <div className="flex justify-between"><span className="text-ink-2">B2C (no GSTIN) · {data.b2c}</span><span className="num">{inr2(data.b2cTaxable)}</span></div>
          </div>
        </div>
        <div className="card p-4">
          <p className="font-semibold mb-2">Rate-wise</p>
          <div className="text-sm space-y-1.5">
            {Object.entries(data.byRate).sort((a, b) => Number(a[0]) - Number(b[0])).map(([rate, a]) => (
              <div key={rate} className="flex justify-between gap-2">
                <span className="text-ink-2">{rate}% on {inr2(a.taxable)}</span>
                <span className="num">{inr2(a.cgst + a.sgst + a.igst)}</span>
              </div>
            ))}
            {Object.keys(data.byRate).length === 0 && <p className="text-ink-3">No sales in this period.</p>}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-semibold">HSN / SAC summary</p>
          <div className="flex gap-2">
            <button className="btn-secondary h-9 px-3" onClick={exportInvoices}><Download size={16} /> Invoices</button>
            <button className="btn-secondary h-9 px-3" onClick={exportHsn}><Download size={16} /> HSN</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">HSN / SAC</th>
                <th className="th">Item</th>
                <th className="th text-right">Qty</th>
                <th className="th text-right">Rate</th>
                <th className="th text-right">Taxable</th>
                <th className="th text-right">Tax</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byHsn).map(([k, h]) => (
                <tr key={k}>
                  <td className="td num">{k.split("|")[0] === "NA" ? <span className="text-amber-700">Not set</span> : k.split("|")[0]}</td>
                  <td className="td text-ink-2 max-w-[14rem] truncate">{h.desc}</td>
                  <td className="td text-right num">{Math.round(h.qty * 1000) / 1000}</td>
                  <td className="td text-right num">{h.rate}%</td>
                  <td className="td text-right num">{inr2(h.taxable)}</td>
                  <td className="td text-right num">{inr2(h.cgst + h.sgst + h.igst)}</td>
                </tr>
              ))}
              {Object.keys(data.byHsn).length === 0 && <tr><td colSpan={6} className="td text-center text-ink-3 py-8">No sales in this period.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-ink-3">Add HSN codes to products (Inventory → Edit) so they print on invoices and group correctly here.</p>
      </div>
    </div>
  );
}
