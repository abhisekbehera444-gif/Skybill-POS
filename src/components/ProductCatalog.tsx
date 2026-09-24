import { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { formatINR } from '@/helpers';
import { storage, uid } from '@/storage';

interface Props {
  catalog: CatalogItem[];
  onChange: () => void;
}

export default function ProductCatalog({ catalog, onChange }: Props) {
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [toast, setToast] = useState('');

  function add() {
    if (!brand.trim() || !name.trim() || !price) {
      setToast('Fill all fields');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    const item: CatalogItem = {
      id: uid(),
      brand: brand.trim(),
      name: name.trim(),
      price: Number(price),
    };
    const list = [item, ...storage.getCatalog()];
    storage.saveCatalog(list);
    setBrand('');
    setName('');
    setPrice('');
    onChange();
    setToast('Item added');
    setTimeout(() => setToast(''), 2000);
  }

  function remove(id: string) {
    const list = storage.getCatalog().filter((c) => c.id !== id);
    storage.saveCatalog(list);
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
          <Package className="h-5 w-5 text-sky-600" /> Add New Item
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Brand Name</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Jaquar"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Item Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basin Mixer"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Selling Price (₹)</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 3200"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
        <button
          onClick={add}
          className="mt-3 flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" /> Add to Catalog
        </button>
        {toast && (
          <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-700">
            {toast}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-3 text-sm font-bold text-slate-700">
          Catalog ({catalog.length} items)
        </h3>
        {catalog.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No items yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalog.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{c.brand} {c.name}</div>
                  <div className="text-sm font-medium text-sky-600">{formatINR(c.price)}</div>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
