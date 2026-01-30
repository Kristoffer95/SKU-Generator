import * as XLSX from 'xlsx';
import type { SheetConfig, CellData } from '../types';

/**
 * Convert SheetConfig data to XLSX worksheet
 */
function sheetConfigToWorksheet(sheet: SheetConfig): XLSX.WorkSheet {
  // Convert CellData[][] to simple 2D array of values
  // Boolean values (checkboxes) are converted to strings "TRUE"/"FALSE" for Excel compatibility
  const data: (string | number | null | undefined)[][] = sheet.data.map((row) =>
    row.map((cell) => {
      const value = cell?.v ?? null;
      if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
      }
      return value;
    })
  );

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Convert XLSX worksheet to CellData[][]
 */
function worksheetToSheetData(worksheet: XLSX.WorkSheet): CellData[][] {
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const data: CellData[][] = [];

  for (let row = range.s.r; row <= range.e.r; row++) {
    const rowData: CellData[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];

      if (cell) {
        rowData.push({
          v: cell.v,
          m: String(cell.v ?? ''),
        });
      } else {
        rowData.push({});
      }
    }
    data.push(rowData);
  }

  return data;
}

/**
 * Export all sheets to an Excel workbook file
 * Config sheet is always first, followed by data sheets
 */
export function exportToExcel(sheets: SheetConfig[], filename: string = 'sku-data.xlsx'): void {
  const workbook = XLSX.utils.book_new();

  // Sort sheets: Config first, then data sheets
  const sortedSheets = [...sheets].sort((a, b) => {
    if (a.type === 'config') return -1;
    if (b.type === 'config') return 1;
    return 0;
  });

  for (const sheet of sortedSheets) {
    const worksheet = sheetConfigToWorksheet(sheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  XLSX.writeFile(workbook, filename);
}

/**
 * Export current sheet to CSV format
 */
export function exportToCSV(sheet: SheetConfig, filename?: string): void {
  const worksheet = sheetConfigToWorksheet(sheet);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const csvFilename = filename || `${sheet.name}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = csvFilename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Import Excel workbook and return SheetConfig array
 * If a sheet named "Config" exists, it becomes the config sheet
 * Otherwise all sheets are imported as data sheets
 */
export async function importFromExcel(file: File): Promise<SheetConfig[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: SheetConfig[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = worksheetToSheetData(worksheet);

          // Determine if this is the Config sheet
          const isConfig = sheetName.toLowerCase() === 'config';

          sheets.push({
            id: crypto.randomUUID(),
            name: sheetName,
            type: isConfig ? 'config' : 'data',
            data: sheetData,
            columns: [],
            specifications: [],
          });
        }

        // Ensure Config sheet is first
        sheets.sort((a, b) => {
          if (a.type === 'config') return -1;
          if (b.type === 'config') return 1;
          return 0;
        });

        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate Excel workbook as Blob (for testing or programmatic use)
 */
export function exportToExcelBlob(sheets: SheetConfig[]): Blob {
  const workbook = XLSX.utils.book_new();

  const sortedSheets = [...sheets].sort((a, b) => {
    if (a.type === 'config') return -1;
    if (b.type === 'config') return 1;
    return 0;
  });

  for (const sheet of sortedSheets) {
    const worksheet = sheetConfigToWorksheet(sheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate CSV string from sheet (for testing or programmatic use)
 */
export function sheetToCSVString(sheet: SheetConfig): string {
  const worksheet = sheetConfigToWorksheet(sheet);
  return XLSX.utils.sheet_to_csv(worksheet);
}

/**
 * Import CSV file and return CellData[][] for a single sheet
 * CSV files always become data sheets (not config sheets)
 */
export async function importFromCSV(file: File): Promise<CellData[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const workbook = XLSX.read(text, { type: 'string' });

        // CSV files have only one sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = worksheetToSheetData(worksheet);

        resolve(sheetData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
