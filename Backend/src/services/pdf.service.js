const PDFDocument = require('pdfkit');
const { getPrescriptionById } = require('./prescription.service');

// ─────────────────────────────────────────────
//  Errors & Formatters
// ─────────────────────────────────────────────

const notFoundError = () => {
  const err = new Error('Prescription not found');
  err.statusCode = 404;
  return err;
};

const fmt = {
  date: (v) => {
    if (!v) return 'N/A';
    const d = new Date(v);
    return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  datetime: (v) => {
    if (!v) return 'N/A';
    const d = new Date(v);
    return isNaN(d) ? 'N/A' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  list: (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return ['None'];
    return arr.map((v) => String(v ?? '').trim()).filter(Boolean);
  },
  str: (v) => (v == null || v === '' ? 'N/A' : String(v)),
};

// ─────────────────────────────────────────────
//  Design Tokens
// ─────────────────────────────────────────────

const C = {
  teal:        '#0d9488',
  tealDark:    '#0f766e',
  tealLight:   '#ccfbf1',
  tealMid:     '#14b8a6',
  ink:         '#0f172a',
  inkMid:      '#1e293b',
  slate:       '#334155',
  muted:       '#64748b',
  border:      '#e2e8f0',
  borderLight: '#f1f5f9',
  bg:          '#f8fafc',
  bgAccent:    '#f0fdfa',
  white:       '#ffffff',
  urgent:      '#dc2626',
  urgentSoft:  '#fee2e2',
  pending:     '#d97706',
  pendingSoft: '#fef3c7',
  filled:      '#16a34a',
  filledSoft:  '#dcfce7',
  cancelled:   '#6b7280',
  accent:      '#6366f1',
};

const M     = 48;     // page margin
const ROW_H = 20;     // base row height
const FTR_H = 44;     // footer reserved height
const HDR_H = 84;     // full header height
const HDR_C = 52;     // compact header height
const KW    = 150;    // label column width
const KG    = 10;     // gap between label and value

// ─────────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────────

const cw   = (doc) => doc.page.width - M * 2;
const safe = (doc) => doc.page.height - M - FTR_H;

// FIX: Track whether a new page was just added to avoid double-header.
// We do NOT use pageAdded event at all — instead we call newPage() manually
// so we have full control over when headers are drawn.
const newPage = (doc, state) => {
  doc.addPage();
  state.pageNum += 1;
  drawHeader(doc, { compact: true, page: state.pageNum });
};

const guard = (doc, state, need = 60) => {
  if (doc.y + need > safe(doc)) newPage(doc, state);
};

const statusColor = (s = '') => {
  switch (s.toLowerCase()) {
    case 'pending':    return { fg: C.pending,   bg: C.pendingSoft };
    case 'processing': return { fg: C.teal,      bg: C.bgAccent    };
    case 'filled':     return { fg: C.filled,    bg: C.filledSoft  };
    case 'cancelled':  return { fg: C.cancelled, bg: C.borderLight };
    default:           return { fg: C.muted,     bg: C.borderLight };
  }
};

// ─────────────────────────────────────────────
//  Page Header
// ─────────────────────────────────────────────

const drawHeader = (doc, { compact = false, page = 1 } = {}) => {
  const W  = doc.page.width;
  const hH = compact ? HDR_C : HDR_H;

  // Background
  doc.rect(0, 0, W, hH).fill(C.ink);

  // Gradient-like teal band at bottom of header
  doc.rect(0, hH - 3, W, 3).fill(C.teal);

  // Left accent stripe
  doc.rect(0, 0, 5, hH).fill(C.teal);

  if (!compact) {
    // Logo pill
    doc.roundedRect(M, 20, 34, 34, 6).fill(C.teal);
    doc.font('Helvetica-Bold').fontSize(15).fillColor(C.white)
       .text('Rx', M, 30, { width: 34, align: 'center', characterSpacing: 0, lineBreak: false });

    // Title block
    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white)
       .text('PIMS', M + 44, 20, { lineBreak: false });

    // Vertical separator
    doc.strokeColor('#334155').lineWidth(1)
       .moveTo(M + 44 + 46, 22).lineTo(M + 44 + 46, 44).stroke();

    doc.font('Helvetica').fontSize(14).fillColor(C.tealMid)
       .text('Prescription Summary', M + 44 + 54, 22, { lineBreak: false });

    doc.font('Helvetica').fontSize(8).fillColor('#475569')
       .text('Pharmacy Information Management System  •  Confidential Medical Record', M + 44, 46);

    // Confidential badge top-right
    const badgeW = 90;
    doc.roundedRect(W - M - badgeW, 24, badgeW, 18, 4).fill('#1e293b');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#94a3b8')
       .text('CONFIDENTIAL', W - M - badgeW, 30, { width: badgeW, align: 'center', characterSpacing: 0.5, lineBreak: false });

    // Page number below badge
    doc.font('Helvetica').fontSize(8).fillColor('#475569')
       .text(`Page ${page}`, W - M - badgeW, 47, { width: badgeW, align: 'center', lineBreak: false });
  } else {
    // Compact: single line
    doc.roundedRect(M, 14, 20, 20, 3).fill(C.teal);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text('Rx', M, 19, { width: 20, align: 'center', characterSpacing: 0, lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
       .text('PIMS', M + 28, 16, { continued: true });
    doc.font('Helvetica').fontSize(10).fillColor('#94a3b8')
       .text('  —  Prescription Summary (continued)', { lineBreak: false });

    doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
       .text(`Page ${page}`, W - M - 50, 18, { width: 50, align: 'right', lineBreak: false });

    doc.font('Helvetica').fontSize(7.5).fillColor('#334155')
       .text('Pharmacy Information Management System', M + 28, 31);
  }

  doc.y = hH + 20;
};

// ─────────────────────────────────────────────
//  Page Footer
// ─────────────────────────────────────────────

const drawFooter = (doc, rxId, page, total) => {
  const W  = doc.page.width;
  const fY = doc.page.height - M - FTR_H + 8;

  // Top rule
  doc.strokeColor(C.border).lineWidth(0.5)
     .moveTo(M, fY).lineTo(W - M, fY).stroke();

  // Background strip
  doc.rect(M, fY + 1, W - M * 2, FTR_H - 9).fill(C.bg);

  // Rx ID — left
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
     .text('Rx ID', M + 8, fY + 10, { lineBreak: false, continued: true });
  doc.font('Helvetica').fontSize(7.5).fillColor(C.slate)
     .text(`  ${rxId}`, { lineBreak: false });

  // Center — confidential
  doc.font('Helvetica').fontSize(7).fillColor(C.muted)
     .text('— CONFIDENTIAL MEDICAL DOCUMENT —', M, fY + 10, {
       width: W - M * 2, align: 'center', lineBreak: false,
     });

  // Page count — right
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
     .text(`${page} / ${total}`, W - M - 50, fY + 10, {
       width: 50, align: 'right', lineBreak: false,
     });

  // Second row — generated time
  doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
     .text(`Generated  ${fmt.datetime(new Date())}`, M, fY + 24, {
       width: W - M * 2, align: 'center', lineBreak: false,
     });
};

// ─────────────────────────────────────────────
//  Section Header
// ─────────────────────────────────────────────

const drawSection = (doc, state, title) => {
  guard(doc, state, 50);
  doc.moveDown(0.6);
  const y = doc.y;
  const W = cw(doc);

  // Full-width bg bar
  doc.rect(M, y, W, 26).fill(C.inkMid);
  // Left teal accent
  doc.rect(M, y, 4, 26).fill(C.teal);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.tealMid)
     .text(title.toUpperCase(), M + 14, y + 8, {
       characterSpacing: 0.8, lineBreak: false,
     });

  doc.y = y + 34;
};

// ─────────────────────────────────────────────
//  Key / Value Row
// ─────────────────────────────────────────────

const kv = (doc, state, label, value, { color = null, bold = false, highlight = false } = {}) => {
  guard(doc, state, ROW_H + 6);

  const y   = doc.y;
  const W   = cw(doc);
  const vW  = W - KW - KG;
  const val = fmt.str(value);

  // Optional row highlight
  if (highlight) {
    doc.rect(M, y - 2, W, Math.max(ROW_H, doc.heightOfString(val, { width: vW, fontSize: 9 })) + 6)
       .fill(C.bgAccent);
  }

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted)
     .text(label, M, y, { width: KW, lineBreak: false });

  doc.font('Helvetica').fontSize(8.5).fillColor(C.border)
     .text(':', M + KW - 4, y, { lineBreak: false });

  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
     .fillColor(color ?? (bold ? C.inkMid : C.slate))
     .text(val, M + KW + KG, y, { width: vW, lineBreak: true });

  const tH = doc.heightOfString(val, { width: vW, fontSize: 9 });
  doc.y = y + Math.max(ROW_H, tH) + 3;
};

// ─────────────────────────────────────────────
//  Thin Divider
// ─────────────────────────────────────────────

const divider = (doc) => {
  doc.moveDown(0.3);
  doc.strokeColor(C.borderLight).lineWidth(0.5)
     .moveTo(M, doc.y).lineTo(doc.page.width - M, doc.y).stroke();
  doc.moveDown(0.4);
};

// ─────────────────────────────────────────────
//  Meta Bar
// ─────────────────────────────────────────────

const drawMetaBar = (doc, state, items) => {
  guard(doc, state, 66);
  const barH = 52;
  const y    = doc.y;
  const W    = cw(doc);
  const colW = Math.floor(W / items.length);

  // Outer card
  doc.roundedRect(M, y, W, barH, 6).fill(C.bgAccent);
  doc.roundedRect(M, y, W, barH, 6).strokeColor(C.border).lineWidth(0.5).stroke();

  items.forEach(([label, value, opts = {}], i) => {
    const x = M + i * colW;

    // Column separator
    if (i > 0) {
      doc.strokeColor(C.border).lineWidth(0.5)
         .moveTo(x, y + 10).lineTo(x, y + barH - 10).stroke();
    }

    // Label
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.muted)
       .text(label.toUpperCase(), x + 12, y + 10, {
         width: colW - 16, lineBreak: false, characterSpacing: 0.4,
       });

    // Value
    doc.font('Helvetica-Bold').fontSize(11)
       .fillColor(opts.color ?? C.inkMid)
       .text(fmt.str(value), x + 12, y + 24, {
         width: colW - 16, lineBreak: false,
       });
  });

  doc.y = y + barH + 10;
};

// ─────────────────────────────────────────────
//  Horizontal table
// ─────────────────────────────────────────────

const drawHorizontalTable = (doc, state, columns, values) => {
  const rowH   = 26;
  const tableH = rowH * 2;

  guard(doc, state, tableH + 16);

  const y    = doc.y;
  const W    = cw(doc);
  const colW = Math.floor(W / columns.length);

  // Card shell
  doc.roundedRect(M, y, W, tableH, 6).fill(C.white);
  doc.roundedRect(M, y, W, tableH, 6).strokeColor(C.border).lineWidth(0.5).stroke();

  // Header row bg
  doc.roundedRect(M, y, W, rowH, 6).fill(C.bg);
  // Flatten bottom corners of header fill
  doc.rect(M, y + rowH / 2, W, rowH / 2).fill(C.bg);

  // Header/value divider
  doc.strokeColor(C.border).lineWidth(0.5)
     .moveTo(M, y + rowH).lineTo(M + W, y + rowH).stroke();

  columns.forEach((col, i) => {
    const x = M + i * colW;

    if (i > 0) {
      doc.strokeColor(C.border).lineWidth(0.5)
         .moveTo(x, y).lineTo(x, y + tableH).stroke();
    }

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
       .text(String(col || ''), x + 10, y + 8, {
         width: colW - 14, lineBreak: false, characterSpacing: 0.2,
       });

    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.inkMid)
       .text(fmt.str(values[i]), x + 10, y + rowH + 8, {
         width: colW - 14, lineBreak: false,
       });
  });

  doc.y = y + tableH + 12;
};

// ─────────────────────────────────────────────
//  Two-column label/value table
// ─────────────────────────────────────────────

const drawTwoColumnTable = (doc, state, rows) => {
  const rowH   = 26;
  const tableH = rowH * rows.length;

  guard(doc, state, tableH + 14);

  const y      = doc.y;
  const W      = cw(doc);
  const labelW = Math.floor(W * 0.26);

  doc.roundedRect(M, y, W, tableH, 6).fill(C.white);
  doc.roundedRect(M, y, W, tableH, 6).strokeColor(C.border).lineWidth(0.5).stroke();

  rows.forEach(([label, value], index) => {
    const rowY = y + index * rowH;

    if (index > 0) {
      doc.strokeColor(C.borderLight).lineWidth(0.5)
         .moveTo(M, rowY).lineTo(M + W, rowY).stroke();
    }

    // Label bg
    const isFirst  = index === 0;
    const isLast   = index === rows.length - 1;
    doc.rect(M, rowY, labelW, rowH).fill(index % 2 === 0 ? C.bg : C.white);

    // Round left corners on first/last
    if (isFirst) doc.roundedRect(M, rowY, labelW, rowH, 6).fill(C.bg);
    if (isLast)  doc.roundedRect(M, rowY, labelW, rowH / 2 + 6, 0).fill(index % 2 === 0 ? C.bg : C.white);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
       .text(String(label || ''), M + 10, rowY + 8, {
         width: labelW - 14, lineBreak: false,
       });

    doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
       .text(fmt.str(value), M + labelW + 10, rowY + 8, {
         width: W - labelW - 16, lineBreak: false,
       });
  });

  // Vertical separator between label/value columns
  doc.strokeColor(C.border).lineWidth(0.5)
     .moveTo(M + labelW, y).lineTo(M + labelW, y + tableH).stroke();

  doc.y = y + tableH + 14;
};

// ─────────────────────────────────────────────
//  Status Pill(s)
// ─────────────────────────────────────────────

const drawPills = (doc, state, status, isUrgent) => {
  const pills = [];
  if (status) {
    const { fg, bg } = statusColor(status);
    pills.push({ text: status.toUpperCase(), fg, bg });
  }
  if (isUrgent) pills.push({ text: 'URGENT', fg: C.urgent, bg: C.urgentSoft });

  if (!pills.length) return;

  guard(doc, state, 30);

  const y = doc.y;
  let   x = M;

  pills.forEach(({ text, fg, bg }) => {
    const pH = 10;
    const w  = doc.widthOfString(text, { fontSize: 8 }) + pH * 2;
    const h  = 20;

    doc.roundedRect(x, y, w, h, 10).fill(bg);
    doc.roundedRect(x, y, w, h, 10).strokeColor(fg).lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(fg)
       .text(text, x + pH, y + 6, { lineBreak: false });

    x += w + 8;
  });

  doc.y = y + 30;
};

// ─────────────────────────────────────────────
//  Prescription Item Card
// ─────────────────────────────────────────────

const drawItemCard = (doc, state, item, index, total) => {
  const W       = cw(doc);
  const medName = item.medicineId?.name || item.medicineId?.genericName || item.atcCode || 'Unknown Medicine';

  guard(doc, state, 180);

  const cardY = doc.y;

  // ── Card Header ──
  const headerH = 28;
  doc.roundedRect(M, cardY, W, headerH + 6, 8).fill(C.inkMid);
  // Flatten bottom of header
  doc.rect(M, cardY + headerH / 2 + 6, W, headerH / 2).fill(C.inkMid);

  // Index badge
  doc.roundedRect(M + 10, cardY + 7, 26, 16, 4).fill(C.teal);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
     .text(String(index + 1).padStart(2, '0'), M + 10, cardY + 11, {
       width: 26, align: 'center', lineBreak: false,
     });

  // Medicine name
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
     .text(medName, M + 46, cardY + 9, { width: W - 100, lineBreak: false });

  // Item counter (top-right)
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
     .text(`${index + 1} of ${total}`, M + W - 58, cardY + 11, {
       width: 52, align: 'right', lineBreak: false,
     });

  doc.y = cardY + headerH + 16;

  // ── Card Body ──
  kv(doc, state, 'ATC Code',  item.atcCode);
  kv(doc, state, 'Dose',      item.dose,      { bold: true, color: C.teal });
  kv(doc, state, 'Frequency', item.frequency);
  kv(doc, state, 'Route',     item.route);
  kv(doc, state, 'Duration',  item.durationDays ? `${item.durationDays} day(s)` : 'N/A');

  if (item.instructions) {
    guard(doc, state, 30);
    const instructionText = fmt.str(item.instructions);
    const labelY = doc.y;

    // Instruction highlight box
    const instrH = Math.max(ROW_H, doc.heightOfString(instructionText, { width: cw(doc) - KW - KG, fontSize: 9 })) + 10;
    doc.roundedRect(M, labelY - 2, cw(doc), instrH, 4).fill('#fffbeb');
    doc.roundedRect(M, labelY - 2, cw(doc), instrH, 4).strokeColor(C.pendingSoft).lineWidth(0.5).stroke();

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.muted)
       .text('Instructions', M + 6, labelY + 2, { width: KW, lineBreak: false });

    doc.font('Helvetica').fontSize(8.5).fillColor(C.borderLight)
       .text(':', M + KW - 4, labelY + 2, { lineBreak: false });

    doc.font('Helvetica').fontSize(9).fillColor(C.pending)
       .text(instructionText, M + KW + KG, labelY + 2, {
         width: cw(doc) - KW - KG - 4, lineBreak: true,
       });

    doc.y = labelY + instrH + 6;
  }

  // Bottom card border
  const cardEndY = doc.y;
  doc.roundedRect(M, cardY, W, cardEndY - cardY + 8, 8)
     .strokeColor(C.border).lineWidth(0.5).stroke();

  doc.y = cardEndY + 16;
};

// ─────────────────────────────────────────────
//  Buffer
// ─────────────────────────────────────────────

const buildBuffer = (render) =>
  new Promise((resolve, reject) => {
    const doc    = new PDFDocument({
      margin:        M,
      size:          'A4',
      autoFirstPage: true,
      bufferPages:   true,
      info: {
        Title:    'PIMS Prescription Summary',
        Author:   'PIMS — Pharmacy Information Management System',
        Subject:  'Confidential Medical Record',
        Keywords: 'prescription, pims, confidential',
      },
    });

    const chunks = [];
    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    render(doc);

    doc.flushPages();
    const { count } = doc.bufferedPageRange();

    for (let i = 0; i < count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, doc.__rxId || 'N/A', i + 1, count);
    }

    doc.end();
  });

// ─────────────────────────────────────────────
//  Main Export
// ─────────────────────────────────────────────

const generatePrescriptionPdf = async (prescriptionId, actor) => {
  const prescription = await getPrescriptionById(prescriptionId, actor);
  if (!prescription) throw notFoundError();

  const patient = prescription.patientId || {};

  return buildBuffer((doc) => {
    doc.__rxId = prescription.rxId || 'N/A';
    const state = { pageNum: 1 };

    drawHeader(doc, { compact: false, page: 1 });

    // ── Prescription Info ──
    drawSection(doc, state, 'Prescription Information');
    drawMetaBar(doc, state, [
      ['Rx ID',    prescription.rxId],
      ['Status',   prescription.status || 'N/A',  { color: statusColor(prescription.status).fg }],
      ['Priority', prescription.isUrgent ? 'Urgent' : 'Standard', { color: prescription.isUrgent ? C.urgent : C.inkMid }],
      ['Created',  fmt.date(prescription.createdAt)],
    ]);
    drawPills(doc, state, prescription.status, prescription.isUrgent);

    // ── Prescribing Doctor ──
    drawSection(doc, state, 'Prescribing Doctor');
    const doctorName = [prescription.doctorId?.firstName, prescription.doctorId?.lastName]
      .filter(Boolean).join(' ') || 'N/A';
    kv(doc, state, 'Name',  `Dr. ${doctorName}`, { bold: true, color: C.inkMid });
    kv(doc, state, 'Email', prescription.doctorId?.email);

    // ── Patient Information ──
    drawSection(doc, state, 'Patient Information');
    drawHorizontalTable(
      doc, state,
      ['Full Name', 'Patient ID', 'Date of Birth', 'Gender', 'Weight'],
      [
        patient.name,
        patient.patientId,
        fmt.date(patient.dob),
        patient.gender,
        patient.weight != null ? `${patient.weight} kg` : null,
      ]
    );

    const allergies = fmt.list(
      (patient.allergies || []).map((a) => `${a.substance}${a.severity ? ` (${a.severity})` : ''}`)
    );
    drawTwoColumnTable(doc, state, [
      ['Allergies',       allergies.join('  •  ')],
      ['Medical History', fmt.list(patient.medicalHistory).join('  •  ')],
    ]);

    // ── Clinical Details ──
    drawSection(doc, state, 'Clinical Details');
    kv(doc, state, 'Diagnosis',         prescription.diagnosis,         { bold: true, color: C.inkMid });
    kv(doc, state, 'Digital Signature', prescription.digitalSignature);

    // ── Medications ──
    const itemCount = prescription.items.length;
    drawSection(doc, state, `Prescribed Medications  (${itemCount} item${itemCount !== 1 ? 's' : ''})`);
    doc.moveDown(0.3);

    prescription.items.forEach((item, i) => {
      drawItemCard(doc, state, item, i, itemCount);
    });

    // ── Important Notes ──
    drawSection(doc, state, 'Important Notes');
    doc.moveDown(0.3);

    const notes = [
      'Patient portal access details are shared separately through secure invite channels.',
      'This document is auto-generated by PIMS and is only valid when accompanied by a verified digital signature.',
      'For queries, contact the prescribing doctor or the pharmacy team directly.',
    ];

    guard(doc, state, notes.length * 22 + 20);
    const notesY = doc.y;
    const notesH = notes.reduce((acc, n) => acc + doc.heightOfString(`•   ${n}`, { width: cw(doc) - 24, fontSize: 8.5 }) + 8, 0) + 16;

    doc.roundedRect(M, notesY, cw(doc), notesH, 6).fill(C.bgAccent);
    doc.roundedRect(M, notesY, cw(doc), notesH, 6).strokeColor(C.tealLight).lineWidth(0.5).stroke();

    doc.roundedRect(M, notesY, 4, notesH, 2).fill(C.teal);

    doc.y = notesY + 10;
    notes.forEach((note) => {
      guard(doc, state, 22);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
         .text(`•   ${note}`, M + 14, doc.y, {
           width: cw(doc) - 22, lineBreak: true, lineGap: 1,
         });
      doc.moveDown(0.35);
    });

    doc.y += 6;
  });
};

module.exports = {
  generatePrescriptionPdf
};