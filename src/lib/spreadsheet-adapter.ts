import type { CellData, Specification } from '../types';
import type { SKUCell, SKUMatrix } from '../types/spreadsheet';

/**
 * Get dropdown options (displayValues) for a specification column
 */
function getDropdownOptionsForSpec(spec: Specification): string[] {
  return spec.values.map((v) => v.displayValue);
}

/**
 * Convert CellData[][] (Fortune-Sheet format) to SKUMatrix (react-spreadsheet format)
 *
 * @param data - The Fortune-Sheet cell data
 * @param specifications - Array of specifications sorted by order
 * @returns SKUMatrix for react-spreadsheet
 *
 * Column structure:
 * - Column 0: SKU column (read-only except header row)
 * - Columns 1+: Spec columns with dropdown options
 */
export function convertToSpreadsheetData(
  data: CellData[][],
  specifications: Specification[]
): SKUMatrix {
  if (data.length === 0) {
    return [];
  }

  // Sort specifications by order for column mapping
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);

  const result: SKUMatrix = [];

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] || [];
    const isHeaderRow = rowIndex === 0;
    const resultRow: (SKUCell | null)[] = [];

    // Determine number of columns: SKU + number of specs (minimum)
    // But also include any existing data columns
    const numCols = Math.max(sortedSpecs.length + 1, row.length);

    for (let colIndex = 0; colIndex < numCols; colIndex++) {
      const cell = row[colIndex];
      const isSKUColumn = colIndex === 0;
      const specIndex = colIndex - 1; // -1 because col 0 is SKU
      const spec = sortedSpecs[specIndex];

      // Handle empty/undefined cells
      if (!cell || (cell.v === undefined && cell.m === undefined)) {
        if (isSKUColumn && !isHeaderRow) {
          // Empty SKU cell (non-header) should still be read-only
          resultRow.push({
            value: null,
            readOnly: true,
          });
        } else if (!isSKUColumn && spec && !isHeaderRow) {
          // Empty spec column cell (non-header) should have dropdown options
          resultRow.push({
            value: null,
            dropdownOptions: getDropdownOptionsForSpec(spec),
          });
        } else {
          resultRow.push(null);
        }
        continue;
      }

      // Convert cell value (prefer v, fall back to m)
      const value = cell.v !== undefined ? cell.v : (cell.m ?? null);

      // Build SKUCell
      const skuCell: SKUCell = {
        value: value === undefined ? null : value,
      };

      // SKU column (col 0): read-only for all rows except header
      if (isSKUColumn && !isHeaderRow) {
        skuCell.readOnly = true;
      }

      // Spec columns (col 1+): add dropdown options for non-header rows
      if (!isSKUColumn && spec && !isHeaderRow) {
        skuCell.dropdownOptions = getDropdownOptionsForSpec(spec);
      }

      // Preserve background color as className if set
      if (cell.bg) {
        skuCell.className = `bg-[${cell.bg}]`;
      }

      resultRow.push(skuCell);
    }

    result.push(resultRow);
  }

  return result;
}

/**
 * Convert SKUMatrix (react-spreadsheet format) back to CellData[][] (Fortune-Sheet format)
 *
 * @param matrix - The react-spreadsheet SKUMatrix
 * @returns CellData[][] for storage/Fortune-Sheet compatibility
 */
export function convertFromSpreadsheetData(matrix: SKUMatrix): CellData[][] {
  if (matrix.length === 0) {
    return [];
  }

  const result: CellData[][] = [];

  for (const row of matrix) {
    const resultRow: CellData[] = [];

    for (const cell of row) {
      if (!cell) {
        // Push empty cell
        resultRow.push({});
        continue;
      }

      const cellData: CellData = {};

      // Convert value
      if (cell.value !== null && cell.value !== undefined) {
        cellData.v = cell.value;
        cellData.m = String(cell.value);
      }

      // Convert className back to bg if it's a Tailwind bg color
      if (cell.className) {
        const bgMatch = cell.className.match(/bg-\[([#\w]+)\]/);
        if (bgMatch) {
          cellData.bg = bgMatch[1];
        }
      }

      resultRow.push(cellData);
    }

    result.push(resultRow);
  }

  return result;
}
