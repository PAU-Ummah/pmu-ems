// src/utils/pdfGenerator.ts
import { Event, Invoice } from "@/types";

export const generateInvoicePDF = (eventData: { event: Event; invoices: Invoice[] }) => {
  // This is a placeholder for PDF generation
  // In a real implementation, you would use a library like jsPDF or react-pdf
  
  const { event, invoices } = eventData;
  
  // Create a simple HTML representation that can be printed
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice Report - ${event.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .event-info { margin-bottom: 20px; }
        .invoice-section { margin-bottom: 30px; page-break-inside: avoid; }
        .invoice-header { background-color: #f5f5f5; padding: 10px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; text-align: right; }
        .summary { background-color: #e8f5e8; padding: 15px; margin-top: 20px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
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
            <h3>Invoice #${invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}</h3>
            <p><strong>Vendor:</strong> ${invoice.vendor || 'N/A'} | <strong>Date:</strong> ${invoice.date}</p>
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
        <p><strong>Total Items:</strong> ${invoices.reduce((sum, inv) => sum + (inv.items?.length || 0), 0)}</p>
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

export const generateCSVData = (eventData: { event: Event; invoices: Invoice[] }) => {
  const { event, invoices } = eventData;
  
  const csvData = invoices.flatMap(invoice => 
    invoice.items?.map(item => ({
      'Event Name': event.name,
      'Event Date': event.date,
      'Invoice Number': invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`,
      'Vendor': invoice.vendor || 'N/A',
      'Invoice Date': invoice.date,
      'Item Description': item.description,
      'Quantity': item.quantity,
      'Unit Price': item.unitPrice,
      'Total Price': item.totalPrice,
      'Notes': invoice.notes || ''
    })) || []
  );
  
  return csvData;
};

export const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  const csvContent = [
    Object.keys(data[0] || {}).join(','),
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
