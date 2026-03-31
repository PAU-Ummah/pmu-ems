// src/utils/pdfGenerator.ts
import { Event, Invoice } from "@/services/types";

const getLogoUrl = (): string =>
  typeof window !== 'undefined' ? `${window.location.origin}/Logo.png` : '';

export const generateInvoicePDF = (eventData: { event: Event; invoices: Invoice[] }) => {
  // This is a placeholder for PDF generation
  // In a real implementation, you would use a library like jsPDF or react-pdf

  const { event, invoices } = eventData;
  const logoUrl = getLogoUrl();

  // Create a simple HTML representation that can be printed
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice Report - ${event.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; }
        .header { text-align: center; margin-bottom: 30px; }
        .pdf-logo { max-width: 180px; height: auto; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto; }
        .event-info { margin-bottom: 20px; }
        .invoice-section { margin-bottom: 30px; page-break-inside: avoid; }
        .invoice-header { background-color: #f5f5f5; padding: 10px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; text-align: right; }
        .summary { background-color: #e8f5e8; padding: 15px; margin-top: 20px; }
        @media print {
          @page { margin: 18mm 14mm 18mm 25mm; }
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="pdf-logo" />` : ''}
        <h1>PMU EMS - Invoice Report</h1>
        <h2>${event.name}</h2>
      </div>

      <div class="event-info">
        <h3>Event Information</h3>
        <p><strong>Event Name:</strong> ${event.name}</p>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Status:</strong> ${event.isEnded ? 'Ended' : 'Active'}</p>
        <p><strong>Start Time:</strong> ${event.startTime ? new Date(event.startTime).toLocaleString() : 'Not set'}</p>
        ${event.endTime ? `<p><strong>End Time:</strong> ${new Date(event.endTime).toLocaleString()}</p>` : ''}
      </div>
      
      ${invoices.map((invoice) => `
        <div class="invoice-section">
          <div class="invoice-header">
            <h3>Invoice #${invoice.invoiceNumber ?? `INV-${invoice.id?.slice(-6)}`}</h3>
            <p><strong>Vendor:</strong> ${invoice.vendor ?? 'N/A'} | <strong>Date:</strong> ${invoice.date}</p>
            ${
              invoice.attachmentUrl
                ? `<p><strong>Receipt:</strong> <a href="${invoice.attachmentUrl}" target="_blank" rel="noopener noreferrer">Payment receipt</a></p>`
                : ''
            }
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price (₦)</th>
                <th>Total (₦)</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unitPrice.toLocaleString()}</td>
                  <td>${item.totalPrice.toLocaleString()}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No items</td></tr>'}
            </tbody>
            <tfoot>
              <tr class="total">
                <td colspan="3">Invoice Total:</td>
                <td>₦${invoice.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          
          ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        </div>
      `).join('')}
      
      <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Invoices:</strong> ${invoices.length}</p>
        <p><strong>Total Items:</strong> ${invoices.reduce((sum, inv) => sum + (inv.items?.length ?? 0), 0)}</p>
        <p><strong>Total Amount Spent:</strong> ₦${invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}</p>
        <p><strong>Average per Invoice:</strong> ₦${invoices.length > 0 ? Math.round(invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / invoices.length).toLocaleString() : '0'}</p>
      </div>
      
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background-color: #144404; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Print Report
        </button>
      </div>
    </body>
    </html>
  `;
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};

export interface SessionSummaryRow {
  eventName: string;
  date: string;
  attendeeCount: number;
  amountSpent: number;
}

export function generateSessionSummaryPDF(
  sessionName: string,
  rows: SessionSummaryRow[]
): void {
  const tableRows =
    rows.length > 0
      ? rows
          .map(
            (row) => `
    <tr>
      <td>${row.eventName}</td>
      <td>${row.date}</td>
      <td>${row.attendeeCount}</td>
      <td>₦${row.amountSpent.toLocaleString()}</td>
    </tr>
  `
          )
          .join('')
      : '<tr><td colspan="4">No events</td></tr>';

  const totalAttendees = rows.reduce((sum, row) => sum + row.attendeeCount, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.amountSpent, 0);
  const logoUrl = getLogoUrl();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Session Report - ${sessionName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; }
        .header { text-align: center; margin-bottom: 30px; }
        .pdf-logo { max-width: 180px; height: auto; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; text-align: right; }
        .summary { background-color: #e8f5e8; padding: 15px; margin-top: 20px; }
        @media print { @page { margin: 18mm 14mm 18mm 25mm; } body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="pdf-logo" />` : ''}
        <h1>PMU EMS - Session Report</h1>
        <h2>${sessionName}</h2>
        <p>Summary by event (attendee count and amount spent only; no invoices or attendee names)</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Attendees Count</th>
            <th>Amount Spent (₦)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr class="total">
            <td colspan="2">Total</td>
            <td>${totalAttendees}</td>
            <td>₦${totalSpent.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background-color: #144404; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Print / Save as PDF
        </button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

export function generateSessionInvoicesPDF(
  sessionName: string,
  invoices: Invoice[],
  events: Event[]
): void {
  const eventsById = new Map(events.map((eventItem) => [eventItem.id, eventItem]));
  const logoUrl = getLogoUrl();

  const sortedInvoices = [...invoices].sort((firstInvoice, secondInvoice) => {
    const firstEvent = eventsById.get(firstInvoice.eventId);
    const secondEvent = eventsById.get(secondInvoice.eventId);
    const firstName = firstEvent?.name ?? '';
    const secondName = secondEvent?.name ?? '';
    if (firstName < secondName) return -1;
    if (firstName > secondName) return 1;
    return (firstInvoice.date ?? '').localeCompare(secondInvoice.date ?? '');
  });

  const invoicesHtml =
    sortedInvoices.length > 0
      ? sortedInvoices
          .map((invoice) => {
            const event = eventsById.get(invoice.eventId);
            const eventName = event?.name ?? 'Unknown event';
            const receiptLinkHtml = invoice.attachmentUrl
              ? `<p><strong>Receipt:</strong> <a href="${invoice.attachmentUrl}" target="_blank" rel="noopener noreferrer">Payment receipt</a></p>`
              : '<p><strong>Receipt:</strong> —</p>';

            const itemsHtml =
              invoice.items?.map(
                (item) => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.unitPrice.toLocaleString()}</td>
            <td>${item.totalPrice.toLocaleString()}</td>
          </tr>
        `
              ).join('') ?? '<tr><td colspan="4">No items</td></tr>';

            return `
      <div class="invoice-section">
        <div class="invoice-header">
          <h3>${eventName} – Invoice #${invoice.invoiceNumber ?? `INV-${invoice.id?.slice(-6)}`}</h3>
          <p><strong>Vendor:</strong> ${invoice.vendor ?? 'N/A'} | <strong>Date:</strong> ${invoice.date}</p>
          ${receiptLinkHtml}
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price (₦)</th>
              <th>Total (₦)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="3">Invoice Total:</td>
              <td>₦${invoice.totalAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
      </div>
    `;
          })
          .join('')
      : '<p>No invoices for this session.</p>';

  const totalAmount = sortedInvoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Session Invoices - ${sessionName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; }
        .header { text-align: center; margin-bottom: 30px; }
        .pdf-logo { max-width: 180px; height: auto; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto; }
        .invoice-section { margin-bottom: 30px; page-break-inside: avoid; }
        .invoice-header { background-color: #f5f5f5; padding: 10px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; text-align: right; }
        .summary { background-color: #e8f5e8; padding: 15px; margin-top: 20px; }
        @media print { @page { margin: 18mm 14mm 18mm 25mm; } body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="pdf-logo" />` : ''}
        <h1>PMU EMS - Session Invoices</h1>
        <h2>${sessionName}</h2>
      </div>
      ${invoicesHtml}
      <div class="summary">
        <h3>Session Invoice Summary</h3>
        <p><strong>Total invoices:</strong> ${sortedInvoices.length}</p>
        <p><strong>Total amount spent:</strong> ₦${totalAmount.toLocaleString()}</p>
      </div>
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background-color: #144404; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Print / Save as PDF
        </button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

export const generateCSVData = (eventData: { event: Event; invoices: Invoice[] }) => {
  const { event, invoices } = eventData;
  
  const csvData = invoices.flatMap(invoice => 
    invoice.items?.map(item => ({
      'Event Name': event.name,
      'Event Date': event.date,
      'Invoice Number': invoice.invoiceNumber ?? `INV-${invoice.id?.slice(-6)}`,
      'Vendor': invoice.vendor ?? 'N/A',
      'Invoice Date': invoice.date,
      'Item Description': item.description,
      'Quantity': item.quantity,
      'Unit Price': item.unitPrice,
      'Total Price': item.totalPrice,
      'Notes': invoice.notes ?? ''
    })) ?? []
  );
  
  return csvData;
};

export const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  const csvContent = [
    Object.keys(data[0] ?? {}).join(','),
    ...data.map(row => Object.values(row).map(value => 
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
