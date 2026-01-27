import type { Specification, SelectedValues, AppSettings } from '../types';

/**
 * Generate a SKU code from selected specification values.
 *
 * @param selectedValues - Map of specification ID to selected label
 * @param specifications - Array of specifications with their values
 * @param settings - App settings for delimiter, prefix, suffix
 * @returns Generated SKU string, or empty string if no values selected
 */
export function generateSKU(
  selectedValues: SelectedValues,
  specifications: Specification[],
  settings: AppSettings
): string {
  const { delimiter, prefix, suffix } = settings;

  // Sort specifications by columnIndex to ensure consistent SKU order
  const sortedSpecs = [...specifications].sort(
    (a, b) => a.columnIndex - b.columnIndex
  );

  const skuCodes: string[] = [];

  for (const spec of sortedSpecs) {
    const selectedLabel = selectedValues.get(spec.id);
    if (selectedLabel === undefined) {
      continue;
    }

    // Find the value with matching label
    const specValue = spec.values.find((v) => v.label === selectedLabel);
    if (specValue) {
      skuCodes.push(specValue.skuCode);
    }
  }

  if (skuCodes.length === 0) {
    return '';
  }

  const joined = skuCodes.join(delimiter);
  return `${prefix}${joined}${suffix}`;
}
