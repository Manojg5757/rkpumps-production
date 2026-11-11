"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DatabaseBackup, LogOut } from "lucide-react";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "../../lib/settings";
import { exportAllData } from "../../lib/db";
import { GST_STATES } from "../../lib/states";
import { isValidGstin } from "../../lib/utils";
import { useAuth } from "../../lib/authContext";
import { BusinessSettings } from "../../types";
import { Loading, PageHeader } from "../../components/ui/Common";

export default function SettingsPage() {
  const { logout, user } = useAuth();
  const [s, setS] = useState<BusinessSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => { getSettings(true).then(setS).catch(() => setS(DEFAULT_SETTINGS)); }, []);

  if (!s) return <Loading />;
  const set = (patch: Partial<BusinessSettings>) => setS({ ...s, ...patch });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.name.trim()) return toast.error("Enter the business name");
    if (s.gstin && !isValidGstin(s.gstin)) return toast.error("GSTIN looks wrong — check it or leave it empty");
    if (s.gstin && s.gstin.slice(0, 2) !== s.stateCode) return toast.error(`GSTIN starts with ${s.gstin.slice(0, 2)} but the state is ${s.stateCode}. Choose the matching state.`);
    setSaving(true);
    try {
      await saveSettings({ ...s, gstin: s.gstin.toUpperCase().trim() });
      toast.success("Settings saved — new PDFs will use these details");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const backup = async () => {
    setBackingUp(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `RK_Pumps_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Backup failed — check your internet connection");
    } finally {
      setBackingUp(false);
    }
  };

  const field = (label: string, key: keyof BusinessSettings, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={s[key]} onChange={e => set({ [key]: e.target.value } as Partial<BusinessSettings>)} {...props} />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Details printed on your invoices and quotations" />
      <form onSubmit={save} className="space-y-4">
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">Business</h2>
          {field("Business name *", "name")}
          <div className="grid sm:grid-cols-2 gap-3">
            {field("Address line 1", "address1")}
            {field("Address line 2 / city, PIN", "address2")}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {field("Phone", "phone", { inputMode: "tel" })}
            {field("Email", "email", { type: "email" })}
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">GST</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Your GSTIN</label>
              <input className="input uppercase placeholder:normal-case num" maxLength={15} value={s.gstin} onChange={e => {
                const g = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                set({ gstin: g, ...(g.length >= 2 && GST_STATES.some(x => x.code === g.slice(0, 2)) ? { stateCode: g.slice(0, 2) } : {}) });
              }} placeholder="33XXXXX0000X1Z5" />
              <p className="text-xs text-ink-3 mt-1">{s.gstin ? "Invoices will print as TAX INVOICE." : "Without a GSTIN, invoices print as INVOICE (not a tax invoice)."}</p>
            </div>
            <div>
              <label className="label">Your state</label>
              <select className="input" value={s.stateCode} onChange={e => set({ stateCode: e.target.value })}>
                {GST_STATES.map(st => <option key={st.code} value={st.code}>{st.code} – {st.name}</option>)}
              </select>
              <p className="text-xs text-ink-3 mt-1">Customers from another state are charged IGST automatically.</p>
            </div>
          </div>
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">Bank &amp; UPI <span className="text-ink-3 font-normal text-sm">— printed on invoices so customers can pay</span></h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {field("Bank name", "bankName")}
            {field("Account holder name", "accountName")}
            {field("Account number", "accountNumber", { inputMode: "numeric" })}
            {field("IFSC", "ifsc", { className: "input uppercase" })}
          </div>
          {field("UPI ID", "upiId", { placeholder: "name@okaxis" })}
        </section>

        <section className="card p-4 space-y-3">
          <h2 className="font-semibold">Terms</h2>
          <div>
            <label className="label">Invoice terms (one per line)</label>
            <textarea className="input" rows={3} value={s.invoiceTerms} onChange={e => set({ invoiceTerms: e.target.value })} />
          </div>
          <div>
            <label className="label">Quotation terms (one per line)</label>
            <textarea className="input" rows={3} value={s.quotationTerms} onChange={e => set({ quotationTerms: e.target.value })} />
            <p className="text-xs text-ink-3 mt-1">The validity line (“valid for N days”) is added automatically.</p>
          </div>
        </section>

        <div className="sticky bottom-20 md:bottom-4 z-10">
          <button type="submit" className="btn-primary w-full h-12 shadow-lg" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
        </div>
      </form>

      <section className="card p-4 mt-6 space-y-3">
        <h2 className="font-semibold">Data</h2>
        <p className="text-sm text-ink-2">Download a full copy of all products, invoices, payments, customers and expenses. Keep it on Google Drive once a month.</p>
        <button className="btn-secondary" onClick={backup} disabled={backingUp}><DatabaseBackup size={18} /> {backingUp ? "Preparing…" : "Download backup"}</button>
      </section>

      <section className="card p-4 mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">Account</p>
          <p className="text-sm text-ink-3 truncate">{user?.email}</p>
        </div>
        <button className="btn-secondary text-red-600" onClick={logout}><LogOut size={18} /> Log out</button>
      </section>
    </div>
  );
}
