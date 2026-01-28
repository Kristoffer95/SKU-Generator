import type { CellData, SheetConfig, Specification } from '../types';

/**
 * Creates a proper header row for a data sheet.
 * Format: ['SKU', spec1.name, spec2.name, ...] sorted by spec order
 */
export function createHeaderRow(specifications: Specification[]): CellData[] {
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);
  const headers: CellData[] = [{ v: 'SKU', m: 'SKU' }];
  for (const spec of sortedSpecs) {
    headers.push({ v: spec.name, m: spec.name });
  }
  return headers;
}

/**
 * Checks if a sheet has a valid header row.
 * A valid header has 'SKU' (case-insensitive) in column 0.
 */
export function hasValidHeader(sheet: SheetConfig): boolean {
  if (sheet.type !== 'data') return true; // Only check data sheets

  if (!sheet.data || sheet.data.length === 0) return false;

  const firstRow = sheet.data[0];
  if (!firstRow || firstRow.length === 0) return false;

  const firstCell = firstRow[0];
  const value = String(firstCell?.v ?? firstCell?.m ?? '').trim().toLowerCase();

  return value === 'sku';
}

/**
 * Checks if header row matches the expected spec names.
 * Returns true if header has all spec names in correct positions.
 */
export function headerMatchesSpecs(
  sheet: SheetConfig,
  specifications: Specification[]
): boolean {
  if (sheet.type !== 'data') return true;
  if (!hasValidHeader(sheet)) return false;

  const headerRow = sheet.data[0];
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);

  // Check each spec has a matching column
  for (let i = 0; i < sortedSpecs.length; i++) {
    const expectedName = sortedSpecs[i].name;
    const headerIndex = i + 1; // +1 because column 0 is SKU

    if (headerIndex >= headerRow.length) return false;

    const headerValue = String(headerRow[headerIndex]?.v ?? headerRow[headerIndex]?.m ?? '');
    if (headerValue !== expectedName) return false;
  }

  return true;
}

/**
 * Repairs a sheet by inserting a proper header row.
 * Existing data is shifted down by one row.
 * Returns a new sheet object (does not mutate the original).
 */
export function repairSheetHeaders(
  sheet: SheetConfig,
  specifications: Specification[]
): SheetConfig {
  if (sheet.type !== 'data') return sheet;
  if (hasValidHeader(sheet)) return sheet; // Already has valid header

  const headerRow = createHeaderRow(specifications);
  const newData = [headerRow, ...sheet.data];

  return {
    ...sheet,
    data: newData,
  };
}

/**
 * Repairs all sheets that have missing or malformed headers.
 * Returns a new array with repaired sheets (does not mutate originals).
 */
export function repairAllSheetHeaders(
  sheets: SheetConfig[],
  specifications: Specification[]
): SheetConfig[] {
  return sheets.map((sheet) => repairSheetHeaders(sheet, specifications));
}

/**
 * Checks if any data sheets need header repair.
 */
export function needsHeaderRepair(
  sheets: SheetConfig[]
): boolean {
  return sheets.some((sheet) => sheet.type === 'data' && !hasValidHeader(sheet));
}
