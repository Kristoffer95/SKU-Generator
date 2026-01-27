import type { CellData, ParsedSpec, ParsedSpecValue } from '../types';

/**
 * Extract string value from a CellData object
 */
const getCellValue = (cell: CellData | undefined): string => {
  if (!cell) return '';
  return String(cell.v ?? cell.m ?? '').trim();
};

/**
 * Parse Config sheet data into structured specifications
 * Config sheet format: Row 0 = headers, Row 1+ = data rows
 * Columns: Specification | Value | SKU Code
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
 */
export function getSpecNames(specs: ParsedSpec[]): string[] {
  return specs.map((s) => s.name);
}
