import type { CellData, Specification, AppSettings, ColumnDef } from '../types';

/**
 * Extract string value from a CellData object
 */
const getCellValue = (cell: CellData | undefined): string => {
  if (!cell) return '';
  return String(cell.v ?? cell.m ?? '').trim();
};

/**
 * Build a map of specId -> cell value from row data using column definitions
 * Only includes values from 'spec' type columns
 */
function buildSpecValueMap(
  row: CellData[],
  columns: ColumnDef[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    // Only include spec columns with a valid specId
    if (col.type !== 'spec' || !col.specId) continue;
    const value = getCellValue(row[i]);
    if (value) {
      map.set(col.specId, value);
    }
  }
  return map;
}

/**
 * Build a map of header name -> cell value from row data
 * @deprecated Use buildSpecValueMap with columns for proper column type handling
 */
function buildHeaderValueMap(
  rowValues: CellData[],
  columnHeaders: string[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < columnHeaders.length; i++) {
    const header = columnHeaders[i];
    if (!header) continue;
    const value = getCellValue(rowValues[i]);
    if (value) {
      map.set(header, value);
    }
  }
  return map;
}

/**
 * Generate SKU for a data sheet row using column definitions
 * Only spec columns contribute to the SKU generation
 *
 * Specifications are sorted by their order field before building the SKU,
 * so column order in the data sheet does NOT affect SKU composition.
 *
 * @param row - The full row data (including SKU column)
 * @param columns - Column definitions for this sheet
 * @param specifications - Array of specifications from store
 * @param settings - App settings for delimiter, prefix, suffix
 * @returns Generated SKU string
 */
export function generateRowSKUFromColumns(
  row: CellData[],
  columns: ColumnDef[],
  specifications: Specification[],
  settings: AppSettings
): string {
  // Build a map of specId -> cell value from spec columns only
  const specValueMap = buildSpecValueMap(row, columns);

  // Sort specifications by order field
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);

  const skuFragments: string[] = [];

  // Process specs in order, look up cell value by spec id
  for (const spec of sortedSpecs) {
    const cellValue = specValueMap.get(spec.id);
    if (!cellValue) continue;

    // Find the value with matching displayValue
    const specValue = spec.values.find((v) => v.displayValue === cellValue);
    if (specValue && specValue.skuFragment) {
      skuFragments.push(specValue.skuFragment);
    }
  }

  if (skuFragments.length === 0) {
    return '';
  }

  const joined = skuFragments.join(settings.delimiter);
  return `${settings.prefix}${joined}${settings.suffix}`;
}

/**
 * Generate SKU for a data sheet row based on specifications from store
 * @deprecated Use generateRowSKUFromColumns with columns for proper column type handling
 *
 * Specifications are sorted by their order field before building the SKU,
 * so column order in the data sheet does NOT affect SKU composition.
 *
 * @param rowValues - The cell values in the row (excluding SKU column)
 * @param columnHeaders - The header names for each column (spec names)
 * @param specifications - Array of specifications from store
 * @param settings - App settings for delimiter, prefix, suffix
 * @returns Generated SKU string
 */
export function generateRowSKU(
  rowValues: CellData[],
  columnHeaders: string[],
  specifications: Specification[],
  settings: AppSettings
): string {
  // Build a map of header -> cell value for quick lookup
  const headerValueMap = buildHeaderValueMap(rowValues, columnHeaders);

  // Sort specifications by order field
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);

  const skuFragments: string[] = [];

  // Process specs in order, look up cell value by spec name
  for (const spec of sortedSpecs) {
    const cellValue = headerValueMap.get(spec.name);
    if (!cellValue) continue;

    // Find the value with matching displayValue
    const specValue = spec.values.find((v) => v.displayValue === cellValue);
    if (specValue && specValue.skuFragment) {
      skuFragments.push(specValue.skuFragment);
    }
  }

  if (skuFragments.length === 0) {
    return '';
  }

  const joined = skuFragments.join(settings.delimiter);
  return `${settings.prefix}${joined}${settings.suffix}`;
}

/**
 * Extract column headers from a data sheet's first row
 * Excludes the first column (assumed to be SKU column at index 0)
 */
export function extractColumnHeaders(headerRow: CellData[]): string[] {
  if (!headerRow || headerRow.length === 0) {
    return [];
  }

  // Exclude first column (SKU column at index 0)
  const headers: string[] = [];
  for (let i = 1; i < headerRow.length; i++) {
    headers.push(getCellValue(headerRow[i]));
  }

  return headers;
}

/**
 * Get row values excluding the SKU column (first column at index 0)
 */
export function getRowValuesWithoutSKU(row: CellData[]): CellData[] {
  if (!row || row.length <= 1) {
    return [];
  }
  return row.slice(1);
}
