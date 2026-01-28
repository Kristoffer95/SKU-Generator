import type { CellData, Specification } from '../types';
import { extractColumnHeaders } from './sheet-sku';

/**
 * Represents a validation error for a cell in a data sheet
 */
export interface ValidationError {
  row: number;
  column: number;
  message: string;
  type: 'missing-value' | 'duplicate-sku';
}

/**
 * Extract string value from a CellData object
 */
function getCellValue(cell: CellData | undefined): string {
  if (!cell) return '';
  return String(cell.v ?? cell.m ?? '').trim();
}

/**
 * Validate a data sheet for cells containing values that no longer exist
 * in their corresponding specification.
 *
 * @param data - The sheet data (2D array of cells)
 * @param specifications - Array of specifications from store
 * @returns Array of validation errors for cells with missing values
 */
export function validateDataSheet(
  data: CellData[][],
  specifications: Specification[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data || data.length <= 1) {
    return errors; // No data rows to validate
  }

  // Get headers from first row (excluding SKU column at index 0)
  const headers = extractColumnHeaders(data[0]);

  // Build a map of spec name -> Set of valid displayValues
  const specValueMap = new Map<string, Set<string>>();
  for (const spec of specifications) {
    const validValues = new Set(spec.values.map((v) => v.displayValue));
    specValueMap.set(spec.name, validValues);
  }

  // Validate each data row (starting from row 1, skip header)
  for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row) continue;

    // Check each column (starting from column 1, skip SKU column at 0)
    for (let colIndex = 1; colIndex < row.length; colIndex++) {
      const headerIndex = colIndex - 1; // headers array is offset by 1 (no SKU column)
      const headerName = headers[headerIndex];

      if (!headerName) continue;

      const cellValue = getCellValue(row[colIndex]);
      if (!cellValue) continue; // Empty cells are valid

      // Check if this column corresponds to a specification
      const validValues = specValueMap.get(headerName);
      if (!validValues) continue; // Column doesn't match any spec, skip

      // Check if the cell value is in the valid values set
      if (!validValues.has(cellValue)) {
        errors.push({
          row: rowIndex,
          column: colIndex,
          message: `Value "${cellValue}" does not exist in specification "${headerName}"`,
          type: 'missing-value',
        });
      }
    }
  }

  return errors;
}

/**
 * Find duplicate SKU values across rows in a data sheet.
 * Returns validation errors for all rows that have non-unique SKU values.
 *
 * @param data - The sheet data (2D array of cells)
 * @returns Array of validation errors for rows with duplicate SKUs
 */
export function findDuplicateSKUs(data: CellData[][]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data || data.length <= 1) {
    return errors; // No data rows to check
  }

  // Build a map of SKU value -> list of row indices that have that SKU
  const skuToRows = new Map<string, number[]>();

  // Start from row 1 (skip header row)
  for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row) continue;

    // SKU is in column 0
    const skuValue = getCellValue(row[0]);

    // Skip empty SKU values
    if (!skuValue) continue;

    const existingRows = skuToRows.get(skuValue);
    if (existingRows) {
      existingRows.push(rowIndex);
    } else {
      skuToRows.set(skuValue, [rowIndex]);
    }
  }

  // Find all SKUs that appear in multiple rows
  for (const [sku, rows] of skuToRows) {
    if (rows.length > 1) {
      // Create an error for each row with this duplicate SKU
      const rowList = rows.join(', ');
      for (const rowIndex of rows) {
        errors.push({
          row: rowIndex,
          column: 0, // SKU column
          message: `Duplicate SKU "${sku}" found in rows ${rowList}`,
          type: 'duplicate-sku',
        });
      }
    }
  }

  return errors;
}
