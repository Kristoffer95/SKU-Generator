import type { CellData, Specification } from '../types';
import { extractColumnHeaders } from './sheet-sku';

/**
 * Represents a validation error for a cell in a data sheet
 */
export interface ValidationError {
  row: number;
  column: number;
  message: string;
  type: 'missing-value';
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
