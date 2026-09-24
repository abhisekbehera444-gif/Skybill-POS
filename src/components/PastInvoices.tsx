import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Pencil, Printer, MessageCircle, FileText, X, Plus, Trash2, Download } from 'lucide-react';
import type { CatalogItem, Invoice, InvoiceItem, ShopSettings } from '@/types';
import {
  buildWhatsAppText,
  formatDate,
  formatINR,
  invoiceBalance,
  invoiceGst,
  invoiceSubtotal,
  invoiceTotal,
  whatsappUrl,
} from '@/helpers';
import { storage } from '@/storage';
import { downloadInvoicePdf } from '@/pdf';

interface Props {
  invoices: Invoice[];
  catalog: CatalogItem[];
  shop: ShopSettings;
  onChange: () => void;
}

export default function PastInvoices({ invoices, catalog, shop, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const [pdfInv, setPdfInv] = useState<Invoice | null>(null);
  const pdfAreaRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.customerName.toLowerCase().includes(q) ||
        inv.phone.includes(q) ||
        String(inv.number).includes(q),
    );
  }, [invoices, query]);

  function shareWhatsApp(inv: Invoice) {
    const text = buildWhatsAppText(inv, shop);
    window.open(whatsappUrl(inv.phone, text), '_blank');
  }

  function doPrint(inv: Invoice) {
    setPrintInv(inv);
  }

  function doDownloadPdf(inv: Invoice) {
    setPdfInv(inv);
  }

  useEffect(() => {
    if (!pdfInv || !pdfAreaRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await downloadInvoicePdf(pdfAreaRef.current, pdfInv.number);
      } catch (e) {
        console.error('PDF generation failed', e);
      }
      if (!cancelled) setPdfInv(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfInv]);

  useEffect(() => {
    if (!printInv) return;
    const t = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(t);
  }, [printInv]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
          <FileText className="h-5 w-5 text-sky-600" /> Past Invoices
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, or invoice #"
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-200">
          No invoices found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                      #{inv.number}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(inv.createdAt)}</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">{inv.customerName}</div>
                  <div className="text-xs text-slate-500">{inv.phone || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Balance Due</div>
                  <div className="text-lg font-bold text-rose-600">{formatINR(invoiceBalance(inv))}</div>
                </div>
              </div>

              <div className="mt-3 border-t border-dashed border-slate-200 pt-2 text-xs text-slate-500">
                {inv.items.length} item(s) · Total {formatINR(invoiceTotal(inv))}
                {inv.applyGst && ' · GST 18%'}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  onClick={() => setEditing({ ...inv, items: inv.items.map((i) => ({ ...i })) })}
                  className="flex items-center justify-center gap-1 rounded-lg bg-amber-50 px-2 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => doDownloadPdf(inv)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-2 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
                <button
                  onClick={() => doPrint(inv)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  onClick={() => shareWhatsApp(inv)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          invoice={editing}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            const list = storage.getInvoices().map((i) => (i.id === updated.id ? updated : i));
            storage.saveInvoices(list);
            setEditing(null);
            onChange();
          }}
        />
      )}

      {printInv && <PrintLayout invoice={printInv} shop={shop} onClose={() => setPrintInv(null)} />}

      {pdfInv && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <InvoiceDocument ref={pdfAreaRef} invoice={pdfInv} shop={shop} />
        </div>
      )}
    </div>
  );
}

const InvoiceDocument = forwardRef<HTMLDivElement, { invoice: Invoice; shop: ShopSettings }>(
  ({ invoice, shop }, ref) => {
  const subtotal = invoiceSubtotal(invoice);
  const gst = invoiceGst(invoice);
  const total = invoiceTotal(invoice);
  const balance = invoiceBalance(invoice);

  return (
    <div ref={ref} style={{ width: '210mm', minHeight: '297mm', padding: '20mm', background: '#fff', color: '#1e293b', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{shop.showroomName}</h1>
          <p style={{ fontSize: '13px', color: '#475569', margin: '2px 0' }}>Phone: {shop.phone}</p>
          <p style={{ fontSize: '13px', color: '#475569', margin: '2px 0' }}>GSTIN: {shop.gstin}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Tax Invoice</h2>
          <p style={{ fontSize: '13px', color: '#475569', margin: '2px 0' }}>#{invoice.number}</p>
          <p style={{ fontSize: '13px', color: '#475569', margin: '2px 0' }}>{formatDate(invoice.createdAt)}</p>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 4px' }}>Bill To</p>
        <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 2px' }}>{invoice.customerName}</p>
        <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{invoice.phone}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
            <th style={{ padding: '8px 4px' }}>#</th>
            <th style={{ padding: '8px 4px' }}>Description</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Qty</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Rate</th>
            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 4px' }}>{i + 1}</td>
              <td style={{ padding: '8px 4px' }}>{it.brand} {it.name}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>{it.quantity}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatINR(it.price)}</td>
              <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatINR(it.price * it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '16px', marginLeft: 'auto', width: '220px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ color: '#64748b' }}>Subtotal</span>
          <span>{formatINR(subtotal)}</span>
        </div>
        {invoice.applyGst && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ color: '#64748b' }}>GST (18%)</span>
            <span>{formatINR(gst)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '4px', fontWeight: 'bold', padding: '4px 0' }}>
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
          <span style={{ color: '#64748b' }}>Advance Paid</span>
          <span>{formatINR(invoice.advance || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', color: '#dc2626', padding: '2px 0' }}>
          <span>Balance Due</span>
          <span>{formatINR(balance)}</span>
        </div>
      </div>

      <div style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
        <p style={{ margin: '0 0 4px' }}>Pay via UPI: {shop.upiId}</p>
        <p style={{ margin: 0 }}>Thank you for your business!</p>
      </div>
    </div>
  );
});

function EditModal({
  invoice,
  catalog,
  onClose,
  onSave,
}: {
  invoice: Invoice;
  catalog: CatalogItem[];
  onClose: () => void;
  onSave: (inv: Invoice) => void;
}) {
  const [name, setName] = useState(invoice.customerName);
  const [phone, setPhone] = useState(invoice.phone);
  const [advance, setAdvance] = useState(invoice.advance || 0);
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items.map((i) => ({ ...i })));
  const [selId, setSelId] = useState('');
  const [selQty, setSelQty] = useState(1);

  function addItem() {
    const c = catalog.find((x) => x.id === selId);
    if (!c) return;
    const ex = items.findIndex((i) => i.catalogId === c.id);
    if (ex >= 0) {
      setItems((p) => p.map((i, idx) => (idx === ex ? { ...i, quantity: i.quantity + selQty } : i)));
    } else {
      setItems((p) => [
        ...p,
        { catalogId: c.id, brand: c.brand, name: c.name, price: c.price, quantity: selQty },
      ]);
    }
    setSelId('');
    setSelQty(1);
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  function save() {
    onSave({
      ...invoice,
      customerName: name.trim(),
      phone: phone.trim(),
      advance: Number(advance) || 0,
      items,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Edit Invoice #{invoice.number}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Customer Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-slate-500">Advance Paid</label>
          <input
            type="number"
            min={0}
            value={advance || ''}
            onChange={(e) => setAdvance(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-bold text-slate-700">Items</h4>
          <div className="flex gap-2">
            <select
              value={selId}
              onChange={(e) => setSelId(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            >
              <option value="">Add product…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} — {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={selQty}
              onChange={(e) => setSelQty(Math.max(1, Number(e.target.value)))}
              className="w-20 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            />
            <button
              onClick={addItem}
              disabled={!selId}
              className="rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {items.map((it, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="text-slate-700">
                  {it.brand} {it.name} × {it.quantity}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatINR(it.price * it.quantity)}</span>
                  <button onClick={() => removeItem(i)} className="text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="py-2 text-center text-xs text-slate-400">No items</p>
            )}
          </div>
        </div>

        <button
          onClick={save}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function PrintLayout({
  invoice,
  shop,
  onClose,
}: {
  invoice: Invoice;
  shop: ShopSettings;
  onClose: () => void;
}) {
  const subtotal = invoiceSubtotal(invoice);
  const gst = invoiceGst(invoice);
  const total = invoiceTotal(invoice);
  const balance = invoiceBalance(invoice);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="mx-auto max-w-2xl p-4">
        <div className="mb-3 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow"
          >
            Close
          </button>
        </div>
        <div id="print-area" className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{shop.showroomName}</h1>
              <p className="text-sm text-slate-600">Phone: {shop.phone}</p>
              <p className="text-sm text-slate-600">GSTIN: {shop.gstin}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase text-slate-800">Tax Invoice</h2>
              <p className="text-sm text-slate-600">#{invoice.number}</p>
              <p className="text-sm text-slate-600">{formatDate(invoice.createdAt)}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-slate-400">Bill To</p>
            <p className="font-semibold text-slate-800">{invoice.customerName}</p>
            <p className="text-sm text-slate-600">{invoice.phone}</p>
          </div>

          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                <th className="py-2">#</th>
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{it.brand} {it.name}</td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{formatINR(it.price)}</td>
                  <td className="py-2 text-right">{formatINR(it.price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {invoice.applyGst && (
              <div className="flex justify-between">
                <span className="text-slate-500">GST (18%)</span>
                <span>{formatINR(gst)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Advance Paid</span>
              <span>{formatINR(invoice.advance || 0)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-rose-600">
              <span>Balance Due</span>
              <span>{formatINR(balance)}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
            <p>Pay via UPI: {shop.upiId}</p>
            <p className="mt-1">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
