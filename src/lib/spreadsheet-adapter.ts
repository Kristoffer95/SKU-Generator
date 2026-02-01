import type { CellData, Specification, ColumnDef } from '../types';
import type { SKUCell, SKUMatrix } from '../types/spreadsheet';

/**
 * Get dropdown options (displayValues) for a specification
 */
function getDropdownOptionsForSpec(spec: Specification): string[] {
  return spec.values.map((v) => v.displayValue);
}

/**
 * Get dropdown colors (displayValue -> color) for a specification
 * Returns a map of display values to their assigned colors
 */
function getDropdownColorsForSpec(spec: Specification): Record<string, string> | undefined {
  const colors: Record<string, string> = {};
  let hasColors = false;

  for (const value of spec.values) {
    if (value.color) {
      colors[value.displayValue] = value.color;
      hasColors = true;
    }
  }

  return hasColors ? colors : undefined;
}

/**
 * Convert CellData[][] (Fortune-Sheet format) to SKUMatrix (react-spreadsheet format)
 *
 * @param data - The Fortune-Sheet cell data
 * @param columns - Array of column definitions that determine column types
 * @param specifications - Array of specifications for dropdown options
 * @returns SKUMatrix for react-spreadsheet
 *
 * Column structure based on ColumnDef types:
 * - 'sku' columns: read-only except header row
 * - 'spec' columns: dropdown options from linked specification
 * - 'free' columns: plain text input (no dropdown)
 */
export function convertToSpreadsheetData(
  data: CellData[][],
  columns: ColumnDef[],
  specifications: Specification[]
): SKUMatrix {
  if (data.length === 0) {
    return [];
  }

  // Build a map of specId -> Specification for quick lookup
  const specMap = new Map<string, Specification>();
  for (const spec of specifications) {
    specMap.set(spec.id, spec);
  }

  const result: SKUMatrix = [];

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex] || [];
    // All rows are data rows now - no header row in data array
    const resultRow: (SKUCell | null)[] = [];

    // Determine number of columns from columns array, but include existing data
    const numCols = Math.max(columns.length, row.length);

    for (let colIndex = 0; colIndex < numCols; colIndex++) {
      const cell = row[colIndex];
      const columnDef = columns[colIndex];
      const columnType = columnDef?.type ?? 'free'; // Default to 'free' for extra columns
      const isSKUColumn = columnType === 'sku';
      const isSpecColumn = columnType === 'spec';

      // Get the linked specification for spec columns
      const linkedSpec = isSpecColumn && columnDef?.specId
        ? specMap.get(columnDef.specId)
        : undefined;

      // Handle empty/undefined cells
      if (!cell || (cell.v === undefined && cell.m === undefined)) {
        if (isSKUColumn) {
          // Empty SKU cell should still be read-only
          resultRow.push({
            value: null,
            readOnly: true,
          });
        } else if (isSpecColumn && linkedSpec) {
          // Empty spec column cell should have dropdown options
          const emptySpecCell: SKUCell = {
            value: null,
            dropdownOptions: getDropdownOptionsForSpec(linkedSpec),
          };
          const colors = getDropdownColorsForSpec(linkedSpec);
          if (colors) {
            emptySpecCell.dropdownColors = colors;
          }
          resultRow.push(emptySpecCell);
        } else {
          // Free columns: just null
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

      // SKU column: always read-only (all rows are data rows)
      if (isSKUColumn) {
        skuCell.readOnly = true;
      }

      // Spec columns: add dropdown options and colors (all rows are data rows)
      if (isSpecColumn && linkedSpec) {
        skuCell.dropdownOptions = getDropdownOptionsForSpec(linkedSpec);
        const colors = getDropdownColorsForSpec(linkedSpec);
        if (colors) {
          skuCell.dropdownColors = colors;
          // Apply the selected value's color as the cell's background
          // This ensures cells show their value's color when not in edit mode
          if (value !== null && value !== undefined) {
            const valueColor = colors[String(value)];
            if (valueColor) {
              skuCell.valueColor = valueColor;
            }
          }
        }
      }

      // Free columns: no special treatment (plain text input)

      // Preserve checkbox flag
      if (cell.checkbox) {
        skuCell.checkbox = true;
        // For checkbox cells, ensure value is boolean
        // The value could be boolean, string 'true'/'false', or null
        const currentValue = skuCell.value;
        if (typeof currentValue !== 'boolean') {
          skuCell.value = currentValue === 'true' || currentValue === 'TRUE';
        }
      }

      // Preserve styling as classNames
      const classNames: string[] = [];
      if (cell.bg) {
        classNames.push(`bg-[${cell.bg}]`);
      }
      if (cell.fc) {
        classNames.push(`text-[${cell.fc}]`);
      }
      if (cell.bold) {
        classNames.push('cell-bold');
      }
      if (cell.italic) {
        classNames.push('cell-italic');
      }
      if (cell.align) {
        classNames.push(`cell-align-${cell.align}`);
      }
      if (classNames.length > 0) {
        skuCell.className = classNames.join(' ');
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

      // Preserve checkbox flag
      if (cell.checkbox) {
        cellData.checkbox = true;
      }

      // Convert value
      if (cell.value !== null && cell.value !== undefined) {
        cellData.v = cell.value;
        // For checkbox cells, don't set display text (m) since we render a checkbox
        if (!cell.checkbox) {
          cellData.m = String(cell.value);
        }
      }

      // Convert className back to styling properties
      if (cell.className) {
        const bgMatch = cell.className.match(/bg-\[([#\w]+)\]/);
        if (bgMatch) {
          cellData.bg = bgMatch[1];
        }
        const fcMatch = cell.className.match(/text-\[([#\w]+)\]/);
        if (fcMatch) {
          cellData.fc = fcMatch[1];
        }
        if (cell.className.includes('cell-bold')) {
          cellData.bold = true;
        }
        if (cell.className.includes('cell-italic')) {
          cellData.italic = true;
        }
        const alignMatch = cell.className.match(/cell-align-(left|center|right)/);
        if (alignMatch) {
          cellData.align = alignMatch[1] as 'left' | 'center' | 'right';
        }
      }

      resultRow.push(cellData);
    }

    result.push(resultRow);
  }

  return result;
}
