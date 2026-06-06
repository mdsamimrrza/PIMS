const PDFDocument = require('pdfkit');

const M = 48; // Margin
const C = {
  ink: '#0f172a',
  inkMid: '#1e293b',
  teal: '#0d9488',
  tealMid: '#14b8a6',
  slate: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b'
};

const fmt = {
  date: (v) => v ? new Date(v).toLocaleDateString('en-IN') : 'N/A',
  datetime: (v) => v ? new Date(v).toLocaleString('en-IN') : 'N/A',
  currency: (v) => '₹' + (v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
};

const drawHeader = (doc, invoice) => {
  doc.rect(0, 0, doc.page.width, 80).fill(C.ink);
  doc.rect(0, 77, doc.page.width, 3).fill(C.teal);
  
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white).text('PIMS 2.0', M, 25);
  doc.fontSize(10).fillColor(C.tealMid).text('Hospital Management System', M, 50);
  
  doc.fontSize(16).fillColor(C.white).text('PAYMENT RECEIPT', M, 25, { align: 'right' });
  doc.fontSize(9).fillColor(C.muted).text(`Receipt No: #${invoice._id.toString().slice(-8).toUpperCase()}`, M, 50, { align: 'right' });
  doc.y = 100;
};

const drawInfo = (doc, invoice, patient, cashierName) => {
  const y = doc.y;
  const colW = (doc.page.width - M * 2) / 2;
  
  // Left Column: Patient
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text('PATIENT DETAILS', M, y);
  doc.font('Helvetica').fontSize(9).fillColor(C.slate);
  doc.text(`Name: ${patient.firstName} ${patient.lastName}`, M, y + 15);
  doc.text(`UHID: ${patient.uhid || 'N/A'}`, M, y + 30);
  doc.text(`Admission ID: ${invoice.admissionId || 'OPD'}`, M, y + 45);

  // Right Column: Invoice
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text('BILLING DETAILS', M + colW, y);
  doc.font('Helvetica').fontSize(9).fillColor(C.slate);
  doc.text(`Date: ${fmt.datetime(invoice.createdAt)}`, M + colW, y + 15);
  doc.text(`Invoice: ${invoice.invoiceNumber}`, M + colW, y + 30);
  doc.text(`Cashier: ${cashierName}`, M + colW, y + 45);
  
  doc.y = y + 70;
};

const drawItemsTable = (doc, invoice) => {
  const y = doc.y;
  const W = doc.page.width - M * 2;
  const cols = [
    { label: 'Description', w: W * 0.4 },
    { label: 'Category', w: W * 0.2 },
    { label: 'Base', w: W * 0.15, align: 'right' },
    { label: 'GST%', w: W * 0.1, align: 'right' },
    { label: 'Total', w: W * 0.15, align: 'right' }
  ];

  // Table Header
  doc.rect(M, y, W, 20).fill(C.inkMid);
  let x = M;
  cols.forEach(col => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(col.label, x + 5, y + 6, { width: col.w - 10, align: col.align });
    x += col.w;
  });

  doc.y = y + 25;
  doc.fillColor(C.slate).font('Helvetica');

  invoice.items.forEach((item, i) => {
    if (doc.y > doc.page.height - 100) doc.addPage();
    const rowY = doc.y;
    x = M;
    
    // Alt row background
    if (i % 2 === 1) doc.rect(M, rowY - 2, W, 16).fill(C.bg).fillColor(C.slate);

    doc.text(item.description, x + 5, rowY, { width: cols[0].w - 10 });
    x += cols[0].w;
    doc.text(item.category, x + 5, rowY, { width: cols[1].w - 10 });
    x += cols[1].w;
    doc.text(fmt.currency(item.amount), x + 5, rowY, { width: cols[2].w - 10, align: 'right' });
    x += cols[2].w;
    doc.text(`${item.gstRate}%`, x + 5, rowY, { width: cols[3].w - 10, align: 'right' });
    x += cols[3].w;
    doc.text(fmt.currency(item.amount + item.gstAmount), x + 5, rowY, { width: cols[4].w - 10, align: 'right' });
    
    doc.y = rowY + 18;
  });

  doc.moveDown();
};

const drawSummary = (doc, invoice) => {
  const W = doc.page.width - M * 2;
  const sW = 200;
  const x = doc.page.width - M - sW;
  
  doc.strokeColor(C.border).lineWidth(0.5).moveTo(x, doc.y).lineTo(doc.page.width - M, doc.y).stroke();
  doc.y += 10;

  const row = (label, val, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? C.ink : C.slate);
    doc.text(label, x, doc.y, { continued: true });
    doc.text(val, x, doc.y, { align: 'right' });
    doc.y += 15;
  };

  row('Subtotal:', fmt.currency(invoice.subtotal));
  row('GST on Medicines (5%):', fmt.currency(invoice.gst.medicineAmount));
  row('GST on Services (12%):', fmt.currency(invoice.gst.serviceAmount));
  if (invoice.discount > 0) row('Discount:', '-' + fmt.currency(invoice.discount));
  doc.moveDown(0.5);
  row('Grand Total:', fmt.currency(invoice.grandTotal), true);
  
  doc.moveDown();
};

const drawPayments = (doc, invoice) => {
  if (!invoice.payments || invoice.payments.length === 0) return;
  
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink).text('PAYMENT HISTORY', M);
  doc.moveDown(0.5);
  
  const W = doc.page.width - M * 2;
  const rowY = doc.y;
  doc.rect(M, rowY, W, 18).fill(C.bg).fillColor(C.muted).font('Helvetica-Bold').fontSize(8);
  doc.text('Date', M + 5, rowY + 5);
  doc.text('Method', M + 100, rowY + 5);
  doc.text('Reference', M + 200, rowY + 5);
  doc.text('Amount', M, rowY + 5, { align: 'right' });

  doc.y = rowY + 22;
  doc.font('Helvetica').fontSize(8).fillColor(C.slate);

  invoice.payments.forEach(p => {
    const y = doc.y;
    doc.text(fmt.date(p.processedAt), M + 5, y);
    doc.text(p.method.toUpperCase(), M + 100, y);
    doc.text(p.reference || '-', M + 200, y);
    doc.text(fmt.currency(p.amount), M, y, { align: 'right' });
    doc.y = y + 14;
  });

  doc.moveDown();
  
  // Status Banner
  const statusY = doc.y;
  let bannerColor = C.warning;
  let statusText = `Balance Due: ${fmt.currency(invoice.amountDue)}`;
  
  if (invoice.paymentStatus === 'paid') {
    bannerColor = C.success;
    statusText = 'PAID IN FULL';
  } else if (invoice.insurance && invoice.insurance.coveredAmount > 0) {
    statusText += ` (Insurance: ${fmt.currency(invoice.insurance.coveredAmount)} approved)`;
  }

  doc.rect(M, statusY, W, 30).fill(bannerColor);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white).text(statusText, M, statusY + 9, { align: 'center' });
  doc.y = statusY + 50;
};

const generateReceiptPdf = (invoice, patient, cashierName) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: M, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, invoice);
    drawInfo(doc, invoice, patient, cashierName);
    drawItemsTable(doc, invoice);
    drawSummary(doc, invoice);
    drawPayments(doc, invoice);

    // Footer
    doc.fontSize(8).fillColor(C.muted).text('This is a computer-generated receipt. No signature required.', M, doc.page.height - 60, { align: 'center' });
    doc.text('PIMS Hospital Management System  |  +91 123 456 7890  |  billing@pims.com', M, doc.page.height - 45, { align: 'center' });

    doc.end();
  });
};

module.exports = {
  generateReceiptPdf
};
