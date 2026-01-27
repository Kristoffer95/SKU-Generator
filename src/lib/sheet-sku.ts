import type { CellData, ParsedSpec, AppSettings } from '../types';
import { lookupSkuCode } from './config-sheet';

/**
 * Extract string value from a CellData object
 */
const getCellValue = (cell: CellData | undefined): string => {
  if (!cell) return '';
  return String(cell.v ?? cell.m ?? '').trim();
};

/**
 * Generate SKU for a data sheet row based on Config sheet specs
 *
 * @param rowValues - The cell values in the row (excluding SKU column)
 * @param columnHeaders - The header names for each column (spec names)
 * @param parsedConfig - Parsed specifications from Config sheet
 * @param settings - App settings for delimiter, prefix, suffix
 * @returns Generated SKU string
 */
export function generateRowSKU(
  rowValues: CellData[],
  columnHeaders: string[],
  parsedConfig: ParsedSpec[],
  settings: AppSettings
): string {
  const codes: string[] = [];

  // Process each column that has a header (spec name)
  for (let i = 0; i < columnHeaders.length; i++) {
    const header = columnHeaders[i];
    if (!header) continue;

    const cellValue = getCellValue(rowValues[i]);
    if (!cellValue) continue;

    // Look up SKU code from Config for this spec/value pair
    const skuCode = lookupSkuCode(parsedConfig, header, cellValue);
    if (skuCode) {
      codes.push(skuCode);
    }
  }

  if (codes.length === 0) {
    return '';
  }

  const joined = codes.join(settings.delimiter);
  return `${settings.prefix}${joined}${settings.suffix}`;
}

/**
 * Extract column headers from a data sheet's first row
 * Excludes the last column (assumed to be SKU column)
 */
export function extractColumnHeaders(headerRow: CellData[]): string[] {
  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  // Exclude last column (SKU column)
  const headers: string[] = [];
  for (let i = 0; i < headerRow.length - 1; i++) {
    headers.push(getCellValue(headerRow[i]));
  }

  return headers;
}

/**
 * Get row values excluding the SKU column (last column)
 */
export function getRowValuesWithoutSKU(row: CellData[]): CellData[] {
  if (!row || row.length <= 1) {
    return [];
  }
  return row.slice(0, -1);
}
