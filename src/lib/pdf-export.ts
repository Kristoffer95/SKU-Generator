import { jsPDF } from 'jspdf';
import autoTable, { CellDef, RowInput, UserOptions } from 'jspdf-autotable';
import type { SheetConfig, CellData, CellTextAlign } from '../types';

/**
 * RGB color tuple for jspdf-autotable
 */
type RGBColor = [number, number, number];

/**
 * Convert hex color string to RGB tuple
 * Supports formats: #RGB, #RRGGBB, RGB, RRGGBB
 */
export function hexToRGB(hex: string): RGBColor | null {
  // Remove leading # if present
  const cleanHex = hex.replace(/^#/, '');

  let r: number, g: number, b: number;

  if (cleanHex.length === 3) {
    // Short format: #RGB -> #RRGGBB
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    // Full format: #RRGGBB
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  } else {
    return null;
  }

  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return [r, g, b];
}

/**
 * Map CellTextAlign to jspdf-autotable HAlignType
 */
function mapAlignment(align?: CellTextAlign): 'left' | 'center' | 'right' {
  return align || 'left';
}

/**
 * Map CellData formatting to jspdf-autotable font style
 */
function mapFontStyle(cell: CellData): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  if (cell.bold && cell.italic) {
    return 'bolditalic';
  } else if (cell.bold) {
    return 'bold';
  } else if (cell.italic) {
    return 'italic';
  }
  return 'normal';
}

/**
 * Convert CellData to jspdf-autotable CellDef with styling
 */
function cellDataToCellDef(cell: CellData | null | undefined): CellDef {
  if (!cell) {
    return { content: '' };
  }

  const cellDef: CellDef = {
    content: cell.v != null ? String(cell.v) : '',
    styles: {},
  };

  // Apply background color
  if (cell.bg) {
    const rgb = hexToRGB(cell.bg);
    if (rgb) {
      cellDef.styles!.fillColor = rgb;
    }
  }

  // Apply text color
  if (cell.fc) {
    const rgb = hexToRGB(cell.fc);
    if (rgb) {
      cellDef.styles!.textColor = rgb;
    }
  }

  // Apply font style (bold/italic)
  cellDef.styles!.fontStyle = mapFontStyle(cell);

  // Apply alignment
  cellDef.styles!.halign = mapAlignment(cell.align);

  return cellDef;
}

/**
 * Convert SheetConfig data to jspdf-autotable body rows
 * Preserves all cell formatting (colors, bold, italic, alignment)
 */
function sheetDataToTableRows(data: CellData[][]): RowInput[] {
  return data.map((row) => row.map((cell) => cellDataToCellDef(cell)));
}

/**
 * PDF export options
 */
export interface PDFExportOptions {
  /** Paper orientation: 'portrait' or 'landscape' */
  orientation?: 'portrait' | 'landscape';
  /** Paper size */
  format?: 'a4' | 'letter' | 'legal';
  /** Page margins */
  margin?: number;
  /** Font size for table content */
  fontSize?: number;
  /** Include sheet name as header */
  includeSheetName?: boolean;
}

const DEFAULT_OPTIONS: Required<PDFExportOptions> = {
  orientation: 'landscape',
  format: 'a4',
  margin: 10,
  fontSize: 10,
  includeSheetName: true,
};

/**
 * Export a single sheet to PDF and trigger download
 */
export function exportToPDF(
  sheet: SheetConfig,
  filename?: string,
  options?: PDFExportOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pdfFilename = filename || `${sheet.name}.pdf`;

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });

  // Add sheet name as header if enabled
  if (opts.includeSheetName) {
    doc.setFontSize(14);
    doc.text(sheet.name, opts.margin, opts.margin + 5);
  }

  // Convert sheet data to table rows
  const tableRows = sheetDataToTableRows(sheet.data);

  // Separate header row (first row) from body rows
  const head = tableRows.length > 0 ? [tableRows[0]] : [];
  const body = tableRows.slice(1);

  const tableOptions: UserOptions = {
    head,
    body,
    startY: opts.includeSheetName ? opts.margin + 12 : opts.margin,
    margin: opts.margin,
    styles: {
      fontSize: opts.fontSize,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    theme: 'grid',
  };

  autoTable(doc, tableOptions);

  // Trigger download
  doc.save(pdfFilename);
}

/**
 * Export all sheets to a single PDF with one page per sheet
 */
export function exportAllSheetsToPDF(
  sheets: SheetConfig[],
  filename: string = 'sku-data.pdf',
  options?: PDFExportOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });

  sheets.forEach((sheet, index) => {
    // Add new page for each sheet after the first
    if (index > 0) {
      doc.addPage();
    }

    // Add sheet name as header
    if (opts.includeSheetName) {
      doc.setFontSize(14);
      doc.text(sheet.name, opts.margin, opts.margin + 5);
    }

    // Convert sheet data to table rows
    const tableRows = sheetDataToTableRows(sheet.data);

    // Separate header row (first row) from body rows
    const head = tableRows.length > 0 ? [tableRows[0]] : [];
    const body = tableRows.slice(1);

    const tableOptions: UserOptions = {
      head,
      body,
      startY: opts.includeSheetName ? opts.margin + 12 : opts.margin,
      margin: opts.margin,
      styles: {
        fontSize: opts.fontSize,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      theme: 'grid',
    };

    autoTable(doc, tableOptions);
  });

  // Trigger download
  doc.save(filename);
}

/**
 * Generate PDF as Blob for a single sheet (for testing or programmatic use)
 */
export function exportToPDFBlob(
  sheet: SheetConfig,
  options?: PDFExportOptions
): Blob {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });

  // Add sheet name as header if enabled
  if (opts.includeSheetName) {
    doc.setFontSize(14);
    doc.text(sheet.name, opts.margin, opts.margin + 5);
  }

  // Convert sheet data to table rows
  const tableRows = sheetDataToTableRows(sheet.data);

  // Separate header row (first row) from body rows
  const head = tableRows.length > 0 ? [tableRows[0]] : [];
  const body = tableRows.slice(1);

  const tableOptions: UserOptions = {
    head,
    body,
    startY: opts.includeSheetName ? opts.margin + 12 : opts.margin,
    margin: opts.margin,
    styles: {
      fontSize: opts.fontSize,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    theme: 'grid',
  };

  autoTable(doc, tableOptions);

  return doc.output('blob');
}

/**
 * Generate PDF as Blob for all sheets (for testing or programmatic use)
 */
export function exportAllSheetsToPDFBlob(
  sheets: SheetConfig[],
  options?: PDFExportOptions
): Blob {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.format,
  });

  sheets.forEach((sheet, index) => {
    // Add new page for each sheet after the first
    if (index > 0) {
      doc.addPage();
    }

    // Add sheet name as header
    if (opts.includeSheetName) {
      doc.setFontSize(14);
      doc.text(sheet.name, opts.margin, opts.margin + 5);
    }

    // Convert sheet data to table rows
    const tableRows = sheetDataToTableRows(sheet.data);

    // Separate header row (first row) from body rows
    const head = tableRows.length > 0 ? [tableRows[0]] : [];
    const body = tableRows.slice(1);

    const tableOptions: UserOptions = {
      head,
      body,
      startY: opts.includeSheetName ? opts.margin + 12 : opts.margin,
      margin: opts.margin,
      styles: {
        fontSize: opts.fontSize,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      theme: 'grid',
    };

    autoTable(doc, tableOptions);
  });

  return doc.output('blob');
}
