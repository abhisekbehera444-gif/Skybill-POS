import { useState } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import type { ShopSettings } from '@/types';
import { storage } from '@/storage';

interface Props {
  shop: ShopSettings;
  onChange: () => void;
}

export default function SettingsScreen({ shop, onChange }: Props) {
  const [form, setForm] = useState<ShopSettings>(shop);
  const [toast, setToast] = useState('');

  function save() {
    storage.saveSettings(form);
    onChange();
    setToast('Settings saved');
    setTimeout(() => setToast(''), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
          <SettingsIcon className="h-5 w-5 text-sky-600" /> Showroom Settings
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          These details appear on printed invoices and WhatsApp messages.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Showroom Name</label>
            <input
              value={form.showroomName}
              onChange={(e) => setForm({ ...form, showroomName: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Phone Number</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">GSTIN Number</label>
            <input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Shop UPI ID</label>
            <input
              value={form.upiId}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              placeholder="yourshop@upi"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
        <button
          onClick={save}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" /> Save Settings
        </button>
        {toast && (
          <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-700">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
