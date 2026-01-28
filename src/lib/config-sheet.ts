import type { CellData, ParsedSpec, ParsedSpecValue } from '../types';

/**
 * @deprecated This module is deprecated and will be removed after migration-1 is complete.
 * The Config sheet approach has been replaced by useSpecificationsStore.
 * These functions are kept only for migrating existing users' Config sheet data.
 *
 * DO NOT add new code that depends on this module.
 * @see src/store/specifications.ts for the current implementation
 */

/**
 * Extract string value from a CellData object
 * @deprecated Part of deprecated config-sheet module
 */
const getCellValue = (cell: CellData | undefined): string => {
  if (!cell) return '';
  return String(cell.v ?? cell.m ?? '').trim();
};

/**
 * Parse Config sheet data into structured specifications
 * Config sheet format: Row 0 = headers, Row 1+ = data rows
 * Columns: Specification | Value | SKU Code
 *
 * @deprecated Used only for migration from Config sheet to specifications store.
 * @see migration-1 task in prd.json
 */
export function parseConfigSheet(data: CellData[][]): ParsedSpec[] {
  if (data.length <= 1) {
    // Only headers or empty
    return [];
  }

  const specMap = new Map<string, ParsedSpecValue[]>();

  // Skip header row (index 0), process data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const specName = getCellValue(row[0]);
    const value = getCellValue(row[1]);
    const skuCode = getCellValue(row[2]);

    // Skip rows with empty specification or value
    if (!specName || !value) continue;

    if (!specMap.has(specName)) {
      specMap.set(specName, []);
    }

    specMap.get(specName)!.push({
      label: value,
      skuCode: skuCode,
    });
  }

  // Convert map to array of ParsedSpec
  const specs: ParsedSpec[] = [];
  for (const [name, values] of specMap) {
    specs.push({ name, values });
  }

  return specs;
}

/**
 * Get all values for a specific specification name from parsed specs
 * @deprecated Used only for migration from Config sheet to specifications store.
 */
export function getSpecValues(
  specs: ParsedSpec[],
  specName: string
): ParsedSpecValue[] {
  const spec = specs.find((s) => s.name === specName);
  return spec?.values ?? [];
}

/**
 * Look up SKU code for a given specification name and value label
 * Returns empty string if not found
 * @deprecated Used only for migration from Config sheet to specifications store.
 */
export function lookupSkuCode(
  specs: ParsedSpec[],
  specName: string,
  valueLabel: string
): string {
  const values = getSpecValues(specs, specName);
  const match = values.find((v) => v.label === valueLabel);
  return match?.skuCode ?? '';
}

/**
 * Get all unique specification names from parsed specs
 * @deprecated Used only for migration from Config sheet to specifications store.
 */
export function getSpecNames(specs: ParsedSpec[]): string[] {
  return specs.map((s) => s.name);
}
