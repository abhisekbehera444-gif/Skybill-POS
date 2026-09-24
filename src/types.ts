export interface CatalogItem {
  id: string;
  brand: string;
  name: string;
  price: number;
}

export interface InvoiceItem {
  catalogId: string;
  brand: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  number: number;
  customerName: string;
  phone: string;
  items: InvoiceItem[];
  applyGst: boolean;
  advance: number;
  createdAt: number;
}

export interface ShopSettings {
  showroomName: string;
  phone: string;
  gstin: string;
  upiId: string;
}

export type TabKey = 'invoice' | 'catalog' | 'history' | 'settings';
