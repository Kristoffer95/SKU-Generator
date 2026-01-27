import type { CellData, ParsedSpec, AppSettings } from '../types';
import { generateRowSKU, extractColumnHeaders } from './sheet-sku';

/**
 * Update SKU for a single row in a data sheet
 * Modifies the data array in place by setting the last column value
 */
export function updateRowSKU(
  data: CellData[][],
  rowIndex: number,
  parsedSpecs: ParsedSpec[],
  settings: AppSettings
): void {
  if (rowIndex === 0 || rowIndex >= data.length) return; // Skip header row

  const row = data[rowIndex];
  if (!row || row.length === 0) return;

  // Get headers from first row (excluding SKU column)
  const headers = data[0] ? extractColumnHeaders(data[0]) : [];
  if (headers.length === 0) return;

  // Get row values for the spec columns (based on header count, not row length)
  // This handles cases where the row might not have the SKU column yet
  const rowValues = row.slice(0, headers.length);

  // Generate SKU
  const sku = generateRowSKU(rowValues, headers, parsedSpecs, settings);

  // Determine SKU column index (last column or headers.length)
  const skuColIndex = headers.length;

  // Ensure row has enough columns
  while (row.length <= skuColIndex) {
    row.push({});
  }

  // Update SKU cell
  row[skuColIndex] = { v: sku, m: sku };
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

    // Compare cell values (excluding last column which is SKU)
    const colCount = Math.max(oldRow.length, newRow.length) - 1;
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
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
  parsedSpecs: ParsedSpec[],
  settings: AppSettings
): void {
  const changedRows = findChangedRows(oldData, newData);
  changedRows.forEach(rowIndex => {
    updateRowSKU(newData, rowIndex, parsedSpecs, settings);
  });
}
