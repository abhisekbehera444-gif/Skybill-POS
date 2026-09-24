interface Html2PdfOptions {
  margin?: number | number[];
  filename?: string;
  image?: { type?: string; quality?: number };
  html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean };
  jsPDF?: { unit?: string; format?: string | number[]; orientation?: string };
}

declare global {
  interface Window {
    html2pdf: (
      element: HTMLElement,
      options?: Html2PdfOptions,
    ) => Promise<void> & { from: (element: HTMLElement) => { save: (options?: Html2PdfOptions) => Promise<void> } };
  }
}

export {};

export function downloadInvoicePdf(element: HTMLElement, invoiceNumber: number | string) {
  const opt: Html2PdfOptions = {
    margin: [10, 10, 10, 10],
    filename: `Invoice-${invoiceNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };
  return window.html2pdf().from(element).save(opt);
}
