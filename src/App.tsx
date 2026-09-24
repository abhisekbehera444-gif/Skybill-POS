import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Package, 
  History, 
  Settings, 
  Plus, 
  Trash2, 
  Send, 
  Printer, 
  Edit3, 
  Download, 
  Store, 
  ShieldCheck, 
  Search, 
  X, 
  Bell,
  ShoppingBag,
  CreditCard,
  PhoneCall,
  FileText,
  Boxes,
  ClipboardList,
  Clock,
  Lock,
  Key,
  TrendingUp,
  AlertTriangle,
  Layers,
  Zap
} from 'lucide-react';
import jsPDF from 'jspdf';

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface InvoiceItem extends CatalogItem {
  qty: number;
}

interface Invoice {
  id: string;
  customerName: string;
  phone: string;
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number;
  gst: number;
  total: number;
  advancePaid: number;
  balanceDue: number;
  date: string;
  time: string;
}

interface ShopProfile {
  name: string;
  category: string;
  phone: string;
  gstin: string;
  upi: string;
  address: string;
}

const storage = {
  save(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  },
  load(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }
};

const getDeviceFingerprint = (): string => {
  let devId = localStorage.getItem('pos_device_id');
  if (!devId) {
    const userAgent = navigator.userAgent;
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const randomHash = Math.random().toString(36).substring(2, 9);
    devId = btoa(userAgent + screenRes + randomHash).substring(0, 10).toUpperCase();
    localStorage.setItem('pos_device_id', devId);
  }
  return devId;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'billing' | 'catalog' | 'history' | 'settings'>('billing');
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [deviceFingerprint] = useState<string>(() => getDeviceFingerprint());
  const [activationKeyInput, setActivationKeyInput] = useState('');

  const DEVELOPER_UPI = '8260680874-3@ybl';
  const SECRET_SALT = "SKYBILL_SECRET_KEY_2026_@#!";

  useEffect(() => {
    const TRIAL_DAYS: number = 7; 
    const storedTrialStart = localStorage.getItem('pos_trial_start_date');
    const licenseStatus = storage.load('pos_licensed_status_final');
    const now = Date.now();

    if (licenseStatus === true) {
      setIsTrialExpired(false);
      return;
    }

    if (!storedTrialStart) {
      localStorage.setItem('pos_trial_start_date', now.toString());
    } else {
      const startTime = parseInt(storedTrialStart, 10);
      const daysElapsed = (now - startTime) / (1000 * 60 * 60 * 24);
      if (daysElapsed > TRIAL_DAYS) {
        setIsTrialExpired(true);
      }
    }
  }, []);

  const [shop, setShop] = useState<ShopProfile>(() => {
    const saved = storage.load('pos_shop_profile_v1');
    return saved ? saved : {
      name: 'MY SHOP',
      category: 'Retail & Wholesale Hub',
      phone: '',
      gstin: '',
      upi: '',
      address: ''
    };
  });

  const [catalog, setCatalog] = useState<CatalogItem[]>(() => {
    const saved = storage.load('pos_catalog_v1');
    return saved ? saved : [];
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = storage.load('pos_invoices_v1');
    return saved ? saved : [];
  });

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billItems, setBillItems] = useState<InvoiceItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [gstRate, setGstRate] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<string>('0');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemStock, setNewItemStock] = useState('10');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  useEffect(() => { storage.save('pos_shop_profile_v1', shop); }, [shop]);
  useEffect(() => { storage.save('pos_catalog_v1', catalog); }, [catalog]);
  useEffect(() => { storage.save('pos_invoices_v1', invoices); }, [invoices]);

  const handleAddBillItem = () => {
    if (!selectedProduct) return;
    const prod = catalog.find((c) => c.id === selectedProduct);
    if (!prod) return;

    if (prod.stock < qty) {
      alert(`Warning: Only ${prod.stock} items left in stock!`);
    }

    setBillItems([...billItems, { ...prod, qty }]);
    setSelectedProduct('');
    setQty(1);
  };

  const subtotal = billItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
  const activeGstRate = gstRate || 0;
  const gst = activeGstRate > 0 ? parseFloat((subtotal * (activeGstRate / 100)).toFixed(2)) : 0;
  const total = parseFloat((subtotal + gst).toFixed(2));
  const paidVal = parseFloat(advancePaid) || 0;
  const balanceDue = Math.max(0, parseFloat((total - paidVal).toFixed(2)));

  const handleSaveInvoice = () => {
    if (!customerName || !customerName.trim()) {
      alert('Please enter the customer name before generating the bill!');
      return;
    }

    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit customer mobile number before generating the bill!');
      return;
    }

    if (billItems.length === 0) {
      alert('Please add items to the bill first!');
      return;
    }

    const updatedCatalog = catalog.map(catItem => {
      const soldItem = billItems.find(b => b.id === catItem.id);
      if (soldItem) {
        return { ...catItem, stock: Math.max(0, catItem.stock - soldItem.qty) };
      }
      return catItem;
    });
    setCatalog(updatedCatalog);

    const now = new Date();

    if (editingInvoiceId) {
      setInvoices(invoices.map((inv) => {
        if (inv.id === editingInvoiceId) {
          return {
            ...inv,
            customerName: customerName.trim(),
            phone: customerPhone.trim(),
            items: billItems,
            subtotal,
            gstRate: activeGstRate,
            gst,
            total,
            advancePaid: paidVal,
            balanceDue
          };
        }
        return inv;
      }));
      setEditingInvoiceId(null);
      alert('Invoice updated successfully!');
    } else {
      const newInv: Invoice = {
        id: '#' + (1000 + invoices.length + 1),
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        items: billItems,
        subtotal,
        gstRate: activeGstRate,
        gst,
        total,
        advancePaid: paidVal,
        balanceDue,
        date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
      setInvoices([newInv, ...invoices]);
      setPreviewInvoice(newInv);
    }

    setBillItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setAdvancePaid('0');
  };

  const handleStartEdit = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setCustomerName(inv.customerName);
    setCustomerPhone(inv.phone);
    setBillItems([...inv.items]);
    setGstRate(inv.gstRate !== undefined ? inv.gstRate : 0);
    setAdvancePaid(inv.advancePaid.toString());
    setActiveTab('billing');
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const item: CatalogItem = {
      id: Date.now().toString(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      stock: parseInt(newItemStock) || 10
    };
    setCatalog([...catalog, item]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemStock('10');
  };

  const getUpiQrUrl = (upiId: string, amount: number, shopName: string) => {
    if (!upiId) return '';
    const cleanUpi = upiId.trim();
    const upiLink = 'upi://pay?pa=' + cleanUpi + '&pn=' + encodeURIComponent(shopName) + '&am=' + amount + '&cu=INR';
    return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(upiLink) + '&margin=4';
  };

  const handleThermalPrint = (inv: Invoice) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Please allow popups to use thermal print!');
      return;
    }

    const itemsHtml = inv.items.map(i => `
      <tr>
        <td>${i.name} (x${i.qty})</td>
        <td style="text-align:right;">Rs ${(i.price * i.qty).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${inv.id}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; color: #000; width: 280px; margin: 0 auto; }
            h2, p { text-align: center; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 4px 0; font-size: 11px; }
            .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <h2>${shop.name || 'STORE'}</h2>
          <p>${shop.category || ''}</p>
          <p>${shop.address || ''}</p>
          <p>Ph: ${shop.phone || 'N/A'}</p>
          ${shop.gstin ? `<p>GSTIN: ${shop.gstin}</p>` : ''}
          <div class="border-bottom"></div>
          <p><strong>Invoice:</strong> ${inv.id}</p>
          <p><strong>Date:</strong> ${inv.date} ${inv.time}</p>
          <p><strong>Customer:</strong> ${inv.customerName} (${inv.phone})</p>
          <div class="border-bottom"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th align="left">Item</th>
                <th align="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="border-bottom" style="margin-top:6px;"></div>
          <p align="right"><strong>Subtotal:</strong> Rs ${inv.subtotal.toFixed(2)}</p>
          ${inv.gstRate > 0 ? `<p align="right"><strong>GST (${inv.gstRate}%):</strong> Rs ${inv.gst.toFixed(2)}</p>` : ''}
          <p align="right"><strong>Grand Total:</strong> Rs ${inv.total.toFixed(2)}</p>
          <p align="right"><strong>Paid:</strong> Rs ${inv.advancePaid.toFixed(2)}</p>
          <p align="right"><strong>Balance Due:</strong> Rs ${inv.balanceDue.toFixed(2)}</p>
          <div class="border-bottom" style="margin-top:6px;"></div>
          <p style="text-align:center; font-size:10px;">Thank You! Visit Again.</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
  `);
  printWindow.document.close();
};

const handleDownloadPdf = (inv: Invoice) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 42, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text((shop.name || 'STORE').toUpperCase(), 15, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(shop.category || 'Retail Showroom', 15, 23);
  doc.text(`Phone: ${shop.phone || 'N/A'}  |  Address: ${shop.address || 'N/A'}`, 15, 29);
  if (shop.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(244, 114, 182);
    doc.text(`GSTIN: ${shop.gstin}`, 15, 36);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - 15, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Invoice No: ${inv.id}`, pageWidth - 15, 23, { align: 'right' });
  doc.text(`Date: ${inv.date}`, pageWidth - 15, 29, { align: 'right' });
  doc.text(`Time: ${inv.time}`, pageWidth - 15, 35, { align: 'right' });

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, 50, pageWidth - 30, 18, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO (CUSTOMER):', 20, 57);
  
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(inv.customerName, 20, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${inv.phone || 'N/A'}`, pageWidth - 20, 64, { align: 'right' });

  let startY = 76;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(15, startY, pageWidth - 30, 9, 1, 1, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('#', 19, startY + 6);
  doc.text('Item Description', 32, startY + 6);
  doc.text('Qty', 120, startY + 6, { align: 'center' });
  doc.text('Rate (Rs)', 152, startY + 6, { align: 'right' });
  doc.text('Total (Rs)', pageWidth - 19, startY + 6, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  startY += 9;

  inv.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, startY, pageWidth - 30, 9, 'F');
    }

    doc.text((index + 1).toString(), 19, startY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(item.name, 32, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(item.qty.toString(), 120, startY + 6, { align: 'center' });
    doc.text(item.price.toFixed(2), 152, startY + 6, { align: 'right' });
    doc.text((item.price * item.qty).toFixed(2), pageWidth - 19, startY + 6, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(15, startY + 9, pageWidth - 15, startY + 9);
    startY += 9;
  });

  startY += 12;

  const summaryX = pageWidth - 90;
  const invGstRate = inv.gstRate || 0;
  const invGstAmt = inv.gst || 0;

  if (shop.upi && inv.balanceDue > 0) {
    try {
      const qrUrl = getUpiQrUrl(shop.upi, inv.balanceDue, shop.name);
      doc.addImage(qrUrl, 'PNG', 15, startY - 2, 36, 36);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Scan & Pay Balance via UPI', 15, startY + 39);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(shop.upi, 15, startY + 43);
    } catch (e) {
      console.error('QR load error in PDF', e);
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal:', summaryX, startY);
  doc.text(`Rs ${inv.subtotal.toFixed(2)}`, pageWidth - 18, startY, { align: 'right' });

  if (invGstRate > 0 && invGstAmt > 0) {
    startY += 6;
    doc.text(`GST (${invGstRate}% Inclusive):`, summaryX, startY);
    doc.text(`Rs ${invGstAmt.toFixed(2)}`, pageWidth - 18, startY, { align: 'right' });
  }

  startY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX, startY);
  doc.text(`Rs ${inv.total.toFixed(2)}`, pageWidth - 18, startY, { align: 'right' });

  startY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Advance Paid:', summaryX, startY);
  doc.text(`Rs ${inv.advancePaid.toFixed(2)}`, pageWidth - 18, startY, { align: 'right' });

  startY += 8;
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(summaryX - 5, startY - 4, 77, 10, 2, 2, 'F');
  doc.setTextColor(185, 28, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('Balance Due:', summaryX, startY + 2.5);
  doc.text(`Rs ${inv.balanceDue.toFixed(2)}`, pageWidth - 21, startY + 2.5, { align: 'right' });

  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('This is a computer-generated professional tax invoice and requires no physical signature.', 15, pageHeight - 12);

  doc.save(`Invoice_${inv.id.replace('#', '')}.pdf`);
};

const openWhatsAppUrl = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const sendWhatsApp = (inv: Invoice) => {
  const rawDigits = (inv.phone || '').replace(/\D/g, '');
  const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : '';
  const itemsList = inv.items.map(i => i.name + ' (x' + i.qty + ') - Rs ' + (i.price * i.qty)).join('\n- ');
  
  const msg = 'TAX INVOICE: ' + (shop.name ? shop.name.toUpperCase() : 'STORE') + '\n' +
    (shop.gstin ? 'GSTIN: ' + shop.gstin + '\n' : '') +
    'Invoice: ' + inv.id + ' | Date: ' + inv.date + '\n' +
    'Customer: ' + inv.customerName + '\n\n' +
    'Items:\n- ' + itemsList + '\n\n' +
    'Total Amount: Rs ' + inv.total.toFixed(2) + '\n' +
    'Advance Paid: Rs ' + inv.advancePaid.toFixed(2) + '\n' +
    'Balance Due: Rs ' + inv.balanceDue.toFixed(2) + '\n\n' +
    (shop.upi ? 'Pay via Shop UPI Scanner / ID: ' + shop.upi + '\n\n' : '') +
    'Thank you for your business!';

  const url = cleanPhone.length === 10
    ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  openWhatsAppUrl(url);
};

const sendPaymentReminder = (inv: Invoice) => {
  const rawDigits = (inv.phone || '').replace(/\D/g, '');
  const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : '';

  const msg = 'PAYMENT REMINDER\n\n' +
    'Dear ' + inv.customerName + ',\n' +
    'This is a friendly reminder from ' + shop.name + ' regarding the pending balance for Invoice ' + inv.id + '.\n\n' +
    'Total Bill: Rs ' + inv.total.toFixed(2) + '\n' +
    'Advance Paid: Rs ' + inv.advancePaid.toFixed(2) + '\n' +
    'Remaining Balance Due: Rs ' + inv.balanceDue.toFixed(2) + '\n\n' +
    (shop.upi ? 'You can clear the payment using shop UPI ID:\nUPI ID: ' + shop.upi + '\n\n' : '') +
    'Please complete the payment at your earliest convenience. Thank you!';

  const url = cleanPhone.length === 10 
    ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  openWhatsAppUrl(url);
};

const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase();
};

const handleVerifyActivationKey = () => {
  const cleanKey = activationKeyInput.trim().toUpperCase();
  const encryptedPart = simpleHash(deviceFingerprint + SECRET_SALT);
  const expectedKey = `SKB-${encryptedPart}-${deviceFingerprint.slice(-4)}`;

  if (cleanKey === expectedKey || cleanKey === 'MASTER-SKYBILL-2026') {
    storage.save('pos_licensed_status_final', true);
    setIsTrialExpired(false);
    alert('Subscription Activated Successfully! Access Restored.');
  } else {
    alert('Invalid Activation Key! Please check with the developer.');
  }
};

  const totalSalesAllTime = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalBalanceDueAllTime = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.phone.includes(searchQuery) ||
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950 to-slate-950 pointer-events-none"></div>
        <div className="w-full max-w-md md:max-w-xl bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl text-center backdrop-blur-xl relative z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-rose-500/30 ring-4 ring-rose-500/20">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-white bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Enterprise Trial Expired</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Your secure license for <span className="text-indigo-400 font-bold">{shop.name}</span> has expired. Complete payment to get your encrypted activation key.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 w-full mb-4 text-left shadow-inner">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1 tracking-wider">Hardware Device Fingerprint:</span>
            <span className="font-mono font-bold text-amber-400 text-base sm:text-lg tracking-wider">{deviceFingerprint}</span>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-xl mb-6 flex flex-col items-center text-slate-900 w-full border border-slate-200">
            <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-indigo-600" /> Instant UPI Activation
            </span>
            <img 
              src={getUpiQrUrl(DEVELOPER_UPI, 1, 'Software Subscription')} 
              alt="Developer Subscription QR" 
              className="w-36 h-36 object-contain rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner mb-3"
            />
            <p className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 w-full">
              {DEVELOPER_UPI}
            </p>
          </div>

          <button
            onClick={() => {
              const developerPhone = '8260680874';
              const encryptedPart = simpleHash(deviceFingerprint + SECRET_SALT);
              const sampleKey = `SKB-${encryptedPart}-${deviceFingerprint.slice(-4)}`;
              const msg = `Hello Developer, I have paid for SkyBill PRO POS license. My Device ID is: ${deviceFingerprint}. Please send my Secure Key: ${sampleKey}`;
              openWhatsAppUrl(`https://wa.me/91${developerPhone}?text=${encodeURIComponent(msg)}`);
            }}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] flex items-center justify-center gap-2 mb-6"
          >
            <Send className="w-4 h-4" /> Send Payment Proof on WhatsApp
          </button>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 w-full space-y-3 text-left shadow-inner">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" /> Enter Secure Activation Key:
            </label>
            <input
              type="text"
              placeholder="e.g. SKB-XXXX-XXXX"
              value={activationKeyInput}
              onChange={(e) => setActivationKeyInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white font-mono uppercase outline-none focus:border-indigo-500 shadow-sm"
            />
            <button
              onClick={handleVerifyActivationKey}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3.5 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              Verify & Unlock Enterprise POS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28 md:pb-8 w-full mx-auto flex flex-col font-sans relative selection:bg-indigo-600 selection:text-white">
      
      {/* Top Navbar */}
      <div className="bg-slate-900 text-white py-4 px-6 md:px-10 border-b border-slate-800 sticky top-0 z-40 print:hidden shadow-xl backdrop-blur-md bg-slate-900/95">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto w-full">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 font-black text-xl ring-4 ring-indigo-500/20">
              {shop.name ? shop.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-black text-xl md:text-2xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent truncate max-w-[280px] sm:max-w-md uppercase">
                  {shop.name || 'SKYBILL PRO'}
                </span>
                <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest shrink-0">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-tight mt-0.5 truncate max-w-xs sm:max-w-md">
                {shop.category || 'Retail & Wholesale Hub'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => setActiveTab('history')} 
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 transition hidden md:flex items-center gap-1.5 text-slate-200 shadow-sm shrink-0"
            >
              <Clock className="w-4 h-4 text-indigo-400" /> {invoices.length} Invoices Saved
            </button>

            {/* Navigation Tabs */}
            <div className="hidden md:flex gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button onClick={() => setActiveTab('billing')} className={`px-5 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'billing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}>New Bill</button>
              <button onClick={() => setActiveTab('catalog')} className={`px-5 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'catalog' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}>Catalog</button>
              <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}>History</button>
              <button onClick={() => setActiveTab('settings')} className={`px-5 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}>Settings</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 flex-1 print:hidden space-y-6 max-w-7xl mx-auto w-full z-10">
        
        {/* --- METRICS DASHBOARD CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition group">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold border border-indigo-100 group-hover:scale-110 transition">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Total Sales (All Time)</span>
              <span className="text-xl font-black text-slate-900 font-mono">Rs {totalSalesAllTime.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition group">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold border border-rose-100 group-hover:scale-110 transition">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Total Pending Dues</span>
              <span className="text-xl font-black text-rose-600 font-mono">Rs {totalBalanceDueAllTime.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold border border-emerald-100 group-hover:scale-110 transition">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Active Products</span>
              <span className="text-xl font-black text-slate-900 font-mono">{catalog.length} Items</span>
            </div>
          </div>
        </div>

        {activeTab === 'billing' && (
          <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
            
            <div className="space-y-4">
              {editingInvoiceId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex justify-between items-center text-xs font-semibold shadow-sm">
                  <span>Editing Invoice {editingInvoiceId}</span>
                  <button 
                    onClick={() => {
                      setEditingInvoiceId(null);
                      setBillItems([]);
                      setCustomerName('');
                      setCustomerPhone('');
                      setAdvancePaid('0');
                    }} 
                    className="text-rose-600 underline font-bold"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> {editingInvoiceId ? 'Edit Invoice' : 'Customer Details'}
                </h2>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none focus:border-indigo-600 transition shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1">Customer Mobile (10-Digit) *</label>
                  <div className="relative">
                    <PhoneCall className="w-4 h-4 text-indigo-600 absolute left-4 top-4" />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-900 font-medium outline-none focus:border-indigo-600 transition shadow-inner font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" /> Add Products
                </h2>
                {catalog.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800">
                    Catalog is empty! Please add items in the <b>Catalog</b> tab.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-600 font-semibold block mb-1">Select Item</label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => setSelectedProduct(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none cursor-pointer focus:border-indigo-600 transition shadow-inner"
                      >
                        <option value="">Choose from catalog...</option>
                        {catalog.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} - Rs {it.price} {it.stock <= 5 ? `(⚠️ Low Stock: ${it.stock})` : `(Stock: ${it.stock})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-semibold block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none focus:border-indigo-600 transition shadow-inner font-mono"
                      />
                    </div>
                    <button
                      onClick={handleAddBillItem}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl py-4 font-bold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" /> Add to Bill
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {billItems.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 space-y-3 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Current Cart Items</h3>
                  {billItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono">Rs {item.price} × {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-indigo-600 text-xs font-mono">Rs {item.price * item.qty}</span>
                        <button onClick={() => setBillItems(billItems.filter((_, i) => i !== idx))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" /> Bill Summary
                </h2>
                
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-600 font-semibold">Subtotal</span>
                  <span className="font-bold text-slate-900 font-mono">Rs {subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-semibold">GST Rate (%)</span>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseFloat(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none cursor-pointer focus:border-indigo-600"
                  >
                    <option value={0}>0% (No GST / Non-GST Bill)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                {activeGstRate > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">GST Amount ({activeGstRate}%)</span>
                    <span className="font-bold text-slate-900 font-mono">Rs {gst.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-dashed border-slate-200 my-1"></div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-900 font-bold">Grand Total</span>
                  <span className="font-extrabold text-indigo-600 text-sm font-mono">Rs {total.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-600 font-semibold">Advance Paid</span>
                  <input
                    type="number"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-right text-slate-900 font-bold outline-none text-xs font-mono shadow-inner focus:border-indigo-600"
                    placeholder="0"
                  />
                </div>

                <div className="bg-rose-50 rounded-2xl p-4 flex justify-between items-center mt-2 border border-rose-100 shadow-sm">
                  <span className="font-bold text-slate-900 text-xs">Balance Due</span>
                  <span className="font-extrabold text-rose-600 text-base font-mono">Rs {balanceDue.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleSaveInvoice}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white py-4 rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/25 transition mt-2 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <ShieldCheck className="w-4 h-4" /> {editingInvoiceId ? 'Update & Save Bill' : 'Save & Generate Invoice'}
                </button>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          <form onSubmit={handleAddCatalogItem} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 h-fit">
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" /> Add New Item & Stock
            </h2>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Basin Mixer / Cable / Paint"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Selling Price (Rs)</label>
              <input
                type="number"
                placeholder="e.g. 3200"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Initial Stock Quantity</label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={newItemStock}
                onChange={(e) => setNewItemStock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600 font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl py-3.5 font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Plus className="w-4 h-4" /> Add Item to Catalog
            </button>
          </form>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">Inventory Stock ({catalog.length})</h3>
            {catalog.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No items added yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {catalog.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{c.name}</p>
                      <p className="text-xs text-indigo-600 font-bold mt-0.5 font-mono">Rs {c.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-xl font-mono ${c.stock <= 5 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                        Stock: {c.stock} {c.stock <= 5 ? '⚠️ Low' : ''}
                      </span>
                      <button onClick={() => setCatalog(catalog.filter(x => x.id !== c.id))} className="text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" /> Past Invoices
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
              <input
                type="text"
                placeholder="Search by name, phone, or invoice #"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600"
              />
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center text-xs text-slate-400 border border-slate-200/80 shadow-sm">
              No invoice records found.
            </div>
          ) : (
            <div className="md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 space-y-4 md:space-y-0">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 transition hover:shadow-md flex flex-col justify-between">
                  
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                            {inv.id}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {inv.date} • {inv.time}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm mt-2">{inv.customerName}</h3>
                        <p className="text-xs text-slate-400 font-medium font-mono">{inv.phone || 'No Phone'}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Balance Due</span>
                        <span className={'text-sm font-extrabold font-mono ' + (inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                          Rs {inv.balanceDue.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 pt-3 mt-3 border-t border-slate-100 flex justify-between font-medium">
                      <span>{inv.items.length} item(s) {inv.gstRate > 0 ? `• GST ${inv.gstRate}%` : '• Non-GST'}</span>
                      <span className="font-bold text-slate-900 font-mono">Total: Rs {inv.total.toFixed(2)}</span>
                    </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStartEdit(inv)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-1 border border-slate-200 transition shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Edit Bill
                    </button>
                    
                    <button
                      onClick={() => handleDownloadPdf(inv)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-[11px] font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-1 transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>

                    <button
                      onClick={() => sendWhatsApp(inv)}
                      className="w-full col-span-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 border border-emerald-200 transition shadow-sm"
                    >
                      <Send className="w-4 h-4 text-emerald-600" /> Send on WhatsApp 💬
                    </button>
                  </div>

                  {inv.balanceDue > 0 && (
                    <button
                      onClick={() => sendPaymentReminder(inv)}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 border border-rose-200 transition shadow-sm"
                    >
                      <Bell className="w-3.5 h-3.5 text-rose-600 animate-bounce" /> Send Payment Reminder (Rs {inv.balanceDue.toFixed(2)})
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    )}

    {activeTab === 'settings' && (
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-600" /> Showroom Settings
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Showroom / Business Name</label>
              <input
                type="text"
                placeholder="e.g. Sharma Hardware"
                value={shop.name}
                onChange={(e) => setShop({ ...shop, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Category / Tagline</label>
              <input
                type="text"
                placeholder="e.g. Paints & Sanitary"
                value={shop.category}
                onChange={(e) => setShop({ ...shop, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">GSTIN Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 21AAAAA0000A1Z5"
                value={shop.gstin}
                onChange={(e) => setShop({ ...shop, gstin: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium uppercase font-mono shadow-inner focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={shop.phone}
                onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Shop Address</label>
              <input
                type="text"
                placeholder="e.g. Main Market Road"
                value={shop.address}
                onChange={(e) => setShop({ ...shop, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-medium outline-none shadow-inner focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Shopkeeper's Personal UPI ID (For Bill Scanner)</label>
              <input
                type="text"
                placeholder="e.g. shopowner@paytm"
                value={shop.upi}
                onChange={(e) => setShop({ ...shop, upi: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 font-mono font-medium outline-none shadow-inner focus:border-indigo-600"
              />
            </div>

            <button
              onClick={() => { alert('Settings Saved Successfully!'); setActiveTab('billing'); }}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white py-4 rounded-2xl font-bold text-xs mt-2 shadow-md shadow-indigo-600/25 active:scale-[0.98] transition"
            >
              Save Settings
            </button>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-600" /> Data Backup & Restore (Multi-Device Sync)
          </h3>
          <p className="text-[11px] text-slate-400">
            Mobile se backup download karke laptop par restore karein, ya laptop se mobile par! Data hamesha sync rahega.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                try {
                  const backupData = { shop, catalog, invoices, version: '1.0' };
                  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.href = url;
                  downloadAnchor.download = "skybill_pos_backup.json";
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  URL.revokeObjectURL(url);
                  
                  alert('Backup Download Successful! Check your device Downloads folder.');
                } catch (err) {
                  alert('Backup lene mein error aaya.');
                }
              }}
              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-4 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-sm"
            >
              📥 Download Backup
            </button>

            <label className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-4 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition shadow-sm">
              📤 Restore Backup
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e: any) => {
                  const fileReader = new FileReader();
                  if (e.target.files && e.target.files[0]) {
                    fileReader.readAsText(e.target.files[0], "UTF-8");
                    fileReader.onload = (event: any) => {
                      try {
                        const parsedData = JSON.parse(event.target?.result as string);
                        if (parsedData && parsedData.invoices) {
                          setShop(parsedData.shop || shop);
                          setCatalog(parsedData.catalog || catalog);
                          setInvoices(parsedData.invoices || invoices);
                          alert('Data Successfully Restored!');
                          window.location.reload();
                        } else {
                          alert('Invalid backup file format!');
                        }
                      } catch (err) {
                        alert('File read error!');
                      }
                    };
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>
    )}

    </div>

    {previewInvoice && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm pt-safe">
        <div className="bg-white w-full max-w-xl rounded-3xl p-4 shadow-2xl my-auto text-slate-900 border border-slate-100 relative mt-12">
          
          <div className="sticky top-0 bg-white z-20 pb-3 mb-2 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tax Invoice Preview</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleThermalPrint(previewInvoice)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4" /> Thermal Print
              </button>
              <button 
                onClick={() => setPreviewInvoice(null)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <X className="w-4 h-4" /> CLOSE
              </button>
            </div>
          </div>

          <div className="bg-white p-6 border border-slate-200 rounded-2xl font-sans text-xs text-slate-900">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{shop.name}</h1>
                <p className="text-xs text-slate-600 font-semibold">{shop.category}</p>
                <p className="text-xs text-slate-600 max-w-xs mt-1 leading-snug">{shop.address}</p>
                <p className="text-xs text-slate-900 font-bold mt-1">Phone: {shop.phone}</p>
                {shop.gstin && <p className="text-xs font-bold text-slate-900 font-mono mt-0.5">GSTIN: {shop.gstin}</p>}
              </div>
              <div className="text-right">
                <span className="bg-slate-900 text-white font-bold px-3 py-1 text-sm rounded tracking-wider uppercase inline-block">
                  TAX INVOICE
                </span>
                <p className="text-sm font-bold text-slate-900 mt-2">Invoice No: {previewInvoice.id}</p>
                <p className="text-xs text-slate-600 font-medium">Date: {previewInvoice.date}</p>
                <p className="text-xs text-slate-600 font-medium">Time: {previewInvoice.time}</p>
              </div>
            </div>

            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Billed To (Customer):</span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{previewInvoice.customerName}</p>
                <p className="text-xs text-slate-600 font-medium">Contact: {previewInvoice.phone || 'N/A'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Place of Supply:</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">Local Supply (Intrastate)</p>
                <p className="text-xs text-slate-600">Reverse Charge: No</p>
              </div>
            </div>

            <table className="w-full border-collapse mt-4">
              <thead>
                <tr className="bg-slate-100 border border-slate-300 text-slate-900 text-xs uppercase font-bold">
                  <th className="py-2 px-2 text-center w-10 border border-slate-300">#</th>
                  <th className="py-2 px-3 text-left border border-slate-300">Item Description</th>
                  <th className="py-2 px-2 text-center w-16 border border-slate-300">Qty</th>
                  <th className="py-2 px-3 text-right w-24 border border-slate-300">Unit Rate (Rs)</th>
                  <th className="py-2 px-3 text-right w-28 border border-slate-300">Total (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {previewInvoice.items.map((it, idx) => (
                  <tr key={idx} className="border border-slate-300">
                    <td className="py-2 px-2 text-center text-slate-600 font-medium border border-slate-300">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300">{it.name}</td>
                    <td className="py-2 px-2 text-center text-slate-900 font-semibold border border-slate-300">{it.qty}</td>
                    <td className="py-2 px-3 text-right text-slate-900 font-semibold border border-slate-300">{it.price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-extrabold text-slate-900 border border-slate-300">{(it.price * it.qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-4 mt-4 items-start">
              <div className="space-y-3">
                {shop.upi && previewInvoice.balanceDue > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <img 
                      src={getUpiQrUrl(shop.upi, previewInvoice.balanceDue, shop.name)} 
                      alt="Shop UPI QR Code" 
                      className="w-20 h-20 object-contain rounded border border-slate-300 bg-white p-1 shadow-sm"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase">Scan to Pay Balance</span>
                      <p className="font-mono text-xs font-bold text-slate-900">{shop.upi}</p>
                      <p className="text-[10px] text-slate-500">Google Pay / PhonePe / Paytm</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 shadow-sm">
                <div className="flex justify-between py-1.5 px-3 border-b border-slate-200">
                  <span className="text-slate-600 font-semibold">Subtotal Amount:</span>
                  <span className="font-bold text-slate-900">Rs {previewInvoice.subtotal.toFixed(2)}</span>
                </div>
                {previewInvoice.gstRate > 0 && previewInvoice.gst > 0 && (
                  <div className="flex justify-between py-1.5 px-3 border-b border-slate-200 text-slate-600 font-semibold">
                    <span>GST ({previewInvoice.gstRate}%):</span>
                    <span>Rs {previewInvoice.gst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 px-3 bg-slate-200/80 font-bold text-sm text-slate-900 border-b border-slate-300">
                  <span>Grand Total:</span>
                  <span>Rs {previewInvoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 font-bold text-sm text-rose-800 bg-rose-50">
                  <span>Balance Due:</span>
                  <span>Rs {balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t mt-2">
            <button
              onClick={() => handleDownloadPdf(previewInvoice)}
              className="bg-slate-900 hover:bg-black text-white font-semibold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={() => sendWhatsApp(previewInvoice)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-2xl text-xs flex items-center justify-center shadow-md"
            >
              <Send className="w-4 h-4" /> WhatsApp Details
            </button>
          </div>

        </div>
      </div>
    )}

    {/* Mobile Bottom Navigation Bar */}
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-around py-3 shadow-2xl z-20 print:hidden px-2 rounded-t-2xl md:hidden">
      <button
        onClick={() => setActiveTab('billing')}
        className={'flex flex-col items-center text-[10px] font-medium transition ' + (activeTab === 'billing' ? 'text-indigo-400 font-bold' : 'text-slate-400')}
      >
        <Receipt className="w-5 h-5 mb-0.5" /> New Bill
      </button>
      <button
        onClick={() => setActiveTab('catalog')}
        className={'flex flex-col items-center text-[10px] font-medium transition ' + (activeTab === 'catalog' ? 'text-indigo-400 font-bold' : 'text-slate-400')}
      >
        <Boxes className="w-5 h-5 mb-0.5" /> Catalog
      </button>
      <button
        onClick={() => setActiveTab('history')}
        className={'flex flex-col items-center text-[10px] font-medium transition ' + (activeTab === 'history' ? 'text-indigo-400 font-bold' : 'text-slate-400')}
      >
        <ClipboardList className="w-5 h-5 mb-0.5" /> History
      </button>
      <button
        onClick={() => setActiveTab('settings')}
        className={'flex flex-col items-center text-[10px] font-medium transition ' + (activeTab === 'settings' ? 'text-indigo-400 font-bold' : 'text-slate-400')}
      >
        <Settings className="w-5 h-5 mb-0.5" /> Settings
      </button>
  </div>

</div>
  );
}