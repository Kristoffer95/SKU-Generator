import type { CellData, Specification, AppSettings, ColumnDef } from '../types';
import { generateRowSKU, generateRowSKUFromColumns } from './sheet-sku';

/**
 * Update SKU for a single row in a data sheet using column definitions
 * Modifies the data array in place by setting the SKU column value
 * Only 'spec' type columns contribute to SKU generation
 */
export function updateRowSKUFromColumns(
  data: CellData[][],
  rowIndex: number,
  columns: ColumnDef[],
  specifications: Specification[],
  settings: AppSettings
): void {
  // All rows are data rows now - no header row in data array
  if (rowIndex < 0 || rowIndex >= data.length) return;

  const row = data[rowIndex];
  if (!row || row.length === 0) return;

  // Find the SKU column index
  const skuColumnIndex = columns.findIndex(col => col.type === 'sku');
  if (skuColumnIndex === -1) return; // No SKU column

  // Generate SKU using column definitions (only spec columns contribute)
  const sku = generateRowSKUFromColumns(row, columns, specifications, settings);

  // Set SKU value at the SKU column index
  row[skuColumnIndex] = { v: sku, m: sku };
}

/**
 * Update SKU for a single row in a data sheet
 * @deprecated Use updateRowSKUFromColumns with columns for proper column type handling
 * Modifies the data array in place by setting the first column value (index 0)
 */
export function updateRowSKU(
  data: CellData[][],
  rowIndex: number,
  specifications: Specification[],
  settings: AppSettings,
  headers?: string[]
): void {
  // All rows are data rows now - no header row in data array
  if (rowIndex < 0 || rowIndex >= data.length) return;

  const row = data[rowIndex];
  if (!row || row.length === 0) return;

  // Headers must be passed in (no longer in data[0])
  const columnHeaders = headers ?? [];
  if (columnHeaders.length === 0) return;

  // Get row values for the spec columns (starting from index 1, skip SKU column)
  const rowValues = row.slice(1, columnHeaders.length + 1);

  // Generate SKU
  const sku = generateRowSKU(rowValues, columnHeaders, specifications, settings);

  // SKU is always at index 0
  row[0] = { v: sku, m: sku };
}

/**
 * Compare two sheet data arrays and find rows that have changed
 * Uses column definitions to determine which columns to compare (excludes SKU columns)
 * Returns array of row indices that differ (all rows are data rows)
 */
export function findChangedRowsFromColumns(
  oldData: CellData[][],
  newData: CellData[][],
  columns: ColumnDef[]
): number[] {
  const changedRows: number[] = [];
  const maxRows = Math.max(oldData.length, newData.length);

  // All rows are data rows now - start from 0
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    const oldRow = oldData[rowIndex];
    const newRow = newData[rowIndex];

    // If rows are different lengths or one doesn't exist, it changed
    if (!oldRow || !newRow || oldRow.length !== newRow.length) {
      changedRows.push(rowIndex);
      continue;
    }

    // Compare cell values, excluding SKU columns
    for (let colIndex = 0; colIndex < Math.max(oldRow.length, newRow.length); colIndex++) {
      const columnDef = columns[colIndex];
      // Skip SKU columns - they are auto-generated
      if (columnDef?.type === 'sku') continue;

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
 * Compare two sheet data arrays and find rows that have changed
 * @deprecated Use findChangedRowsFromColumns with columns for proper column type handling
 * Returns array of row indices that differ (all rows are data rows)
 */
export function findChangedRows(oldData: CellData[][], newData: CellData[][]): number[] {
  const changedRows: number[] = [];
  const maxRows = Math.max(oldData.length, newData.length);

  // All rows are data rows now - start from 0
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
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
 * Uses column definitions for proper column type handling
 */
export function processAutoSKUFromColumns(
  oldData: CellData[][],
  newData: CellData[][],
  columns: ColumnDef[],
  specifications: Specification[],
  settings: AppSettings
): void {
  const changedRows = findChangedRowsFromColumns(oldData, newData, columns);
  changedRows.forEach(rowIndex => {
    updateRowSKUFromColumns(newData, rowIndex, columns, specifications, settings);
  });
}

/**
 * Process all changed rows in a data sheet and update their SKUs
 * @deprecated Use processAutoSKUFromColumns with columns for proper column type handling
 */
export function processAutoSKU(
  oldData: CellData[][],
  newData: CellData[][],
  specifications: Specification[],
  settings: AppSettings,
  headers?: string[]
): void {
  const changedRows = findChangedRows(oldData, newData);
  changedRows.forEach(rowIndex => {
    updateRowSKU(newData, rowIndex, specifications, settings, headers);
  });
}

/**
 * Process all data rows in a sheet and regenerate their SKUs
 * Uses column definitions for proper column type handling
 */
export function processAutoSKUForAllRowsFromColumns(
  data: CellData[][],
  columns: ColumnDef[],
  specifications: Specification[],
  settings: AppSettings
): void {
  // All rows are data rows now - start from 0
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    updateRowSKUFromColumns(data, rowIndex, columns, specifications, settings);
  }
}

/**
 * Process all data rows in a sheet and regenerate their SKUs
 * @deprecated Use processAutoSKUForAllRowsFromColumns with columns for proper column type handling
 * Used after import to ensure all SKUs are generated correctly
 */
export function processAutoSKUForAllRows(
  data: CellData[][],
  specifications: Specification[],
  settings: AppSettings,
  headers?: string[]
): void {
  // All rows are data rows now - start from 0
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    updateRowSKU(data, rowIndex, specifications, settings, headers);
  }
}
