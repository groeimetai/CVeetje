/**
 * Generate a set of test templates (3× PDF, 3× DOCX) for the template-fill flow.
 *
 *   npx tsx scripts/generate-test-templates.mjs
 *
 * Output goes to ./test-templates/. Six varianten:
 *   pdf-flat-simple.pdf            — minimaal flat PDF, label + colon + lege regel
 *   pdf-flat-twocolumn.pdf         — sidebar + main column, photo placeholder, experience rijen
 *   pdf-acroform.pdf               — interactive AcroForm fields (firstName, lastName, …)
 *   docx-label-value.docx          — paragraph-based "Naam: …" templates
 *   docx-table-experience.docx     — werkervaring in een tabel met 3 rijen
 *   docx-recruiter-mixed.docx      — header + tabellen + tab-separated entries
 *
 * Templates zijn opzettelijk leeg — alleen labels/placeholders — zodat de AI-fill
 * de leegtes moet detecteren en invullen op basis van profielinhoud.
 */

import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} from 'docx';

const OUT_DIR = path.resolve('test-templates');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ════════════════════════════════════════════════════════════════════════
// PDF #1 — flat-simple: labels + colons + lege regels
// ════════════════════════════════════════════════════════════════════════
async function buildPdfFlatSimple() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const left = 50;
  const rightCol = 200;
  const lineLen = 340;
  const drawLabel = (label, opts = {}) => {
    page.drawText(label, { x: left, y, size: 11, font: helvBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawLine({
      start: { x: rightCol, y: y - 2 },
      end: { x: rightCol + lineLen, y: y - 2 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= opts.gap ?? 28;
  };

  page.drawText('CURRICULUM VITAE', { x: left, y, size: 18, font: helvBold });
  y -= 40;

  page.drawText('Persoonsgegevens', { x: left, y, size: 13, font: helvBold });
  y -= 22;
  drawLabel('Naam:');
  drawLabel('Geboortedatum:');
  drawLabel('Nationaliteit:');
  drawLabel('Woonplaats:');
  drawLabel('Telefoon:');
  drawLabel('E-mail:');

  y -= 10;
  page.drawText('Werkervaring', { x: left, y, size: 13, font: helvBold });
  y -= 22;
  for (let i = 0; i < 3; i++) {
    drawLabel(`Periode ${i + 1}:`);
    drawLabel(`Functie ${i + 1}:`);
    drawLabel(`Werkgever ${i + 1}:`, { gap: 60 });
  }

  y -= 10;
  page.drawText('Opleiding', { x: left, y, size: 13, font: helvBold });
  y -= 22;
  for (let i = 0; i < 2; i++) {
    drawLabel(`Periode ${i + 1}:`);
    drawLabel(`Opleiding ${i + 1}:`);
    drawLabel(`School ${i + 1}:`, { gap: 40 });
  }

  return doc.save();
}

// ════════════════════════════════════════════════════════════════════════
// PDF #2 — twee-koloms layout met sidebar + foto-slot + experience-rijen
// ════════════════════════════════════════════════════════════════════════
async function buildPdfTwoColumn() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Dark sidebar background
  page.drawRectangle({ x: 0, y: 0, width: 200, height: 842, color: rgb(0.13, 0.16, 0.22) });

  // Photo placeholder (white box in sidebar)
  page.drawRectangle({
    x: 40,
    y: 660,
    width: 120,
    height: 140,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
  });
  page.drawText('foto', { x: 88, y: 723, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });

  // Sidebar headers + empty lines
  let sy = 620;
  const sidebarLabel = (txt) => {
    page.drawText(txt, { x: 30, y: sy, size: 10, font: helvBold, color: rgb(1, 1, 1) });
    sy -= 14;
    page.drawLine({ start: { x: 30, y: sy }, end: { x: 170, y: sy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    sy -= 22;
  };
  sidebarLabel('NAAM');
  sidebarLabel('FUNCTIE');
  sidebarLabel('E-MAIL');
  sidebarLabel('TELEFOON');
  sidebarLabel('WOONPLAATS');
  sidebarLabel('GEBOORTEDATUM');

  page.drawText('VAARDIGHEDEN', { x: 30, y: sy, size: 10, font: helvBold, color: rgb(1, 1, 1) });
  sy -= 18;
  for (let i = 0; i < 6; i++) {
    page.drawLine({ start: { x: 30, y: sy }, end: { x: 170, y: sy }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    sy -= 18;
  }

  // Main column
  let my = 800;
  page.drawText('CURRICULUM VITAE', { x: 230, y: my, size: 22, font: helvBold });
  my -= 50;

  page.drawText('PROFIEL', { x: 230, y: my, size: 13, font: helvBold });
  my -= 18;
  for (let i = 0; i < 4; i++) {
    page.drawLine({ start: { x: 230, y: my }, end: { x: 560, y: my }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 16;
  }

  my -= 12;
  page.drawText('WERKERVARING', { x: 230, y: my, size: 13, font: helvBold });
  my -= 22;
  for (let i = 0; i < 3; i++) {
    // Period
    page.drawText('Periode:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 280, y: my - 2 }, end: { x: 400, y: my - 2 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 14;
    // Title
    page.drawText('Functie:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 280, y: my - 2 }, end: { x: 560, y: my - 2 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 14;
    // Company
    page.drawText('Bedrijf:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 280, y: my - 2 }, end: { x: 560, y: my - 2 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 14;
    // Description (multi-line box)
    page.drawText('Werkzaamheden:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawRectangle({ x: 230, y: my - 60, width: 330, height: 55, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.4, color: rgb(1, 1, 1) });
    my -= 78;
  }

  my -= 12;
  page.drawText('OPLEIDING', { x: 230, y: my, size: 13, font: helvBold });
  my -= 20;
  for (let i = 0; i < 2; i++) {
    page.drawText('Periode:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 280, y: my - 2 }, end: { x: 400, y: my - 2 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 14;
    page.drawText('Opleiding:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 290, y: my - 2 }, end: { x: 560, y: my - 2 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 14;
    page.drawText('School:', { x: 230, y: my, size: 9, font: helvBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawLine({ start: { x: 290, y: my - 2 }, end: { x: 560, y: my - 2 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    my -= 24;
  }

  return doc.save();
}

// ════════════════════════════════════════════════════════════════════════
// PDF #3 — AcroForm met interactieve velden
// ════════════════════════════════════════════════════════════════════════
async function buildPdfAcroForm() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();

  let y = 800;
  page.drawText('CV — Recruiter intake', { x: 50, y, size: 18, font: helvBold });
  y -= 40;

  const addField = (label, name, opts = {}) => {
    page.drawText(label, { x: 50, y, size: 10, font: helvBold });
    const field = form.createTextField(name);
    field.addToPage(page, {
      x: 200,
      y: y - 4,
      width: opts.width ?? 350,
      height: opts.height ?? 18,
      borderWidth: 0.5,
      borderColor: rgb(0.7, 0.7, 0.7),
    });
    if (opts.multiline) field.enableMultiline();
    y -= (opts.height ?? 18) + 12;
  };

  page.drawText('Persoonsgegevens', { x: 50, y, size: 12, font: helvBold });
  y -= 22;
  addField('Voornaam', 'firstName');
  addField('Achternaam', 'lastName');
  addField('E-mail', 'email');
  addField('Telefoon', 'phone');
  addField('Woonplaats', 'city');
  addField('Geboortedatum', 'birthDate');

  y -= 8;
  page.drawText('Werkervaring', { x: 50, y, size: 12, font: helvBold });
  y -= 22;
  for (let i = 1; i <= 3; i++) {
    addField(`Functie ${i}`, `jobtitle${i}`);
    addField(`Bedrijf ${i}`, `company${i}`);
    addField(`Periode ${i}`, `period${i}`);
    addField(`Werkzaamheden ${i}`, `description${i}`, { height: 50, multiline: true });
    y -= 4;
  }

  return doc.save();
}

// ════════════════════════════════════════════════════════════════════════
// DOCX helpers
// ════════════════════════════════════════════════════════════════════════
const blank = (width = 60) => '_'.repeat(width);

function noBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };
}

// ════════════════════════════════════════════════════════════════════════
// DOCX #1 — label : value paragraphs (S4Y-style)
// ════════════════════════════════════════════════════════════════════════
function buildDocxLabelValue() {
  const labelValue = (label) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${label} : `, bold: true }),
        new TextRun({ text: '' }),
      ],
    });

  const sectionHeader = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true })],
    });

  const doc = new Document({
    creator: 'CVeetje test-template generator',
    title: 'Recruiter CV template — label:value',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'CURRICULUM VITAE', bold: true })],
          }),
          sectionHeader('Persoonsgegevens'),
          labelValue('Naam'),
          labelValue('Geboortedatum'),
          labelValue('Nationaliteit'),
          labelValue('Woonplaats'),
          labelValue('Telefoon'),
          labelValue('E-mail'),
          sectionHeader('Werkervaring'),
          ...Array.from({ length: 3 }, (_, i) => [
            labelValue(`Periode ${i + 1}`),
            labelValue(`Functie ${i + 1}`),
            labelValue(`Werkgever ${i + 1}`),
            labelValue(`Werkzaamheden ${i + 1}`),
            new Paragraph({ children: [new TextRun('')] }),
          ]).flat(),
          sectionHeader('Opleiding'),
          ...Array.from({ length: 2 }, (_, i) => [
            labelValue(`Periode ${i + 1}`),
            labelValue(`Opleiding ${i + 1}`),
            labelValue(`School ${i + 1}`),
            new Paragraph({ children: [new TextRun('')] }),
          ]).flat(),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ════════════════════════════════════════════════════════════════════════
// DOCX #2 — werkervaring in een table met 3 rijen
// ════════════════════════════════════════════════════════════════════════
function buildDocxTable() {
  const cell = (text, opts = {}) =>
    new TableCell({
      width: { size: opts.width ?? 25, type: WidthType.PERCENTAGE },
      borders: opts.noBorder ? noBorder() : undefined,
      children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell('Periode', { bold: true, width: 20 }),
      cell('Functie', { bold: true, width: 25 }),
      cell('Bedrijf', { bold: true, width: 25 }),
      cell('Werkzaamheden', { bold: true, width: 30 }),
    ],
  });

  const dataRows = Array.from({ length: 3 }, () =>
    new TableRow({
      children: [
        cell('', { width: 20 }),
        cell('', { width: 25 }),
        cell('', { width: 25 }),
        cell('', { width: 30 }),
      ],
    }),
  );

  const eduHeader = new TableRow({
    tableHeader: true,
    children: [
      cell('Periode', { bold: true, width: 20 }),
      cell('Opleiding', { bold: true, width: 40 }),
      cell('School', { bold: true, width: 40 }),
    ],
  });

  const eduRows = Array.from({ length: 2 }, () =>
    new TableRow({
      children: [
        cell('', { width: 20 }),
        cell('', { width: 40 }),
        cell('', { width: 40 }),
      ],
    }),
  );

  const doc = new Document({
    creator: 'CVeetje test-template generator',
    title: 'Recruiter CV template — table',
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Curriculum Vitae', bold: true })],
          }),
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Persoonsgegevens', bold: true, size: 28 })],
          }),
          new Paragraph({ children: [new TextRun({ text: 'Naam: ', bold: true }), new TextRun('')] }),
          new Paragraph({ children: [new TextRun({ text: 'E-mail: ', bold: true }), new TextRun('')] }),
          new Paragraph({ children: [new TextRun({ text: 'Telefoon: ', bold: true }), new TextRun('')] }),
          new Paragraph({ children: [new TextRun({ text: 'Woonplaats: ', bold: true }), new TextRun('')] }),
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Werkervaring', bold: true, size: 28 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Opleiding', bold: true, size: 28 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [eduHeader, ...eduRows],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ════════════════════════════════════════════════════════════════════════
// DOCX #3 — mixed recruiter template: header + tab-separated + tabel
// ════════════════════════════════════════════════════════════════════════
function buildDocxMixed() {
  const tabbedLabel = (label) =>
    new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: TabStopPosition.MAX / 3 }],
      children: [
        new TextRun({ text: label, bold: true }),
        new TextRun({ text: '\t' }),
        new TextRun(''),
      ],
    });

  const cell = (text, opts = {}) =>
    new TableCell({
      width: { size: opts.width ?? 33, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
    });

  const doc = new Document({
    creator: 'CVeetje test-template generator',
    title: 'Recruiter CV template — mixed',
    sections: [
      {
        children: [
          // Header table: foto-slot + naam
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: noBorder(),
                    children: [new Paragraph({ children: [new TextRun({ text: '[foto]', italics: true, color: '888888' })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: noBorder(),
                    children: [
                      new Paragraph({ children: [new TextRun({ text: '', bold: true, size: 36 })] }),
                      new Paragraph({ children: [new TextRun({ text: '', italics: true, size: 22 })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Contactgegevens', bold: true, size: 28 })],
          }),
          tabbedLabel('E-mail'),
          tabbedLabel('Telefoon'),
          tabbedLabel('Woonplaats'),
          tabbedLabel('Geboortedatum'),
          tabbedLabel('Nationaliteit'),

          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Werkervaring', bold: true, size: 28 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  cell('Periode', { bold: true, width: 25 }),
                  cell('Functie & Bedrijf', { bold: true, width: 35 }),
                  cell('Werkzaamheden', { bold: true, width: 40 }),
                ],
              }),
              ...Array.from({ length: 4 }, () =>
                new TableRow({
                  children: [
                    cell('', { width: 25 }),
                    cell('', { width: 35 }),
                    cell('', { width: 40 }),
                  ],
                }),
              ),
            ],
          }),

          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Opleiding', bold: true, size: 28 })],
          }),
          ...Array.from({ length: 2 }, () => [
            tabbedLabel('Periode'),
            tabbedLabel('Opleiding'),
            tabbedLabel('School'),
            new Paragraph({ children: [new TextRun('')] }),
          ]).flat(),

          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Vaardigheden', bold: true, size: 28 })],
          }),
          new Paragraph({ children: [new TextRun('• ')] }),
          new Paragraph({ children: [new TextRun('• ')] }),
          new Paragraph({ children: [new TextRun('• ')] }),
          new Paragraph({ children: [new TextRun('• ')] }),

          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: 'Talen', bold: true, size: 28 })],
          }),
          tabbedLabel('Taal 1'),
          tabbedLabel('Taal 2'),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ════════════════════════════════════════════════════════════════════════
// Run
// ════════════════════════════════════════════════════════════════════════
async function run() {
  const writes = [
    ['pdf-flat-simple.pdf', await buildPdfFlatSimple()],
    ['pdf-flat-twocolumn.pdf', await buildPdfTwoColumn()],
    ['pdf-acroform.pdf', await buildPdfAcroForm()],
    ['docx-label-value.docx', await buildDocxLabelValue()],
    ['docx-table-experience.docx', await buildDocxTable()],
    ['docx-recruiter-mixed.docx', await buildDocxMixed()],
  ];

  for (const [name, bytes] of writes) {
    const target = path.join(OUT_DIR, name);
    fs.writeFileSync(target, bytes);
    console.log(`✓ ${target} (${bytes.byteLength.toLocaleString()} bytes)`);
  }

  console.log(`\nDone. ${writes.length} templates in ${OUT_DIR}/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
