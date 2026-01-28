import type { CellData, Specification, AppSettings } from '../types';
import { generateRowSKU, extractColumnHeaders } from './sheet-sku';

/**
 * Update SKU for a single row in a data sheet
 * Modifies the data array in place by setting the first column value (index 0)
 */
export function updateRowSKU(
  data: CellData[][],
  rowIndex: number,
  specifications: Specification[],
  settings: AppSettings
): void {
  if (rowIndex === 0 || rowIndex >= data.length) return; // Skip header row

  const row = data[rowIndex];
  if (!row || row.length === 0) return;

  // Get headers from first row (excluding SKU column at index 0)
  const headers = data[0] ? extractColumnHeaders(data[0]) : [];
  if (headers.length === 0) return;

  // Get row values for the spec columns (starting from index 1, skip SKU column)
  const rowValues = row.slice(1, headers.length + 1);

  // Generate SKU
  const sku = generateRowSKU(rowValues, headers, specifications, settings);

  // SKU is always at index 0
  row[0] = { v: sku, m: sku };
}

/**
 * Compare two sheet data arrays and find rows that have changed
 * Returns array of row indices that differ (excluding header row 0)
 */
export function findChangedRows(oldData: CellData[][], newData: CellData[][]): number[] {
  const changedRows: number[] = [];
  const maxRows = Math.max(oldData.length, newData.length);

  for (let rowIndex = 1; rowIndex < maxRows; rowIndex++) {
    const oldRow = oldData[rowIndex];
    const newRow = newData[rowIndex];

    // If rows are different lengths or one doesn't exist, it changed
    if (!oldRow || !newRow || oldRow.length !== newRow.length) {
      changedRows.push(rowIndex);
      continue;
    }

    // Compare cell values (excluding first column which is SKU at index 0)
    // Start from column 1
    for (let colIndex = 1; colIndex < Math.max(oldRow.length, newRow.length); colIndex++) {
      const oldVal = oldRow[colIndex]?.v ?? oldRow[colIndex]?.m ?? '';
      const newVal = newRow[colIndex]?.v ?? newRow[colIndex]?.m ?? '';
      if (String(oldVal).trim() !== String(newVal).trim()) {
        changedRows.push(rowIndex);
        break;
      }
    }
  }

  return changedRows;
}

/**
 * Process all changed rows in a data sheet and update their SKUs
 */
export function processAutoSKU(
  oldData: CellData[][],
  newData: CellData[][],
  specifications: Specification[],
  settings: AppSettings
): void {
  const changedRows = findChangedRows(oldData, newData);
  changedRows.forEach(rowIndex => {
    updateRowSKU(newData, rowIndex, specifications, settings);
  });
}

/**
 * Process all data rows in a sheet and regenerate their SKUs
 * Used after import to ensure all SKUs are generated correctly
 */
export function processAutoSKUForAllRows(
  data: CellData[][],
  specifications: Specification[],
  settings: AppSettings
): void {
  // Process all rows except header (row 0)
  for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
    updateRowSKU(data, rowIndex, specifications, settings);
  }
}
