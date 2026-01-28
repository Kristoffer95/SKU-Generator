import type { Specification, SelectedValues, AppSettings } from '../types';

/**
 * Generate a SKU code from selected specification values.
 *
 * @param selectedValues - Map of specification ID to selected displayValue
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

  // Sort specifications by order field to ensure consistent SKU composition
  const sortedSpecs = [...specifications].sort((a, b) => a.order - b.order);

  const skuFragments: string[] = [];

  for (const spec of sortedSpecs) {
    const selectedDisplayValue = selectedValues.get(spec.id);
    if (selectedDisplayValue === undefined) {
      continue;
    }

    // Find the value with matching displayValue
    const specValue = spec.values.find((v) => v.displayValue === selectedDisplayValue);
    if (specValue) {
      skuFragments.push(specValue.skuFragment);
    }
  }

  if (skuFragments.length === 0) {
    return '';
  }

  const joined = skuFragments.join(delimiter);
  return `${prefix}${joined}${suffix}`;
}
