import type { CatalogItem, Invoice, ShopSettings } from './types';

const KEYS = {
  catalog: 'sf_catalog',
  invoices: 'sf_invoices',
  settings: 'sf_settings',
  counter: 'sf_invoice_counter',
};

export const defaultCatalog: CatalogItem[] = [
  { id: 'c1', brand: 'Jaquar', name: 'Basin Mixer', price: 3200 },
  { id: 'c2', brand: 'Cera', name: 'Western Commode', price: 6500 },
  { id: 'c3', brand: 'Kohler', name: 'Rain Shower Head', price: 8900 },
  { id: 'c4', brand: 'Parryware', name: 'Seat Cover', price: 2100 },
  { id: 'c5', brand: 'Jaquar', name: 'Angle Stop Cock', price: 450 },
  { id: 'c6', brand: 'Hindware', name: 'Single Lever Wall Mixer', price: 2800 },
  { id: 'c7', brand: 'Cera', name: 'Overhead Cistern', price: 1900 },
  { id: 'c8', brand: 'Kohler', name: 'Vessel Sink', price: 7400 },
];

export const defaultSettings: ShopSettings = {
  showroomName: 'Aqua Bath Gallery',
  phone: '9876543210',
  gstin: '27ABCDE1234F1Z5',
  upiId: 'aquabath@upi',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getCatalog(): CatalogItem[] {
    const list = read<CatalogItem[]>(KEYS.catalog, []);
    if (list.length === 0) {
      write(KEYS.catalog, defaultCatalog);
      return defaultCatalog;
    }
    return list;
  },
  saveCatalog(list: CatalogItem[]) {
    write(KEYS.catalog, list);
  },
  getInvoices(): Invoice[] {
    return read<Invoice[]>(KEYS.invoices, []);
  },
  saveInvoices(list: Invoice[]) {
    write(KEYS.invoices, list);
  },
  getSettings(): ShopSettings {
    return { ...defaultSettings, ...read<Partial<ShopSettings>>(KEYS.settings, {}) };
  },
  saveSettings(s: ShopSettings) {
    write(KEYS.settings, s);
  },
  nextInvoiceNumber(): number {
    const n = read<number>(KEYS.counter, 1000);
    const next = n + 1;
    write(KEYS.counter, next);
    return next;
  },
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
