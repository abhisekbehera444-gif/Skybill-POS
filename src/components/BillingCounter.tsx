import { useMemo, useState } from 'react';
import { Plus, Trash2, Save, ShoppingCart } from 'lucide-react';
import type { CatalogItem, Invoice, InvoiceItem } from '@/types';
import { formatINR, invoiceBalance, invoiceGst, invoiceSubtotal, invoiceTotal } from '@/helpers';
import { storage, uid } from '@/storage';

interface Props {
  catalog: CatalogItem[];
  onSaved: () => void;
}

export default function BillingCounter({ catalog, onSaved }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [applyGst, setApplyGst] = useState(true);
  const [advance, setAdvance] = useState(0);
  const [toast, setToast] = useState('');

  const draft: Invoice = useMemo(
    () => ({
      id: 'draft',
      number: 0,
      customerName,
      phone,
      items,
      applyGst,
      advance,
      createdAt: Date.now(),
    }),
    [customerName, phone, items, applyGst, advance],
  );

  const subtotal = invoiceSubtotal(draft);
  const gst = invoiceGst(draft);
  const total = invoiceTotal(draft);
  const balance = invoiceBalance(draft);

  function addItem() {
    const item = catalog.find((c) => c.id === selectedId);
    if (!item || qty < 1) return;
    const existing = items.findIndex((it) => it.catalogId === item.id);
    if (existing >= 0) {
      setItems((prev) =>
        prev.map((it, i) => (i === existing ? { ...it, quantity: it.quantity + qty } : it)),
      );
    } else {
      setItems((prev) => [
        ...prev,
        { catalogId: item.id, brand: item.brand, name: item.name, price: item.price, quantity: qty },
      ]);
    }
    setSelectedId('');
    setQty(1);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function save() {
    if (!customerName.trim()) {
      setToast('Enter customer name');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    if (items.length === 0) {
      setToast('Add at least one item');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    const num = storage.nextInvoiceNumber();
    const inv: Invoice = {
      id: uid(),
      number: num,
      customerName: customerName.trim(),
      phone: phone.trim(),
      items,
      applyGst,
      advance: Number(advance) || 0,
      createdAt: Date.now(),
    };
    const list = storage.getInvoices();
    list.unshift(inv);
    storage.saveInvoices(list);
    setCustomerName('');
    setPhone('');
    setItems([]);
    setApplyGst(true);
    setAdvance(0);
    setToast(`Invoice #${num} saved`);
    setTimeout(() => setToast(''), 2500);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
          <ShoppingCart className="h-5 w-5 text-sky-600" /> New Invoice
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Customer Name</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">WhatsApp Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
              placeholder="10-digit mobile"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 text-sm font-bold text-slate-700">Add Item</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Select Product</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Choose from catalog…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} — {c.name} ({formatINR(c.price)})
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-24">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Qty</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <button
            onClick={addItem}
            disabled={!selectedId}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        {items.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{it.brand} {it.name}</div>
                      <div className="text-xs text-slate-400">{formatINR(it.price)} each</div>
                    </td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatINR(it.price * it.quantity)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removeItem(i)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 text-sm font-bold text-slate-700">Bill Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{formatINR(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-500">
              <input
                type="checkbox"
                checked={applyGst}
                onChange={(e) => setApplyGst(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
              />
              GST (18%)
            </span>
            <span className="font-medium">{formatINR(gst)}</span>
          </label>
          <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
            <span className="text-slate-500">Total</span>
            <span className="font-semibold">{formatINR(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-slate-500">Advance Paid</span>
            <input
              type="number"
              min={0}
              value={advance || ''}
              onChange={(e) => setAdvance(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex justify-between rounded-xl bg-rose-50 px-3 py-2.5">
            <span className="font-semibold text-rose-700">Balance Due</span>
            <span className="text-lg font-bold text-rose-600">{formatINR(balance)}</span>
          </div>
        </div>
        <button
          onClick={save}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" /> Save & Record Invoice
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
