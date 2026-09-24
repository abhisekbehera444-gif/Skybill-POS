import type { Invoice, ShopSettings } from './types';

export function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function invoiceSubtotal(inv: Invoice): number {
  return inv.items.reduce((s, it) => s + it.price * it.quantity, 0);
}

export function invoiceGst(inv: Invoice): number {
  return inv.applyGst ? invoiceSubtotal(inv) * 0.18 : 0;
}

export function invoiceTotal(inv: Invoice): number {
  return invoiceSubtotal(inv) + invoiceGst(inv);
}

export function invoiceBalance(inv: Invoice): number {
  return invoiceTotal(inv) - (inv.advance || 0);
}

export function buildWhatsAppText(inv: Invoice, shop: ShopSettings): string {
  const lines: string[] = [];
  lines.push(`*${shop.showroomName}*`);
  lines.push(`Invoice #${inv.number} | ${formatDate(inv.createdAt)}`);
  lines.push('----------------------');
  lines.push(`Customer: ${inv.customerName}`);
  lines.push(`Phone: ${inv.phone}`);
  lines.push('----------------------');
  inv.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.brand} ${it.name}`);
    lines.push(`   ${it.quantity} x ${formatINR(it.price)} = ${formatINR(it.price * it.quantity)}`);
  });
  lines.push('----------------------');
  lines.push(`Subtotal: ${formatINR(invoiceSubtotal(inv))}`);
  if (inv.applyGst) lines.push(`GST (18%): ${formatINR(invoiceGst(inv))}`);
  lines.push(`Total: ${formatINR(invoiceTotal(inv))}`);
  lines.push(`Advance Paid: ${formatINR(inv.advance || 0)}`);
  lines.push(`*Balance Due: ${formatINR(invoiceBalance(inv))}*`);
  lines.push('----------------------');
  lines.push(`Pay via UPI: ${shop.upiId}`);
  lines.push(`GSTIN: ${shop.gstin}`);
  lines.push(`Call: ${shop.phone}`);
  return lines.join('\n');
}

export function whatsappUrl(phone: string, text: string): string {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  const withCountry = clean.length === 10 ? '91' + clean : clean;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}
